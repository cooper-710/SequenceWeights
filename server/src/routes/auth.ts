import express from 'express';
import { getDatabase } from '../services/dbService.js';

const router = express.Router();
const db = getDatabase();

// Helper function to slugify names (matches frontend logic)
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// GET /api/auth/by-name/:name - Login by name (path-based auth)
router.get('/by-name/:name', (req, res) => {
  try {
    const { name } = req.params;
    const decodedName = decodeURIComponent(name);
    
    if (!decodedName) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Get all athletes and find by slugified name match
    const allAthletes = db.prepare('SELECT * FROM athletes').all() as any[];
    const athlete = allAthletes.find(a => {
      const slug = slugifyName(a.name);
      return slug === decodedName.toLowerCase();
    });
    
    if (!athlete) {
      return res.status(401).json({ error: 'Athlete not found' });
    }
    
    // Return athlete data (without password)
    const { password_hash, login_token, ...athleteWithoutPassword } = athlete;
    
    res.json({
      user: {
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        role: 'user' as const,
      },
    });
  } catch (error) {
    console.error('Error during name-based login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// POST /api/auth/login - Login with token
router.post('/login', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Find athlete by login token
    const athlete: any = db.prepare('SELECT * FROM athletes WHERE login_token = ?').get(token);
    
    if (!athlete) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Return athlete data (without password)
    const { password_hash, ...athleteWithoutPassword } = athlete;
    
    res.json({
      user: {
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        role: 'user' as const,
      },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/validate - Validate token (for checking if user is still logged in)
router.get('/validate/:token', (req, res) => {
  try {
    const { token } = req.params;
    
    const athlete: any = db.prepare('SELECT * FROM athletes WHERE login_token = ?').get(token);
    
    if (!athlete) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const { password_hash, ...athleteWithoutPassword } = athlete;
    
    res.json({
      user: {
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        role: 'user' as const,
      },
    });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

export default router;
