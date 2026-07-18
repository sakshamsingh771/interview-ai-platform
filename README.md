# PrepRoom — AI Interview Coach

A full-stack mock-interview platform. Sign up, pick a role/topic/difficulty, answer
AI-generated interview questions, and get scored feedback question-by-question plus an
overall closing summary.

**Stack**
- Backend: FastAPI (Python), PostgreSQL, SQLAlchemy, JWT auth, Docker
- Frontend: React (Vite, JavaScript), Tailwind CSS, React Router
- AI: OpenAI (GPT) generates questions if configured, falling back to Anthropic (Claude),
  then to a built-in offline question bank — grading/summaries use Anthropic

## Features

- Email/password sign up and sign in, **plus Google Sign-In** (JWT access tokens + revocable, rotating refresh tokens)
- Rate-limited auth endpoints (login, signup, password reset, contact form) against brute-forcing
- Email verification (logged to the console in dev, sent for real once SMTP is configured)
- Password reset via emailed one-time link
- Public landing page: hero, animated background, feature highlights, stats, testimonials,
  pricing cards, FAQ, and a working contact form (emails you, no fake "sent" message)
- Dark / light theme toggle with the choice remembered across visits
- **Structured role/topic selection**: curated dropdowns per role (with a "Custom topic…" fallback)
  instead of freeform text
- **Live interview simulation mode**: local webcam preview, the AI reads each question aloud
  (browser text-to-speech), and you can answer by voice (browser speech-to-text) or by typing
- AI-generated interview questions tailored to your inputs, plus a personalized
  "Preparation Strategy & Core Concept Roadmap" for the session
- Submit answers one at a time and get an instant score (0–10) + specific feedback
- On finishing, an AI-written overall summary with strengths and one thing to improve
- Dashboard with a "readiness ring" showing your average score and full session history
- Resume an in-progress interview, or revisit a completed one's results
- Runs fully offline in "demo mode" (curated question bank + placeholder feedback) if you
  don't have any AI provider key yet — everything else (auth, DB, UI) still works

## Project layout

```
interview-ai-platform/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, startup table creation
│   │   ├── config.py          # env-driven settings (pydantic-settings)
│   │   ├── database.py        # SQLAlchemy engine/session
│   │   ├── models.py          # User, InterviewSession, Question, Answer
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── security.py        # password hashing + JWT
│   │   ├── deps.py            # get_current_user dependency
│   │   ├── routers/
│   │   │   ├── auth.py        # /auth/signup, /auth/login, /auth/me
│   │   │   └── interviews.py  # /interviews/* CRUD + scoring
│   │   └── services/
│   │       └── ai_service.py  # all Anthropic prompt construction lives here
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx / App.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── api/client.js      # axios instance + typed API calls
│   │   ├── components/        # Navbar, ProtectedRoute
│   │   └── pages/              # Login, Signup, Dashboard, Interview, Results
│   ├── package.json
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── .env.example
└── docker-compose.yml
```

## Setup

### 1. Prerequisites

- Docker and Docker Compose installed
- (Optional but recommended) an Anthropic API key from https://console.anthropic.com —
  without it the app still runs, using placeholder questions/feedback

### 2. Configure environment variables

```bash
cd interview-ai-platform
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Open `backend/.env` and set:
- `SECRET_KEY` — replace with a long random string (e.g. `openssl rand -hex 32`)
- `ANTHROPIC_API_KEY` — your key, if you have one
- `OPENAI_API_KEY` / `OPENAI_MODEL` — optional. If set, question generation tries OpenAI
  first (better variety across sessions), falling back to Anthropic, then to the offline
  question bank if neither is configured. Grading/summaries still use Anthropic.
- `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` — optional social
  login. Google: create an OAuth 2.0 Client ID at
  https://console.cloud.google.com/apis/credentials (type "Web application"), add
  `http://localhost:5173` under Authorized JavaScript origins. GitHub: create an
  OAuth App at https://github.com/settings/developers with callback URL
  `http://localhost:5173/auth/github/callback`. Put the public client IDs in
  `frontend/.env` too (`VITE_GOOGLE_CLIENT_ID`, `VITE_GITHUB_CLIENT_ID`) — never put
  the GitHub client *secret* in the frontend. Leave any of these blank and that
  button just shows a "not configured" message — email/password auth still works fully.
- `SMTP_HOST` — optional. Leave blank and verification/password-reset emails are
  logged to the backend console instead of sent, so those flows are fully testable
  without a real mail server
- Leave the Postgres and `DATABASE_URL` values as-is unless you changed service names
  in `docker-compose.yml`

`frontend/.env` just needs `VITE_API_URL=http://localhost:8000`, which is already set.

### 3. Start everything

```bash
docker compose up --build
```

This starts three containers:
- `db` — Postgres 16, exposed on `localhost:5432`
- `backend` — FastAPI on `localhost:8000` (docs at `localhost:8000/docs`)
- `frontend` — Vite dev server on `localhost:5173`

The backend creates its tables automatically on startup (no manual migration needed
for this project's scope).

**If Postgres logs `FATAL: database "<username>" does not exist` on repeat:** this
means the data volume already has an *old* username/database from a previous run —
Postgres only runs its init logic (creating the user/database from `POSTGRES_USER`/
`POSTGRES_DB`) the first time it starts on an empty volume. Reset it with:
```bash
docker compose down -v && docker compose up --build
```

### 4. Use it

1. Open `http://localhost:5173`
2. Create an account on the sign-up page
3. From the dashboard, start a new interview (role, topic, difficulty, question count)
4. Answer each question — you'll get a score and feedback immediately
5. Finish the interview to see the overall score and summary
6. Revisit past sessions from the dashboard any time

## Running without Docker (local dev)

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
# make sure Postgres is running locally and DATABASE_URL in .env points to it
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Notes on extending this

- **Browser support for live interview mode**: webcam preview uses standard
  `getUserMedia` (works everywhere). Text-to-speech (`speechSynthesis`) is widely
  supported. Speech-to-text uses the non-standard `SpeechRecognition` /
  `webkitSpeechRecognition` API, which works in Chrome/Edge but not Firefox — the
  mic button disables itself gracefully with a message when unsupported, and typing
  the answer always works as a fallback.
- **Migrations**: this project uses `Base.metadata.create_all()` on startup for
  simplicity. For real schema evolution, switch to Alembic (`alembic init migrations`)
  the same way you would in TaskFlow.
- **Streaming feedback**: `ai_service.py` currently returns a full response per call;
  swapping to Claude's streaming API would let the frontend show feedback token-by-token.
- **Resume-aware questions**: extend `SessionCreate` to accept resume text and fold it
  into `generate_questions`'s prompt.
- **Voice answers**: add a speech-to-text step client-side before submitting `content`
  to `/interviews/{id}/questions/{id}/answer` — the backend doesn't care how the text
  was produced.
