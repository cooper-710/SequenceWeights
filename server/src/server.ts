import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './services/dbService.js';
import exercisesRouter from './routes/exercises.js';
import athletesRouter from './routes/athletes.js';
import workoutsRouter from './routes/workouts.js';
import teamsRouter from './routes/teams.js';
import authRouter from './routes/auth.js';
import uploadRouter from './routes/upload.js';

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initializeDatabase();

// Serve video files statically
app.use('/api/videos', express.static(path.resolve(__dirname, '../data/videos')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/exercises', exercisesRouter);
app.use('/api/athletes', athletesRouter);
app.use('/api/workouts', workoutsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database initialized at server/data/database.db`);
  console.log(`📝 CSV exercises at server/data/Lifts+Mobility.csv`);
  console.log(`🎥 Video uploads at server/data/videos/`);
});
