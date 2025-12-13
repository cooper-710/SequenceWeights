import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/database.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Athletes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS athletes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      login_token TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  
  // Add login_token column to existing athletes table if it doesn't exist
  // Check if column exists first
  try {
    const tableInfo: any = db.prepare("PRAGMA table_info(athletes)").all();
    const hasLoginToken = tableInfo.some((col: any) => col.name === 'login_token');
    
    if (!hasLoginToken) {
      // Column doesn't exist, add it
      db.exec(`ALTER TABLE athletes ADD COLUMN login_token TEXT`);
      // Note: Can't add UNIQUE constraint via ALTER TABLE in SQLite easily
      // We'll handle uniqueness at the application level
      console.log('Added login_token column to athletes table');
    }
  } catch (error: any) {
    console.warn('Error checking/adding login_token column:', error.message);
  }

  // Teams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Team-Athlete relationships (many-to-many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_athletes (
      team_id TEXT NOT NULL,
      athlete_id TEXT NOT NULL,
      PRIMARY KEY (team_id, athlete_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
    )
  `);

  // Workouts table (templates allowed - athlete_id and team_id can both be NULL)
  // Check if table exists with CHECK constraint and migrate if needed
  try {
    const workoutsTableInfo: any = db.prepare(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='workouts'
    `).get();
    
    if (workoutsTableInfo && workoutsTableInfo.sql && workoutsTableInfo.sql.includes('CHECK')) {
      // Table exists with CHECK constraint - need to migrate
      console.log('Migrating workouts table to support templates (removing CHECK constraint)...');
      
      // Disable foreign keys temporarily
      db.pragma('foreign_keys = OFF');
      
      // Create new table without CHECK constraint
      db.exec(`
        CREATE TABLE workouts_new (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          athlete_id TEXT,
          team_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )
      `);
      
      // Copy data from old table
      db.exec(`INSERT INTO workouts_new SELECT * FROM workouts`);
      
      // Drop old table
      db.exec(`DROP TABLE workouts`);
      
      // Rename new table
      db.exec(`ALTER TABLE workouts_new RENAME TO workouts`);
      
      // Re-enable foreign keys
      db.pragma('foreign_keys = ON');
      
      console.log('Migration completed successfully');
    } else {
      // Table doesn't exist or doesn't have CHECK constraint - create normally
      db.exec(`
        CREATE TABLE IF NOT EXISTS workouts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          athlete_id TEXT,
          team_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
          FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
        )
      `);
    }
  } catch (error) {
    console.error('Error migrating workouts table:', error);
    // Fallback: try to create table normally
    db.exec(`
      CREATE TABLE IF NOT EXISTS workouts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        athlete_id TEXT,
        team_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);
  }

  // Blocks table (workout structure)
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      workout_id TEXT NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    )
  `);

  // Exercises in blocks
  db.exec(`
    CREATE TABLE IF NOT EXISTS block_exercises (
      id TEXT PRIMARY KEY,
      block_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      sets INTEGER NOT NULL,
      reps TEXT NOT NULL,
      weight TEXT,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
    )
  `);

  // Exercise completion tracking (for athletes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_sets (
      id TEXT PRIMARY KEY,
      block_exercise_id TEXT NOT NULL,
      workout_id TEXT NOT NULL,
      athlete_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      weight TEXT,
      reps TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      FOREIGN KEY (block_exercise_id) REFERENCES block_exercises(id) ON DELETE CASCADE,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
      UNIQUE(block_exercise_id, workout_id, athlete_id, set_number)
    )
  `);

  // Exercise notes (for athletes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_notes (
      id TEXT PRIMARY KEY,
      block_exercise_id TEXT NOT NULL,
      workout_id TEXT NOT NULL,
      athlete_id TEXT NOT NULL,
      notes TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (block_exercise_id) REFERENCES block_exercises(id) ON DELETE CASCADE,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE,
      UNIQUE(block_exercise_id, workout_id, athlete_id)
    )
  `);

  // Workout completions table (for fast completion tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_completions (
      workout_id TEXT NOT NULL,
      athlete_id TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (workout_id, athlete_id),
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workout_completions_athlete ON workout_completions(athlete_id)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workout_completions_workout ON workout_completions(workout_id)
  `);

  console.log('Database initialized successfully');
}

// Get database instance
export function getDatabase() {
  return db;
}

// Close database connection
export function closeDatabase() {
  db.close();
}
