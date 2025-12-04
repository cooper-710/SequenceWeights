-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Athletes table
CREATE TABLE IF NOT EXISTS athletes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  login_token TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_athletes_email ON athletes(email);
CREATE INDEX IF NOT EXISTS idx_athletes_login_token ON athletes(login_token);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Team-Athlete relationships (many-to-many)
CREATE TABLE IF NOT EXISTS team_athletes (
  team_id TEXT NOT NULL,
  athlete_id TEXT NOT NULL,
  PRIMARY KEY (team_id, athlete_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_athletes_team_id ON team_athletes(team_id);
CREATE INDEX IF NOT EXISTS idx_team_athletes_athlete_id ON team_athletes(athlete_id);

-- Workouts table (templates allowed - athlete_id and team_id can both be NULL)
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  athlete_id TEXT,
  team_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workouts_athlete_id ON workouts(athlete_id);
CREATE INDEX IF NOT EXISTS idx_workouts_team_id ON workouts(team_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);

-- Blocks table (workout structure)
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blocks_workout_id ON blocks(workout_id);
CREATE INDEX IF NOT EXISTS idx_blocks_order ON blocks(workout_id, order_index);

-- Exercises in blocks
CREATE TABLE IF NOT EXISTS block_exercises (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  sets INTEGER NOT NULL,
  reps TEXT NOT NULL,
  weight TEXT,
  order_index INTEGER NOT NULL,
  FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_block_exercises_block_id ON block_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_block_exercises_order ON block_exercises(block_id, order_index);

-- Exercise completion tracking (for athletes)
CREATE TABLE IF NOT EXISTS exercise_sets (
  id TEXT PRIMARY KEY,
  block_exercise_id TEXT NOT NULL,
  workout_id TEXT NOT NULL,
  athlete_id TEXT NOT NULL,
  set_number INTEGER NOT NULL,
  weight TEXT,
  reps TEXT,
  completed INTEGER DEFAULT 0,
  completed_at TIMESTAMP,
  FOREIGN KEY (block_exercise_id) REFERENCES block_exercises(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  UNIQUE(block_exercise_id, workout_id, athlete_id, set_number)
);

CREATE INDEX IF NOT EXISTS idx_exercise_sets_block_exercise ON exercise_sets(block_exercise_id, workout_id, athlete_id);

-- Exercise notes (for athletes)
CREATE TABLE IF NOT EXISTS exercise_notes (
  id TEXT PRIMARY KEY,
  block_exercise_id TEXT NOT NULL,
  workout_id TEXT NOT NULL,
  athlete_id TEXT NOT NULL,
  notes TEXT,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (block_exercise_id) REFERENCES block_exercises(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
  UNIQUE(block_exercise_id, workout_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_notes_exercise ON exercise_notes(block_exercise_id, workout_id, athlete_id);

-- Exercises table (migrated from CSV)
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  video_url TEXT,
  category TEXT,
  instructions TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
