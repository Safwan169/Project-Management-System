# Minimal Project Management System (MPMS)

Full-stack project management app built for the Datapollex MERN recruitment task.

## Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend  | Express.js, TypeScript              |
| Database | MongoDB (Mongoose)                  |
| Auth     | JWT, role-based access control      |

## Features

- **Admin / Manager:** projects, sprints, tasks, team, reports, Kanban board
- **Member:** dashboard, my tasks, project/sprint views, task detail (comments, attachments, time logs, subtasks, activity)
- Review workflow: members move work to **Review**; managers approve **Done**
- Responsive UI with mobile navigation

## Quick start (local)

### Prerequisites

- Node.js 18+
- MongoDB running locally (or Atlas URI)

### Backend

```bash
cd backend
cp .env.example .env
# Edit MONGODB_URI and JWT_SECRET
npm install
npm run seed    # optional test users
npm run dev
```

API: `http://localhost:5000`

### Frontend

```bash
cd frontend
cp .env.example .env
# NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev
```

App: `http://localhost:3000`

## Test credentials

After running `npm run seed` in `backend/`:

| Role    | Email              | Password   |
| ------- | ------------------ | ---------- |
| Admin   | admin@gmail.com    | pass1234!  |
| Manager | manager@gmail.com  | pass1234!  |
| Member  | member@gmail.com   | pass1234!  |

## Deployment

- **Frontend:** Vercel — set `NEXT_PUBLIC_API_URL` to your API base (e.g. `https://your-api.onrender.com/api`)
- **Backend:** Render / Railway — set `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL` (frontend origin)
- Ensure the API serves `/uploads` for thumbnails and attachments

## Project structure

```
backend/     Express API, Mongoose models, JWT auth
frontend/    Next.js App Router, React Query, dashboard UI
```

## Scripts

| Location   | Command        | Description        |
| ---------- | -------------- | ------------------ |
| backend    | `npm run dev`  | Start API (watch)  |
| backend    | `npm run seed` | Create test users  |
| frontend   | `npm run dev`  | Start Next.js      |
| frontend   | `npm run build`| Production build   |

## License

Private — recruitment submission.
