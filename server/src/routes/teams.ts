import express from 'express';
import { getDatabase } from '../services/dbService.js';

const router = express.Router();
const db = getDatabase();

// Helper function to get workout with blocks and exercises
function getWorkoutWithBlocks(workoutId: string) {
  const workout: any = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
  if (!workout) return null;
  
  const blocks = db.prepare(`
    SELECT * FROM blocks
    WHERE workout_id = ?
    ORDER BY order_index ASC
  `).all(workoutId);
  
  const blocksWithExercises = blocks.map((block: any) => {
    const exercises = db.prepare(`
      SELECT * FROM block_exercises
      WHERE block_id = ?
      ORDER BY order_index ASC
    `).all(block.id);
    
    return {
      id: block.id,
      name: block.name,
      exercises: exercises.map((ex: any) => ({
        id: ex.id,
        exerciseName: ex.exercise_name,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight || undefined,
      })),
    };
  });
  
  return {
    id: workout.id,
    name: workout.name,
    date: workout.date,
    athleteId: workout.athlete_id || undefined,
    teamId: workout.team_id || undefined,
    blocks: blocksWithExercises,
  };
}

// GET /api/teams - Get all teams with their athletes
router.get('/', (req, res) => {
  try {
    const teams = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all();
    
    const teamsWithAthletes = teams.map((team: any) => {
      // Get athletes for this team
      const athletes = db.prepare(`
        SELECT a.*
        FROM athletes a
        INNER JOIN team_athletes ta ON a.id = ta.athlete_id
        WHERE ta.team_id = ?
      `).all(team.id);
      
      // Get workouts for this team with full data
      const workoutIds = db.prepare('SELECT id FROM workouts WHERE team_id = ? ORDER BY date DESC').all(team.id);
      const workouts = workoutIds.map((w: any) => getWorkoutWithBlocks(w.id)).filter(Boolean);
      
      return {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.created_at,
        athletes: athletes.map((athlete: any) => ({
          id: athlete.id,
          name: athlete.name,
          email: athlete.email,
          createdAt: athlete.created_at,
        })),
        workouts: workouts,
      };
    });
    
    res.json(teamsWithAthletes);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// GET /api/teams/:id - Get single team
router.get('/:id', (req, res) => {
  try {
    const team: any = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Get athletes
    const athletes = db.prepare(`
      SELECT a.*
      FROM athletes a
      INNER JOIN team_athletes ta ON a.id = ta.athlete_id
      WHERE ta.team_id = ?
    `).all(team.id);
    
    // Get workouts with full data
    const workoutIds = db.prepare('SELECT id FROM workouts WHERE team_id = ? ORDER BY date DESC').all(team.id);
    const workouts = workoutIds.map((w: any) => getWorkoutWithBlocks(w.id)).filter(Boolean);
    
    res.json({
      id: team.id,
      name: team.name,
      description: team.description,
      createdAt: team.created_at,
      athletes: athletes.map((athlete: any) => ({
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        createdAt: athlete.created_at,
      })),
      workouts: workouts,
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// POST /api/teams - Create new team
router.post('/', (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    
    const teamId = Date.now().toString();
    
    db.prepare(`
      INSERT INTO teams (id, name, description)
      VALUES (?, ?, ?)
    `).run(teamId, name, description || null);
    
    const newTeam: any = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    
    res.status(201).json({
      id: newTeam.id,
      name: newTeam.name,
      description: newTeam.description,
      createdAt: newTeam.created_at,
      athletes: [],
      workouts: [],
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// PUT /api/teams/:id - Update team
router.put('/:id', (req, res) => {
  try {
    const teamId = req.params.id;
    const { name, description } = req.body;
    
    const existingTeam: any = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!existingTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const updates: string[] = [];
    const values: any[] = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    
    if (updates.length > 0) {
      values.push(teamId);
      db.prepare(`
        UPDATE teams
        SET ${updates.join(', ')}
        WHERE id = ?
      `).run(...values);
    }
    
    const updatedTeam: any = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    
    // Get athletes and workouts
    const athletes = db.prepare(`
      SELECT a.*
      FROM athletes a
      INNER JOIN team_athletes ta ON a.id = ta.athlete_id
      WHERE ta.team_id = ?
    `).all(teamId);
    
    const workoutIds = db.prepare('SELECT id FROM workouts WHERE team_id = ? ORDER BY date DESC').all(teamId);
    const workouts = workoutIds.map((w: any) => getWorkoutWithBlocks(w.id)).filter(Boolean);
    
    res.json({
      id: updatedTeam.id,
      name: updatedTeam.name,
      description: updatedTeam.description,
      createdAt: updatedTeam.created_at,
      athletes: athletes.map((athlete: any) => ({
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        createdAt: athlete.created_at,
      })),
      workouts: workouts,
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// DELETE /api/teams/:id - Delete team
router.delete('/:id', (req, res) => {
  try {
    const teamId = req.params.id;
    
    const result = db.prepare('DELETE FROM teams WHERE id = ?').run(teamId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Failed to delete team' });
  }
});

// POST /api/teams/:id/athletes - Add athlete to team
router.post('/:id/athletes', (req, res) => {
  try {
    const teamId = req.params.id;
    const { athleteId } = req.body;
    
    if (!athleteId) {
      return res.status(400).json({ error: 'Athlete ID is required' });
    }
    
    // Check if team exists
    const team: any = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Check if athlete exists
    const athlete: any = db.prepare('SELECT * FROM athletes WHERE id = ?').get(athleteId);
    if (!athlete) {
      return res.status(404).json({ error: 'Athlete not found' });
    }
    
    // Check if already in team
    const existing: any = db.prepare(`
      SELECT * FROM team_athletes
      WHERE team_id = ? AND athlete_id = ?
    `).get(teamId, athleteId);
    
    if (existing) {
      return res.status(409).json({ error: 'Athlete is already in this team' });
    }
    
    // Add athlete to team
    db.prepare(`
      INSERT INTO team_athletes (team_id, athlete_id)
      VALUES (?, ?)
    `).run(teamId, athleteId);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error adding athlete to team:', error);
    res.status(500).json({ error: 'Failed to add athlete to team' });
  }
});

// DELETE /api/teams/:id/athletes/:athleteId - Remove athlete from team
router.delete('/:id/athletes/:athleteId', (req, res) => {
  try {
    const { id: teamId, athleteId } = req.params;
    
    const result = db.prepare(`
      DELETE FROM team_athletes
      WHERE team_id = ? AND athlete_id = ?
    `).run(teamId, athleteId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Athlete not found in team' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing athlete from team:', error);
    res.status(500).json({ error: 'Failed to remove athlete from team' });
  }
});

export default router;
