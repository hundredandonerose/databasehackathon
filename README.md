# Youth Hackathon Kazakhstan

A full-stack hackathon platform built with React, Express, and MySQL.

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MySQL

## Main Product Flow

- Public visitors can only view hackathon information.
- Users can register and log in with a real MySQL-backed account.
- After login, the team portal appears.
- In the portal, the user can:
  - register a team
  - choose 1 of 3 business cases
  - manage 3 to 5 team members
  - complete all 3 required checkpoints in order

## Project Structure

```text
.
├── client
│   └── src
│       ├── App.jsx
│       ├── main.jsx
│       ├── styles.css
│       └── components
│           ├── Countdown.jsx
│           ├── Navbar.jsx
│           └── SectionHeading.jsx
├── server
│   ├── db
│   │   └── schema.sql
│   └── src
│       ├── config
│       │   └── db.js
│       ├── controllers
│       │   ├── authController.js
│       │   └── teamController.js
│       ├── middleware
│       │   └── authMiddleware.js
│       ├── routes
│       │   ├── authRoutes.js
│       │   └── teamRoutes.js
│       ├── utils
│       │   ├── auth.js
│       │   ├── constants.js
│       │   └── validators.js
│       └── index.js
```

## Local Setup

### 1. Create the MySQL database

The backend can create the database and table automatically on startup if MySQL is available locally.

If you want to create it manually, run the SQL schema:

```sql
SOURCE server/db/schema.sql;
```

Or copy the contents of `server/db/schema.sql` into your MySQL client.

### 2. Configure environment variables

Create `server/.env`:

```env
PORT=5001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=youth_hackathon_kz
CLIENT_URL=http://localhost:5173
```

Optionally create `client/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### 3. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 4. Start the backend

```bash
cd server
npm run dev
```

### 5. Start the frontend

```bash
cd client
npm run dev
```

Frontend runs on `http://localhost:5173` and backend runs on `http://localhost:5001`.

## API Endpoints

- `POST /api/auth/register` creates a user account
- `POST /api/auth/login` logs in and returns a session token
- `GET /api/auth/me` returns the current user
- `POST /api/my-team` creates or updates the current user's team
- `GET /api/my-team` returns the current user's team with members and checkpoint status
- `GET /api/cases` returns the 3 business cases
- `GET /api/checkpoints` returns checkpoint metadata
- `PUT /api/checkpoints/:code` submits a checkpoint
- `GET /api/health` checks server/database status

## Notes

- The app uses token-based sessions stored in MySQL and saved in browser local storage.
- Team registration is only available after login.
- Team size is limited to 3 to 5 members.
- Each participant has their own grade/course field.
- All 3 checkpoints are required, and checkpoint order is enforced by the backend.
