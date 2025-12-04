import express from 'express';
import { randomUUID } from 'crypto';
import { getDatabase } from '../services/dbService.js';

const router = express.Router();
const db = getDatabase();

// GET /api/athletes - Get all athletes
router.get('/', (req, res) => {
  try {
    const athletes = db.prepare('SELECT * FROM athletes ORDER BY created_at DESC').all();
    res.json(athletes.map((athlete: any) => {
      const { password_hash, login_token, ...rest } = athlete;
      return {
        ...rest,
        loginToken: login_token || null, // Map snake_case to camelCase
      };
    }));
  } catch (error) {
    console.error('Error fetching athletes:', error);
    res.status(500).json({ error: 'Failed to fetch athletes' });
  }
});

// GET /api/athletes/:id - Get single athlete
router.get('/:id', (req, res) => {
  try {
    const athlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(req.params.id);
    
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    
    const { password_hash, login_token, ...rest } = athlete as any;
    res.json({
      ...rest,
      loginToken: login_token || null, // Map snake_case to camelCase
    });
  } catch (error) {
    console.error('Error fetching athlete:', error);
    res.status(500).json({ error: 'Failed to fetch athlete' });
  }
});

// POST /api/athletes - Create new athlete
router.post('/', (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    // Generate ID using UUID instead of timestamp to avoid collisions
    const id = randomUUID();
    
    // For now, store plain password (you should hash this in production)
    const password_hash = password || null;
    
    // Generate unique login token for magic link
    const loginToken = randomUUID();
    
    // Check if login_token column exists before inserting
    const tableInfo: any = db.prepare("PRAGMA table_info(athletes)").all();
    const hasLoginToken = tableInfo.some((col: any) => col.name === 'login_token');
    
    try {
      if (hasLoginToken) {
        db.prepare(`
          INSERT INTO athletes (id, name, email, password_hash, login_token)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, name, email, password_hash, loginToken);
      } else {
        // Fallback: insert without login_token if column doesn't exist yet
        db.prepare(`
          INSERT INTO athletes (id, name, email, password_hash)
          VALUES (?, ?, ?, ?)
        `).run(id, name, email, password_hash);
        
        // Try to add the column and update
        try {
          db.exec(`ALTER TABLE athletes ADD COLUMN login_token TEXT`);
          db.prepare(`UPDATE athletes SET login_token = ? WHERE id = ?`).run(loginToken, id);
        } catch (alterError: any) {
          console.warn('Could not add login_token column:', alterError.message);
        }
      }
      
      const newAthlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(id);
      
      if (!newAthlete) {
        throw new Error('Failed to retrieve created athlete');
      }
      
      const { password_hash: pwd_hash, login_token, ...rest } = newAthlete as any;
      
      res.status(201).json({
        ...rest,
        loginToken: login_token || null, // Map snake_case to camelCase
      });
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        if (error.message.includes('email')) {
          return res.status(409).json({ error: 'Email already exists' });
        }
        // If ID collision (shouldn't happen with UUID, but handle it anyway)
        // Regenerate ID and retry once
        const newId = randomUUID();
        try {
          db.prepare(`
            INSERT INTO athletes (id, name, email, password_hash, login_token)
            VALUES (?, ?, ?, ?, ?)
          `).run(newId, name, email, password_hash, loginToken);
          
          const retryAthlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(newId);
          if (!retryAthlete) {
            throw new Error('Failed to retrieve created athlete after retry');
          }
          
          const { password_hash: pwd_hash2, login_token: login_tok, ...rest } = retryAthlete as any;
          return res.status(201).json({
            ...rest,
            loginToken: login_tok || null,
          });
        } catch (retryError: any) {
          throw error; // Throw original error if retry also fails
        }
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error creating athlete:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create athlete',
      details: error.message || 'Unknown error'
    });
  }
});

// PUT /api/athletes/:id - Update athlete
router.put('/:id', (req, res) => {
  try {
    const { name, email, password } = req.body;
    const athleteId = req.params.id;
    
    const existingAthlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(athleteId);
    if (!existingAthlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(email);
    }
    if (password !== undefined) {
      updates.push('password_hash = ?');
      values.push(password); // Should hash this in production
    }
    
    if (updates.length === 0) {
      const { password_hash, login_token, ...rest } = existingAthlete as any;
      return res.json({
        ...rest,
        loginToken: login_token || null,
      });
    }
    
    values.push(athleteId);
    db.prepare(`
      UPDATE athletes
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);
    
    const updatedAthlete = db.prepare('SELECT * FROM athletes WHERE id = ?').get(athleteId);
    const { password_hash, login_token, ...rest } = updatedAthlete as any;
    
    res.json({
      ...rest,
      loginToken: login_token || null,
    });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Error updating athlete:', error);
    res.status(500).json({ error: 'Failed to update athlete' });
  }
});

// DELETE /api/athletes/:id - Delete athlete
router.delete('/:id', (req, res) => {
  try {
    const athleteId = req.params.id;
    
    const result = db.prepare('DELETE FROM athletes WHERE id = ?').run(athleteId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting athlete:', error);
    res.status(500).json({ error: 'Failed to delete athlete' });
  }
});

export default router;
