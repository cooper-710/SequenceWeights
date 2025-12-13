-- Add workout_completions table for fast completion tracking
CREATE TABLE IF NOT EXISTS workout_completions (
  workout_id TEXT NOT NULL,
  athlete_id TEXT NOT NULL,
  completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workout_id, athlete_id),
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_workout_completions_athlete ON workout_completions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_workout_completions_workout ON workout_completions(workout_id);

