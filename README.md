# Sequence Builder

A comprehensive fitness training management application for coaches and athletes.

## Project Structure

```
SequenceBuilder/
├── server/          # Backend API (Express + SQLite)
│   ├── src/
│   ├── data/        # Database and CSV files
│   └── package.json
├── src/             # Frontend (React + TypeScript)
└── package.json     # Frontend dependencies
```

## Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Install frontend dependencies:**
```bash
npm install
```

2. **Install backend dependencies:**
```bash
cd server
npm install
cd ..
```

## Running the Application

### Option 1: Run Frontend and Backend Separately

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
Backend runs on `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
Frontend runs on `http://localhost:3000`

### Option 2: Run Both Together (Recommended)

Install a process manager like `concurrently`:
```bash
npm install --save-dev concurrently
```

Then add this script to root `package.json`:
```json
"scripts": {
  "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
  "dev:server": "cd server && npm run dev",
  "dev:client": "vite"
}
```

Then run:
```bash
npm run dev
```

## Features

- **Exercise Library**: CSV-based exercise database with full CRUD operations
- **Athlete Management**: Create and manage athletes
- **Team Management**: Organize athletes into teams
- **Workout Builder**: Create structured workouts with blocks and exercises
- **Workout Tracking**: Track progress and completion

## Database

The application uses SQLite for data persistence:
- Database location: `server/data/database.db`
- Exercises are stored in CSV: `server/data/Lifts+Mobility.csv`
- Database is automatically initialized on first server start

## API Endpoints

All API endpoints are prefixed with `/api`:

- **Exercises**: `/api/exercises` (GET, POST, PUT, DELETE)
- **Athletes**: `/api/athletes` (GET, POST, PUT, DELETE)
- **Workouts**: `/api/workouts` (GET, POST, PUT, DELETE)
- **Teams**: `/api/teams` (GET, POST, PUT, DELETE)

See `server/README.md` for detailed API documentation.

## Development

- Frontend: React 18 + TypeScript + Vite
- Backend: Express + SQLite + TypeScript
- Styling: Tailwind CSS

## Notes

- The CSV file serves as the source of truth for exercises
- All changes to exercises are immediately written back to the CSV
- The frontend automatically proxies API requests to the backend during development