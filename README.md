# Tabs to Trails

A privacy-first local AI application for turning browser tabs into narrated audio walking experiences.

## Project Structure

- `frontend/`: React + TypeScript frontend (Vite)
- `backend/`: Python + FastAPI backend
- `extension/`: Firefox WebExtension
- `docs/`: Architecture and development documentation

## Installation and Startup (Kali Linux)

### Prerequisites
- Node.js and npm
- Python 3 and `venv`
- Firefox Browser

### 1. Backend Setup
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Start the backend server:
```bash
uvicorn app.main:app --reload
```
The health check will be available at `http://127.0.0.1:8000/health`.

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```
*(Note: The frontend uses Vite, React, TypeScript, and TailwindCSS v4).*

### 3. Extension Setup (Firefox)
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on...".
3. Navigate to the `extension/` directory in this project and select the `manifest.json` file.
4. The Tabs to Trails icon should appear in your toolbar.
