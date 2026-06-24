# DecoDoc

DecoDoc helps you read research papers faster. Paste an arXiv ID, DOI, abstract, or PDF and get a structured breakdown: summary, methods, limitations, scores, flashcards, citation context, and study notes.

## Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, PostgreSQL (Drizzle ORM)
- **Analysis:** Groq (primary), OpenRouter (fallback), Gemini (embeddings)
- **Sources:** arXiv, Crossref, Semantic Scholar
- **Client storage:** IndexedDB and localStorage for recents and bookmarks

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Add keys to `.env`:

```bash
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here   # embeddings
LLM_PROVIDER=groq
LLM_MODEL=llama-3.3-70b-versatile
DATABASE_URL=postgresql://decodoc:decodoc@localhost:5432/decodoc
```

Start Postgres locally (Docker):

```bash
docker compose up postgres -d
```

- Frontend: http://localhost:5173  
- API health: http://localhost:8787/api/health

Never commit `.env` or real API keys.

## API overview

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /api/analyze` | Optional (quota) | Analyze arXiv, DOI, or abstract |
| `POST /api/upload-pdf` | Optional (quota) | Analyze uploaded PDF (text extracted client-side) |
| `GET /api/paper/:id` | — | Paper + cached analysis |
| `GET /api/me/usage` | — | Quota status |
| `GET /api/library/bookmarks` | Required | Saved papers |

Anonymous users get 3 free analyses; signed-in users get 10 per day.

## Deployment

Split stack: **Vercel** (frontend) + **Render** or **Railway** (API + Postgres).

### Frontend (Vercel)

1. Import the repo (root directory, not `client/`).
2. Build settings come from `vercel.json`.
3. Set environment variable:

```bash
VITE_API_BASE_URL=https://your-api.onrender.com
```

4. Redeploy after changing `VITE_API_BASE_URL` (baked into the client bundle).

### Backend (Render)

1. Create a **PostgreSQL** database on Render.
2. Create a **Web Service** from `Dockerfile.server`.
3. Set environment variables:

```bash
LLM_PROVIDER=groq
GROQ_API_KEY=...
LLM_MODEL=llama-3.3-70b-versatile
OPENROUTER_API_KEY=...              # optional fallback
GEMINI_API_KEY=...                  # required for embeddings
CLIENT_ORIGIN=https://your-app.vercel.app
CLIENT_ORIGINS=http://localhost:5173
ALLOW_VERCEL_PREVIEWS=true
DATABASE_URL=<Render Postgres Internal URL>
AUTH_JWT_SECRET=<long random string, 32+ chars>
API_PUBLIC_URL=https://your-api.onrender.com
PORT=8787
NODE_ENV=production
```

Migrations run automatically on server startup.

### Verify

- Frontend: open your Vercel URL
- Backend: `GET https://your-api.onrender.com/api/health`

## Docker (full stack)

```bash
docker compose up --build
```

## Tests

```bash
npm test
```

## Notes

- PDF text is extracted in the browser with PDF.js before upload.
- Max upload size: 30 MB.
- Analyses are cached in Postgres by paper ID.
