# DevPulse — Issue & Feature Tracker API
 
## Live URL
https://your-railway-url.railway.app
 
## Tech Stack
Node.js | TypeScript | Express.js | PostgreSQL (NeonDB) | JWT | bcrypt
 
## Setup
```
git clone https://github.com/yourusername/devpulse.git
cd devpulse
npm install
# create .env with DATABASE_URL and JWT_SECRET
npm run dev
```
 
## API Endpoints
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | /api/auth/signup | Public |
| POST | /api/auth/login | Public |
| POST | /api/issues | Auth |
| GET | /api/issues | Public |
| GET | /api/issues/:id | Public |
| PATCH | /api/issues/:id | Auth |
| DELETE | /api/issues/:id | Maintainer |
 
## Database Schema
users: id, name, email, password, role, created_at, updated_at
issues: id, title, description, type, status, reporter_id, created_at, updated_at
