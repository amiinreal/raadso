# Advanced Job Platform MVP

Vite + React + Tailwind frontend with an Express + PostgreSQL backend for structured candidate profiles, jobs, and applications that capture profile/CV usage.

## Prerequisites
- Node.js >= 20.19 (Vite warns on 20.18)
- PostgreSQL running locally

## Backend setup
```bash
cd backend
cp .env.example .env
# Create database
createdb job_platform
# Apply schema + seed data
psql job_platform -f sql/schema.sql
# Install deps
npm install
# Start API
npm run dev
# add migration
psql -U postgres -d job_platform < backend/sql/migrations/add_job_number.sql
```
The API listens on `http://localhost:4000` by default.

### Auth
- Set `JWT_SECRET` in `.env`.
- Register: `POST /auth/register` with `email`, `password`, `role` (`candidate`|`employer`), optional `fullName`. Job seekers get a candidate profile auto-created.
- Login: `POST /auth/login` returns `token`, `user`, and `candidateId` (if seeker).
- Current user: `GET /auth/me` with `Authorization: Bearer <token>`.

## Frontend setup
```bash
cd frontend
npm install
# Point UI at API (optional if using default)
# echo "VITE_API_URL=http://localhost:4000" > .env.local
npm run dev
```
The Vite dev server runs on `http://localhost:5173`.

## Key API endpoints
- `GET /health` — health check
- `GET /jobs` — list jobs (query: `search`, `location`, `tag`)
- `GET /jobs/:id` — job details
- `POST /jobs` — create a job with `tags`
- `GET /candidates` — list candidate profiles
- `GET /candidates/:id` — candidate profile bundle
- `PUT /candidates/:id` — update profile (auth required, auto status)
- `POST /candidates` — create a profile plus nested experience/skills/etc.
- `GET /applications?candidateId=` — list applications
- `POST /applications` — submit application with `used_profile`, `used_cv`, `cover_letter`, `status`
- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`

## Database schema highlights
- Users (roles: candidate or employer), candidate_profiles, work_experiences, educations, skills, languages, attachments
- Jobs + job_tags
- Applications (tracks profile vs CV usage, cover letter, status)
- Seed data includes one candidate (password `changeme`), several jobs, and tags

## Notes
- If you stay on Node 20.18 you will see a Vite engine warning; upgrade to 20.19+ to silence it.
- Demo data renders in the UI if the API is offline.
