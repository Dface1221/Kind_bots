# Tabs to Trails - Project Checklist

## Phase 0: Repository Foundation (Current)
- [x] Inspect and plan workspace
- [x] Set up directory structure (`frontend/`, `backend/`, `extension/`, `docs/`)
- [x] Scaffold Vite React TypeScript frontend
- [x] Scaffold Python virtual environment and minimal FastAPI backend
- [x] Create minimal Firefox WebExtension manifest and popup
- [x] Create `.gitignore` and `.env.example`
- [x] Create `README.md`, `PROJECT_CHECKLIST.md`, and `docs/ARCHITECTURE.md`
- [x] Verify frontend runs
- [x] Verify backend health check
- [x] Validate extension manifest and test loading

## Phase 1A: Product UI Foundation (Current)
- [x] Build polished, responsive React frontend layout
- [x] Create Source Library with sample data
- [x] Create Episode Setup with duration/style controls
- [x] Create Generation Screen with simulated stages
- [x] Create Audio Player with chapters and Trail Mode
- [x] Create Settings page for local AI providers

## Phase 1B: Basic Extension and Text Extraction (Current)
- [x] Implement active tab text extraction in the extension
- [x] Send extracted text to the backend
- [x] Connect frontend to real extraction data

## Phase 1C: Trail Creation and Reading Workflow (Current)
- [x] Migrate backend storage to persistent SQLite
- [x] Build Trail creation UI with ordering and naming
- [x] Implement Trail API endpoints
- [x] Create Reading Player with article text loading and progress persistence

## Phase 2: Local AI Summarization (Future)
- [ ] Integrate local LLM (e.g., via Ollama) in the backend
- [ ] Generate summary from extracted text
- [ ] Display summary in the frontend

## Phase 3: Text-to-Speech (TTS) Integration (Future)
- [ ] Integrate local TTS engine (e.g., VoxCPM2 or Coqui)
- [ ] Generate audio file from the summary
- [ ] Play back audio in the frontend

## Phase 4: Polish and Deployment
- [ ] Refine UI/UX
- [ ] Add error handling and loading states
- [ ] Finalize documentation
