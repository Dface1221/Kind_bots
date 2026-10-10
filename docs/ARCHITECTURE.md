# Tabs to Trails Architecture

This document describes the high-level architecture of the Tabs to Trails application.

## Components

The system is broken down into three main components to maintain separation of concerns:

### 1. Firefox WebExtension (`extension/`)
- **Role:** Extracts the visible content (text) from the currently active browser tab.
- **Tech Stack:** HTML/JS/CSS, Manifest V3.
- **Responsibility:** Captures clean text from articles or blog posts and sends it via an HTTP request to the local backend.

### 2. Backend API (`backend/`)
- **Role:** The core orchestrator that receives text, processes it using AI, and generates audio.
- **Tech Stack:** Python, FastAPI.
- **Responsibility:**
  - Expose REST API endpoints (e.g., `/health`, `/process`).
  - Interface with a local LLM (e.g., Ollama) to summarize or reformat text suitable for narration.
  - Interface with a local Text-to-Speech (TTS) engine to generate audio files.
  - Serve generated audio to the frontend.

### 3. Frontend Dashboard (`frontend/`)
- **Role:** The user interface to manage, play, and organize generated audio "trails".
- **Tech Stack:** React, TypeScript, Vite.
- **Responsibility:**
  - View extraction history.
  - Provide an audio player.
  - Manage settings (e.g., voice selection, LLM prompts).

## Data Flow (Current Phase 1B)

1. **User Action:** User clicks the extension icon in Firefox, views open tabs, and selects tabs to import.
2. **Extraction Initiation:** Extension sends selected URLs to `POST http://127.0.0.1:8000/api/import`.
3. **Backend Processing:** Backend securely validates the URLs (blocking private networks), fetches the HTML, and uses `trafilatura` to extract clean article text and metadata.
4. **Frontend Sync:** The React frontend fetches successfully imported articles via `GET http://127.0.0.1:8000/api/articles`.

## Future Data Flow (AI & TTS)
5. **Summarization (Planned):** Backend sends text to Local LLM for summarization.
6. **Narration (Planned):** Summarized text is sent to Local TTS engine to generate a `.mp3` or `.wav` file.
7. **Consumption (Planned):** User opens the React frontend to view the new "trail" and clicks play.
