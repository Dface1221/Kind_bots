from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import httpx
import trafilatura
from urllib.parse import urlparse
from datetime import datetime, timezone
import uuid
import json
import os
try:
    from google import genai
except ImportError:
    genai = None

from dotenv import load_dotenv
load_dotenv()

from .security import is_safe_url
from .db import get_db

app = FastAPI(title="Tabs to Trails API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"^moz-extension://.*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImportRequest(BaseModel):
    urls: List[str]

class ArticleResponse(BaseModel):
    id: str
    url: str
    title: str
    domain: str
    topic: str
    excerpt: str
    dateAdded: str
    selected: bool = False
    status: str
    error: Optional[str] = None
    extracted_text: Optional[str] = None
    summary: Optional[str] = None
    takeaways: Optional[str] = None

class ChapterModel(BaseModel):
    id: str
    title: str
    startTime: int
    duration: int
    sourceArticleId: str

class TrailCreateRequest(BaseModel):
    title: str
    narrationStyle: str
    targetDurationMinutes: int
    articleIds: List[str]

class TrailResponse(BaseModel):
    id: str
    title: str
    status: str
    duration: int
    narrationStyle: str
    targetDurationMinutes: int
    chapters: List[ChapterModel]
    audioUrl: Optional[str] = None

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Tabs to Trails backend is running."}

@app.post("/api/import", response_model=List[ArticleResponse])
async def import_urls(request: ImportRequest):
    results = []
    
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        for url in request.urls:
            with get_db() as db:
                row = db.execute("SELECT * FROM articles WHERE url = ?", (url,)).fetchone()
                if row:
                    results.append(ArticleResponse(**dict(row)))
                    continue
                
            if not is_safe_url(url):
                res = ArticleResponse(
                    id=str(uuid.uuid4()), url=url, title="Invalid URL", domain="", topic="Unknown",
                    excerpt="", dateAdded=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), status="error", error="Unsafe or unsupported URL"
                )
                results.append(res)
                continue
                
            try:
                response = await client.get(url)
                response.raise_for_status()
                
                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type:
                    raise Exception("Unsupported content type. Only HTML is supported.")
                
                downloaded = response.text
                text = trafilatura.extract(downloaded)
                if not text:
                    raise Exception("Could not extract article content (possibly empty, blocked, or a paywall).")
                    
                metadata = trafilatura.extract_metadata(downloaded)
                title = metadata.title if metadata and metadata.title else "Untitled Article"
                domain = urlparse(url).netloc
                excerpt = text[:150] + "..." if len(text) > 150 else text
                
                res = ArticleResponse(
                    id=str(uuid.uuid4()), url=url, title=title, domain=domain, topic="Imported",
                    excerpt=excerpt, dateAdded=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), status="success",
                    extracted_text=text
                )
                
                with get_db() as db:
                    db.execute('''
                        INSERT INTO articles (id, url, title, domain, topic, excerpt, dateAdded, status, error, extracted_text)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (res.id, res.url, res.title, res.domain, res.topic, res.excerpt, res.dateAdded, res.status, res.error, res.extracted_text))
                    db.commit()
                
                results.append(res)
                
            except httpx.TimeoutException:
                res = ArticleResponse(
                    id=str(uuid.uuid4()), url=url, title="Timeout", domain="", topic="Unknown",
                    excerpt="", dateAdded=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), status="error", error="Request timed out"
                )
                results.append(res)
            except Exception as e:
                res = ArticleResponse(
                    id=str(uuid.uuid4()), url=url, title="Error", domain="", topic="Unknown",
                    excerpt="", dateAdded=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), status="error", error=str(e)
                )
                results.append(res)
                
    return results

@app.get("/api/articles", response_model=List[ArticleResponse])
def get_articles():
    with get_db() as db:
        rows = db.execute("SELECT * FROM articles WHERE status = 'success'").fetchall()
        return [ArticleResponse(**dict(r)) for r in rows]

@app.post("/api/trails", response_model=TrailResponse)
def create_trail(req: TrailCreateRequest):
    with get_db() as db:
        # Fetch articles
        placeholders = ','.join(['?']*len(req.articleIds))
        rows = db.execute(f"SELECT * FROM articles WHERE id IN ({placeholders})", req.articleIds).fetchall()
        
        article_map = {r['id']: r for r in rows}
        
        chapters = []
        current_time = 0
        for i, aid in enumerate(req.articleIds):
            art = article_map.get(aid)
            if not art:
                continue
            
            # Estimate reading time: ~200 wpm.
            text_len = len(art['extracted_text'].split()) if art['extracted_text'] else 100
            duration_sec = int((text_len / 200) * 60)
            if duration_sec < 60: duration_sec = 60
            
            chapters.append({
                "id": f"ch_{uuid.uuid4()}",
                "title": art['title'],
                "startTime": current_time,
                "duration": duration_sec,
                "sourceArticleId": art['id']
            })
            current_time += duration_sec
            
        trail_id = f"tr_{uuid.uuid4()}"
        trail = TrailResponse(
            id=trail_id,
            title=req.title,
            status="ready",  # We skip 'generating' since it's just reading mode
            duration=current_time,
            narrationStyle=req.narrationStyle,
            targetDurationMinutes=req.targetDurationMinutes,
            chapters=chapters
        )
        
        db.execute('''
            INSERT INTO trails (id, title, status, duration, narrationStyle, targetDurationMinutes, chapters)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (trail.id, trail.title, trail.status, trail.duration, trail.narrationStyle, trail.targetDurationMinutes, json.dumps(chapters)))
        db.commit()
        
        return trail

@app.get("/api/trails", response_model=List[TrailResponse])
def get_trails():
    with get_db() as db:
        rows = db.execute("SELECT * FROM trails").fetchall()
        trails = []
        for r in rows:
            d = dict(r)
            d['chapters'] = json.loads(d['chapters'])
            trails.append(TrailResponse(**d))
        return trails

@app.get("/api/trails/{trail_id}", response_model=TrailResponse)
def get_trail(trail_id: str):
    with get_db() as db:
        row = db.execute("SELECT * FROM trails WHERE id = ?", (trail_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Trail not found")
        d = dict(row)
        d['chapters'] = json.loads(d['chapters'])
        return TrailResponse(**d)

@app.get("/api/articles/{article_id}", response_model=ArticleResponse)
def get_article(article_id: str):
    with get_db() as db:
        row = db.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Article not found")
        return ArticleResponse(**dict(row))

@app.post("/api/articles/{article_id}/summary", response_model=ArticleResponse)
def summarize_article(article_id: str, force: bool = False):
    with get_db() as db:
        row = db.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Article not found")
        
        article = dict(row)
        
        # If summary exists and not forcing, return as is
        if article.get("summary") and not force:
            return ArticleResponse(**article)
            
        extracted_text = article.get("extracted_text")
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Article has no extracted text to summarize")
            
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
            
        if not genai:
            raise HTTPException(status_code=500, detail="google-genai SDK is not installed")
            
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"Summarize the following article text accurately and concisely. Do not invent facts.\n\nText:\n{extracted_text}"
            
            response = client.models.generate_content(
                model='gemma-4-26b-a4b-it',
                contents=prompt,
            )
            
            summary = response.text
            
            # Save to db
            db.execute("UPDATE articles SET summary = ? WHERE id = ?", (summary, article_id))
            db.commit()
            
            # Update article dict
            article["summary"] = summary
            
            return ArticleResponse(**article)
            
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to generate summary: {str(e)}")

@app.post("/api/articles/{article_id}/takeaways", response_model=ArticleResponse)
def generate_takeaways(article_id: str, force: bool = False):
    with get_db() as db:
        row = db.execute("SELECT * FROM articles WHERE id = ?", (article_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Article not found")
        
        article = dict(row)
        
        if article.get("takeaways") and not force:
            return ArticleResponse(**article)
            
        extracted_text = article.get("extracted_text")
        if not extracted_text or not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Article has no extracted text for takeaways")
            
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
            
        if not genai:
            raise HTTPException(status_code=500, detail="google-genai SDK is not installed")
            
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"Generate 3-5 concise key takeaways from the following article text. Do not invent facts. Format as bullet points.\n\nText:\n{extracted_text}"
            
            response = client.models.generate_content(
                model='gemma-4-26b-a4b-it',
                contents=prompt,
            )
            
            takeaways = response.text
            
            # Save to db
            db.execute("UPDATE articles SET takeaways = ? WHERE id = ?", (takeaways, article_id))
            db.commit()
            
            # Update article dict
            article["takeaways"] = takeaways
            
            return ArticleResponse(**article)
            
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to generate takeaways: {str(e)}")

class SuggestOrderRequest(BaseModel):
    articleIds: List[str]

class SuggestOrderResponse(BaseModel):
    suggestedOrder: List[str]
    rationale: str

@app.post("/api/trails/suggest-order", response_model=SuggestOrderResponse)
def suggest_trail_order(req: SuggestOrderRequest):
    if not req.articleIds:
        raise HTTPException(status_code=400, detail="No article IDs provided")

    with get_db() as db:
        placeholders = ','.join(['?']*len(req.articleIds))
        rows = db.execute(f"SELECT * FROM articles WHERE id IN ({placeholders})", req.articleIds).fetchall()
        
    article_map = {r['id']: r for r in rows}
    
    missing_ids = [aid for aid in req.articleIds if aid not in article_map]
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Articles not found: {missing_ids}")
        
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
        
    if not genai:
        raise HTTPException(status_code=500, detail="google-genai SDK is not installed")
        
    articles_info = ""
    for aid in req.articleIds:
        art = dict(article_map[aid])
        content_for_prompt = ""
        if art.get("summary"):
            content_for_prompt += f"Summary:\n{art['summary']}\n"
        if art.get("takeaways"):
            content_for_prompt += f"Takeaways:\n{art['takeaways']}\n"
        if not content_for_prompt:
            extracted = art.get("extracted_text") or art.get("excerpt") or ""
            content_for_prompt += f"Content Snippet:\n{extracted[:1000]}...\n"
            
        articles_info += f"--- Article ID: {aid} ---\nTitle: {art['title']}\nTopic: {art['topic']}\n{content_for_prompt}\n"
        
    prompt = f"""You are an expert editor creating a learning trail. 
Given the following articles, suggest a logical reading sequence based on topic relationships and learning progression (e.g., foundational concepts first, advanced topics later).

Articles:
{articles_info}

Respond strictly in JSON format matching this schema:
{{
  "suggestedOrder": ["id1", "id2"],
  "rationale": "A brief explanation of why this sequence makes sense."
}}

Do not include markdown blocks or any other text outside the JSON.
"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model='gemma-4-26b-a4b-it',
            contents=prompt,
        )
        
        try:
            text = response.text.strip()
            if text.startswith('```json'):
                text = text[7:]
            if text.startswith('```'):
                text = text[3:]
            if text.endswith('```'):
                text = text[:-3]
            text = text.strip()
            
            result = json.loads(text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail="Failed to parse model output as JSON")
            
        suggested_order = result.get("suggestedOrder", [])
        
        if set(suggested_order) != set(req.articleIds):
            return SuggestOrderResponse(
                suggestedOrder=req.articleIds,
                rationale="The AI suggested an invalid set of articles. Defaulting to original order."
            )
            
        return SuggestOrderResponse(
            suggestedOrder=suggested_order,
            rationale=result.get("rationale", "Suggested based on logical progression.")
        )
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=502, detail=f"Failed to generate suggested order: {str(e)}")

from .tts import generate_episode_audio

@app.post("/api/trails/{trail_id}/audio", response_model=TrailResponse)
async def generate_trail_audio(trail_id: str):
    with get_db() as db:
        row = db.execute("SELECT * FROM trails WHERE id = ?", (trail_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Trail not found")
            
        trail_dict = dict(row)
        chapters = json.loads(trail_dict['chapters'])
        
        # Build text script
        script_parts = []
        script_parts.append(f"Welcome to {trail_dict['title']}.")
        
        for idx, ch in enumerate(chapters):
            art_id = ch["sourceArticleId"]
            art_row = db.execute("SELECT * FROM articles WHERE id = ?", (art_id,)).fetchone()
            if art_row:
                art = dict(art_row)
                script_parts.append(f"Chapter {idx+1}: {art['title']}.")
                if art.get("summary"):
                    script_parts.append(f"Summary: {art['summary']}")
                if art.get("takeaways"):
                    script_parts.append(f"Key takeaways: {art['takeaways']}")
                elif not art.get("summary"):
                    # Fallback to excerpt or text if no summary/takeaways
                    text = art.get("extracted_text") or ""
                    # limit text to ~500 chars to avoid super long generation if no summary
                    script_parts.append(text[:500] + "...")
        
        script_text = " ".join(script_parts)
        
        # Ensure media dir exists
        media_dir = os.path.join(os.path.dirname(__file__), "media")
        os.makedirs(media_dir, exist_ok=True)
        
        audio_filename = f"{trail_id}.mp3"
        audio_path = os.path.join(media_dir, audio_filename)
        
        success = await generate_episode_audio(script_text, audio_path)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to generate audio")
        
        audio_url = f"/api/media/{audio_filename}"
        
        db.execute("UPDATE trails SET status = 'ready', audioUrl = ? WHERE id = ?", (audio_url, trail_id))
        db.commit()
        
        row = db.execute("SELECT * FROM trails WHERE id = ?", (trail_id,)).fetchone()
        d = dict(row)
        d['chapters'] = json.loads(d['chapters'])
        return TrailResponse(**d)

from fastapi.responses import FileResponse

@app.get("/api/media/{filename}")
def get_media(filename: str):
    if ".." in filename or filename.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    media_dir = os.path.join(os.path.dirname(__file__), "media")
    audio_path = os.path.join(media_dir, filename)
    
    if not os.path.exists(audio_path):
        # Allow backward compatibility for old hardcoded test fixture
        if filename == "test_trail.wav":
            audio_path = os.path.join(os.path.dirname(__file__), "stub_audio.wav")
            if not os.path.exists(audio_path):
                raise HTTPException(status_code=404, detail="Audio file not found")
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")
            
    # Guess media type based on extension
    media_type = "audio/mpeg" if filename.endswith(".mp3") else "audio/wav"
    return FileResponse(audio_path, media_type=media_type)

