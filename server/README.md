# Sequence Builder Server

Backend API server for the Sequence Builder application.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. The database and CSV file will be created automatically when the server starts:
   - Database: `server/data/database.db`
   - CSV exercises: `server/data/Lifts+Mobility.csv`

## Running the Server

Development mode (with hot reload):
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

The server runs on `http://localhost:3001` by default.

## API Endpoints

### Exercises (CSV-based)
- `GET /api/exercises` - Get all exercises
- `GET /api/exercises/:id` - Get single exercise
- `POST /api/exercises` - Create exercise
- `PUT /api/exercises/:id` - Update exercise
- `DELETE /api/exercises/:id` - Delete exercise

### Athletes
- `GET /api/athletes` - Get all athletes
- `GET /api/athletes/:id` - Get single athlete
- `POST /api/athletes` - Create athlete
- `PUT /api/athletes/:id` - Update athlete
- `DELETE /api/athletes/:id` - Delete athlete

### Workouts
- `GET /api/workouts` - Get all workouts (optional query: `?athleteId=...&teamId=...`)
- `GET /api/workouts/:id` - Get single workout
- `POST /api/workouts` - Create workout
- `PUT /api/workouts/:id` - Update workout
- `DELETE /api/workouts/:id` - Delete workout

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get single team
- `POST /api/teams` - Create team
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team
- `POST /api/teams/:id/athletes` - Add athlete to team
- `DELETE /api/teams/:id/athletes/:athleteId` - Remove athlete from team

## Database Schema

The SQLite database includes:
- `athletes` - Athlete information
- `teams` - Team information
- `team_athletes` - Many-to-many relationship between teams and athletes
- `workouts` - Workout templates and schedules
- `blocks` - Workout structure blocks
- `block_exercises` - Exercises within blocks
- `exercise_sets` - Completed set tracking for athletes

## CSV Exercise Library

Exercises are stored in `server/data/Lifts+Mobility.csv`. This file is read/written directly by the API, serving as the source of truth for the exercise library.

## Notes

- The database is automatically initialized on first run
- Foreign keys are enabled for referential integrity
- Cascade deletes are configured for related data
