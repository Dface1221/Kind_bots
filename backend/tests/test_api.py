from fastapi.testclient import TestClient
from app.main import app
import pytest

client = TestClient(app)

from app.db import get_db

@pytest.fixture(autouse=True)
def clear_db():
    with get_db() as db:
        db.execute("DELETE FROM articles")
        db.execute("DELETE FROM trails")
        db.commit()

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_import_invalid_scheme():
    response = client.post("/api/import", json={"urls": ["ftp://example.com", "file:///etc/passwd"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["status"] == "error"
    assert "Unsafe or unsupported URL" in data[0]["error"]
    assert data[1]["status"] == "error"
    assert "Unsafe or unsupported URL" in data[1]["error"]

def test_import_private_ip():
    response = client.post("/api/import", json={"urls": ["http://127.0.0.1:8000", "http://localhost"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["status"] == "error"
    assert "Unsafe or unsupported URL" in data[0]["error"]
    assert data[1]["status"] == "error"
    assert "Unsafe or unsupported URL" in data[1]["error"]

def test_import_valid_but_fails():
    # A valid domain that will fail to connect/extract
    response = client.post("/api/import", json={"urls": ["https://this-domain-does-not-exist-12345.com"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "error"

def test_import_valid_article():
    # A known fast page with simple text, e.g., example.com
    response = client.post("/api/import", json={"urls": ["http://example.com"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "success"
    assert data[0]["domain"] == "example.com"
    assert data[0]["extracted_text"] is not None
    assert "Example Domain" in data[0]["title"] or "Example" in data[0]["title"]

def test_duplicate_import():
    client.post("/api/import", json={"urls": ["http://example.com"]})
    response = client.post("/api/import", json={"urls": ["http://example.com"]})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "success"
    # Should only be 1 item in the DB
    with get_db() as db:
        count = db.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
        assert count == 1

def test_get_articles():
    client.post("/api/import", json={"urls": ["http://example.com"]})
    response = client.get("/api/articles")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "success"

def test_create_and_get_trail():
    # First import an article
    client.post("/api/import", json={"urls": ["http://example.com"]})
    articles_response = client.get("/api/articles")
    article_id = articles_response.json()[0]["id"]
    
    # Create a trail
    trail_payload = {
        "title": "My Test Trail",
        "narrationStyle": "informative",
        "targetDurationMinutes": 15,
        "articleIds": [article_id]
    }
    response = client.post("/api/trails", json=trail_payload)
    assert response.status_code == 200
    trail = response.json()
    assert trail["title"] == "My Test Trail"
    assert len(trail["chapters"]) == 1
    assert trail["chapters"][0]["sourceArticleId"] == article_id
    trail_id = trail["id"]
    
    # Get all trails
    list_response = client.get("/api/trails")
    assert list_response.status_code == 200
    trails = list_response.json()
    assert len(trails) == 1
    assert trails[0]["id"] == trail_id
    
    # Get specific trail
    get_response = client.get(f"/api/trails/{trail_id}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == trail_id

def test_cors_preflight_allowed_origin():
    # Test valid frontend origin
    res = client.options(
        "/api/import", 
        headers={"Origin": "http://192.168.1.5:5173", "Access-Control-Request-Method": "POST"}
    )
    assert res.status_code == 200
    assert res.headers["access-control-allow-origin"] == "*"

def test_cors_preflight_extension_origin():
    # Test valid Firefox extension origin
    res = client.options(
        "/api/import", 
        headers={"Origin": "moz-extension://a1b2c3d4-e5f6-7890-abcd-ef1234567890", "Access-Control-Request-Method": "POST"}
    )
    assert res.status_code == 200
    # It might return * or the specific origin due to regex. Let's just check 200.

from unittest.mock import patch, MagicMock

def test_summarize_success():
    client.post("/api/import", json={"urls": ["http://example.com"]})
    articles_response = client.get("/api/articles")
    article_id = articles_response.json()[0]["id"]
    
    with patch("app.main.genai") as mock_genai, patch("app.main.os.environ.get") as mock_env:
        mock_env.return_value = "FAKE_API_KEY"
        
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "This is a summary."
        mock_client.models.generate_content.return_value = mock_response
        mock_genai.Client.return_value = mock_client
        
        response = client.post(f"/api/articles/{article_id}/summary")
        assert response.status_code == 200
        assert response.json()["summary"] == "This is a summary."
        assert mock_client.models.generate_content.call_args.kwargs['model'] == 'gemma-4-26b-a4b-it'
        
        # Test DB persistence and non-forcing
        mock_client.models.generate_content.reset_mock()
        response2 = client.post(f"/api/articles/{article_id}/summary")
        assert response2.status_code == 200
        assert response2.json()["summary"] == "This is a summary."
        mock_client.models.generate_content.assert_not_called()
        
        # Test forcing
        response3 = client.post(f"/api/articles/{article_id}/summary?force=true")
        assert response3.status_code == 200
        mock_client.models.generate_content.assert_called_once()
        
def test_summarize_no_text():
    with get_db() as db:
        db.execute("INSERT INTO articles (id, url, title, domain, topic, excerpt, dateAdded, status, extracted_text) VALUES ('art_2', 'http://empty.com', 'a', 'a', 'a', 'a', 'a', 'success', '')")
        db.commit()
        
    response = client.post("/api/articles/art_2/summary")
    assert response.status_code == 400
    assert "no extracted text" in response.json()["detail"]

def test_summarize_404():
    response = client.post("/api/articles/missing/summary")
    assert response.status_code == 404

def test_summarize_provider_error():
    client.post("/api/import", json={"urls": ["http://example.com"]})
    articles_response = client.get("/api/articles")
    article_id = articles_response.json()[0]["id"]
    
    with patch("app.main.genai") as mock_genai, patch("app.main.os.environ.get") as mock_env:
        mock_env.return_value = "FAKE_API_KEY"
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("API rate limit")
        mock_genai.Client.return_value = mock_client
        
        response = client.post(f"/api/articles/{article_id}/summary?force=true")
        assert response.status_code == 502
        assert "Failed to generate summary" in response.json()["detail"]

def test_takeaways_success():
    client.post("/api/import", json={"urls": ["http://example.com"]})
    articles_response = client.get("/api/articles")
    article_id = articles_response.json()[0]["id"]
    
    with patch("app.main.genai") as mock_genai, patch("app.main.os.environ.get") as mock_env:
        mock_env.return_value = "FAKE_API_KEY"
        
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "- Point 1\n- Point 2"
        mock_client.models.generate_content.return_value = mock_response
        mock_genai.Client.return_value = mock_client
        
        response = client.post(f"/api/articles/{article_id}/takeaways")
        assert response.status_code == 200
        assert response.json()["takeaways"] == "- Point 1\n- Point 2"
        assert mock_client.models.generate_content.call_args.kwargs['model'] == 'gemma-4-26b-a4b-it'
        
        # Test DB persistence and non-forcing
        mock_client.models.generate_content.reset_mock()
        response2 = client.post(f"/api/articles/{article_id}/takeaways")
        assert response2.status_code == 200
        assert response2.json()["takeaways"] == "- Point 1\n- Point 2"
        mock_client.models.generate_content.assert_not_called()
        
        # Test forcing
        response3 = client.post(f"/api/articles/{article_id}/takeaways?force=true")
        assert response3.status_code == 200
        mock_client.models.generate_content.assert_called_once()

def test_takeaways_no_text():
    with get_db() as db:
        # Generate random id to avoid conflict
        import uuid
        uid = str(uuid.uuid4())
        db.execute("INSERT INTO articles (id, url, title, domain, topic, excerpt, dateAdded, status, extracted_text) VALUES (?, 'http://empty2.com', 'a', 'a', 'a', 'a', 'a', 'success', '')", (uid,))
        db.commit()
        
    response = client.post(f"/api/articles/{uid}/takeaways")
    assert response.status_code == 400
    assert "no extracted text" in response.json()["detail"]

def test_takeaways_404():
    response = client.post("/api/articles/missing/takeaways")
    assert response.status_code == 404

def test_takeaways_provider_error():
    client.post("/api/import", json={"urls": ["http://example.com"]})
    articles_response = client.get("/api/articles")
    article_id = articles_response.json()[0]["id"]
    
    with patch("app.main.genai") as mock_genai, patch("app.main.os.environ.get") as mock_env:
        mock_env.return_value = "FAKE_API_KEY"
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("API rate limit")
        mock_genai.Client.return_value = mock_client
        
        response = client.post(f"/api/articles/{article_id}/takeaways?force=true")
        assert response.status_code == 502
        assert "Failed to generate takeaways" in response.json()["detail"]

def test_suggest_order_success():
    client.post("/api/import", json={"urls": ["http://example.com", "http://example.org"]})
    articles_response = client.get("/api/articles")
    ids = [a["id"] for a in articles_response.json()]
    assert len(ids) == 2
    
    with patch("app.main.genai") as mock_genai, patch("app.main.os.environ.get") as mock_env:
        mock_env.return_value = "FAKE_API_KEY"
        
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = '```json\n{"suggestedOrder": ["' + ids[1] + '", "' + ids[0] + '"], "rationale": "Because."}\n```'
        mock_client.models.generate_content.return_value = mock_response
        mock_genai.Client.return_value = mock_client
        
        response = client.post("/api/trails/suggest-order", json={"articleIds": ids})
        assert response.status_code == 200
        data = response.json()
        assert data["suggestedOrder"] == [ids[1], ids[0]]
        assert data["rationale"] == "Because."
        
def test_suggest_order_invalid_ids():
    response = client.post("/api/trails/suggest-order", json={"articleIds": ["missing_id"]})
    assert response.status_code == 404
    assert "Articles not found" in response.json()["detail"]
    
def test_suggest_order_malformed_json():
    client.post("/api/import", json={"urls": ["http://example.com"]})
    articles_response = client.get("/api/articles")
    ids = [articles_response.json()[0]["id"]]
    
    with patch("app.main.genai") as mock_genai, patch("app.main.os.environ.get") as mock_env:
        mock_env.return_value = "FAKE_API_KEY"
        
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = 'This is not json'
        mock_client.models.generate_content.return_value = mock_response
        mock_genai.Client.return_value = mock_client
        
        response = client.post("/api/trails/suggest-order", json={"articleIds": ids})
        assert response.status_code == 502
        assert "Failed to parse model output" in response.json()["detail"]

def test_suggest_order_invalid_set_of_ids():
    client.post("/api/import", json={"urls": ["http://example.com"]})
    articles_response = client.get("/api/articles")
    ids = [articles_response.json()[0]["id"]]
    
    with patch("app.main.genai") as mock_genai, patch("app.main.os.environ.get") as mock_env:
        mock_env.return_value = "FAKE_API_KEY"
        
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = '{"suggestedOrder": ["wrong_id"], "rationale": "Oops."}'
        mock_client.models.generate_content.return_value = mock_response
        mock_genai.Client.return_value = mock_client
        
        response = client.post("/api/trails/suggest-order", json={"articleIds": ids})
        assert response.status_code == 200
        data = response.json()
        assert data["suggestedOrder"] == ids  # Should fallback to original order
        assert "invalid set" in data["rationale"]

def test_generate_audio():
    # First create a trail
    client.post("/api/import", json={"urls": ["http://example.com"]})
    articles = client.get("/api/articles").json()
    assert len(articles) > 0
    article_id = articles[0]["id"]
    
    trail = client.post("/api/trails", json={
        "title": "Audio Trail",
        "narrationStyle": "informative",
        "targetDurationMinutes": 5,
        "articleIds": [article_id]
    }).json()
    trail_id = trail["id"]
    
    # Generate audio
    response = client.post(f"/api/trails/{trail_id}/audio")
    assert response.status_code == 200
    updated_trail = response.json()
    assert updated_trail["status"] == "ready"
    assert updated_trail["audioUrl"] == f"/api/media/{trail_id}.mp3"

def test_generate_audio_404():
    response = client.post("/api/trails/missing_trail/audio")
    assert response.status_code == 404

def test_get_media_success():
    response = client.get("/api/media/test_trail.wav")
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"

def test_get_media_invalid_path():
    # Pass a filename containing '..' that won't be eaten by the URL parser
    response = client.get("/api/media/sneaky..name.wav")
    assert response.status_code == 400


