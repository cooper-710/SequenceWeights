import express from 'express';
import { getDatabase } from '../services/dbService.js';

const router = express.Router();
const db = getDatabase();

interface Block {
  id: string;
  name: string;
  exercises: Array<{
    id: string;
    exerciseName: string;
    sets: number;
    reps: string;
    weight?: string;
  }>;
}

interface Workout {
  id: string;
  name: string;
  date: string;
  athleteId?: string;
  teamId?: string;
  blocks: Block[];
}

// Helper function to check and mark workout as complete
function checkAndMarkWorkoutComplete(workoutId: string, athleteId: string) {
  try {
    // Get all exercises in the workout
    const blocks = db.prepare(`
      SELECT * FROM blocks
      WHERE workout_id = ?
      ORDER BY order_index ASC
    `).all(workoutId);
    
    let totalExercises = 0;
    let completedExercises = 0;
    
    blocks.forEach((block: any) => {
      const exercises = db.prepare(`
        SELECT * FROM block_exercises
        WHERE block_id = ?
        ORDER BY order_index ASC
      `).all(block.id);
      
      exercises.forEach((exercise: any) => {
        totalExercises++;
        // Get total number of sets from exercise_sets table (actual sets, not exercise.sets)
        const totalSetsResult = db.prepare(`
          SELECT COUNT(*) as count FROM exercise_sets
          WHERE block_exercise_id = ? AND workout_id = ? AND athlete_id = ?
        `).get(exercise.id, workoutId, athleteId) as { count: number };
        
        // Get completed sets count
        const completedSets = db.prepare(`
          SELECT COUNT(*) as count FROM exercise_sets
          WHERE block_exercise_id = ? AND workout_id = ? AND athlete_id = ? AND completed = 1
        `).get(exercise.id, workoutId, athleteId) as { count: number };
        
        const totalSets = totalSetsResult.count;
        const completedCount = completedSets.count;
        
        // Exercise is complete if all actual sets are completed and there's at least one set
        if (completedCount === totalSets && totalSets > 0) {
          completedExercises++;
        }
      });
    });
    
    // If all exercises are completed, mark workout as complete
    if (totalExercises > 0 && completedExercises === totalExercises) {
      // Use INSERT OR REPLACE to handle both new and existing completions
      db.prepare(`
        INSERT OR REPLACE INTO workout_completions (workout_id, athlete_id, completed_at)
        VALUES (?, ?, datetime('now'))
      `).run(workoutId, athleteId);
      return true;
    } else {
      // If not complete, remove from completions table (in case it was previously complete)
      db.prepare(`
        DELETE FROM workout_completions
        WHERE workout_id = ? AND athlete_id = ?
      `).run(workoutId, athleteId);
      return false;
    }
  } catch (error) {
    console.error('Error checking workout completion:', error);
    return false;
  }
}

// GET /api/workouts - Get all workouts (optionally filter by athlete, team, or templates only)
router.get('/', (req, res) => {
  try {
    const { athleteId, teamId, templatesOnly } = req.query;
    
    let query = 'SELECT * FROM workouts WHERE 1=1';
    const params: any[] = [];
    
    if (templatesOnly === 'true') {
      // Templates have both athlete_id and team_id as NULL
      query += ' AND athlete_id IS NULL AND team_id IS NULL';
    } else {
      if (athleteId) {
        // Get workouts directly assigned to athlete OR workouts from teams the athlete belongs to
        const teamIds = db.prepare(`
          SELECT team_id FROM team_athletes WHERE athlete_id = ?
        `).all(athleteId).map((row: any) => row.team_id);
        
        if (teamIds.length > 0) {
          // Include workouts assigned to athlete OR workouts from their teams
          const placeholders = teamIds.map(() => '?').join(',');
          query += ' AND (athlete_id = ? OR team_id IN (' + placeholders + '))';
          params.push(athleteId, ...teamIds);
        } else {
          // Athlete has no teams, only show direct workouts
          query += ' AND athlete_id = ?';
          params.push(athleteId);
        }
      }
      
      if (teamId) {
        query += ' AND team_id = ?';
        params.push(teamId);
      }
    }
    
    query += ' ORDER BY date DESC';
    
    const workouts = db.prepare(query).all(...params);
    
    // Fetch blocks and exercises for each workout
    const workoutsWithBlocks = workouts.map((workout: any) => {
      const blocks = db.prepare(`
        SELECT * FROM blocks
        WHERE workout_id = ?
        ORDER BY order_index ASC
      `).all(workout.id);
      
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
    });
    
    res.json(workoutsWithBlocks);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// GET /api/workouts/:id - Get single workout
router.get('/:id', (req, res) => {
  try {
    const workout: any = db.prepare('SELECT * FROM workouts WHERE id = ?').get(req.params.id);
    
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    const blocks = db.prepare(`
      SELECT * FROM blocks
      WHERE workout_id = ?
      ORDER BY order_index ASC
    `).all(workout.id);
    
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
    
    res.json({
      id: workout.id,
      name: workout.name,
      date: workout.date,
      athleteId: workout.athlete_id || undefined,
      teamId: workout.team_id || undefined,
      blocks: blocksWithExercises,
    });
  } catch (error) {
    console.error('Error fetching workout:', error);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

// POST /api/workouts - Create new workout
router.post('/', (req, res) => {
  try {
    const workout: Workout = req.body;
    const { name, date, athleteId, teamId, blocks } = workout;
    
    // Allow templates (both athleteId and teamId can be null)
    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }
    
    const workoutId = Date.now().toString();
    
    // Use transaction to ensure all-or-nothing
    const transaction = db.transaction(() => {
      // Insert workout
      db.prepare(`
        INSERT INTO workouts (id, name, date, athlete_id, team_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(workoutId, name, date, athleteId || null, teamId || null);
      
      // Insert blocks and exercises
      if (blocks && blocks.length > 0) {
        blocks.forEach((block, blockIndex) => {
          const blockId = `${workoutId}_block_${blockIndex}`;
          
          db.prepare(`
            INSERT INTO blocks (id, workout_id, name, order_index)
            VALUES (?, ?, ?, ?)
          `).run(blockId, workoutId, block.name, blockIndex);
          
          if (block.exercises && block.exercises.length > 0) {
            block.exercises.forEach((exercise, exerciseIndex) => {
              const exerciseId = `${blockId}_ex_${exerciseIndex}`;
              
              db.prepare(`
                INSERT INTO block_exercises (id, block_id, exercise_name, sets, reps, weight, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                exerciseId,
                blockId,
                exercise.exerciseName,
                exercise.sets,
                exercise.reps,
                exercise.weight || null,
                exerciseIndex
              );
            });
          }
        });
      }
    });
    
    transaction();
    
    // Fetch and return the created workout
    const createdWorkout: any = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
    const blocks_data = db.prepare(`
      SELECT * FROM blocks
      WHERE workout_id = ?
      ORDER BY order_index ASC
    `).all(workoutId);
    
    const blocksWithExercises = blocks_data.map((block: any) => {
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
    
    res.status(201).json({
      id: createdWorkout.id,
      name: createdWorkout.name,
      date: createdWorkout.date,
      athleteId: createdWorkout.athlete_id || undefined,
      teamId: createdWorkout.team_id || undefined,
      blocks: blocksWithExercises,
    });
  } catch (error: any) {
    console.error('Error creating workout:', error);
    res.status(500).json({ 
      error: 'Failed to create workout',
      message: error?.message || String(error)
    });
  }
});

// PUT /api/workouts/:id - Update workout
router.put('/:id', (req, res) => {
  try {
    const workoutId = req.params.id;
    const workout: Workout = req.body;
    
    const existingWorkout: any = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    // Use transaction to update workout and all related data
    const transaction = db.transaction(() => {
      // Update workout basic info
      db.prepare(`
        UPDATE workouts
        SET name = ?, date = ?, athlete_id = ?, team_id = ?
        WHERE id = ?
      `).run(
        workout.name,
        workout.date,
        workout.athleteId || null,
        workout.teamId || null,
        workoutId
      );
      
      // Delete existing blocks (cascade will delete exercises)
      db.prepare('DELETE FROM blocks WHERE workout_id = ?').run(workoutId);
      
      // Insert new blocks and exercises
      if (workout.blocks && workout.blocks.length > 0) {
        workout.blocks.forEach((block, blockIndex) => {
          const blockId = `${workoutId}_block_${blockIndex}`;
          
          db.prepare(`
            INSERT INTO blocks (id, workout_id, name, order_index)
            VALUES (?, ?, ?, ?)
          `).run(blockId, workoutId, block.name, blockIndex);
          
          if (block.exercises && block.exercises.length > 0) {
            block.exercises.forEach((exercise, exerciseIndex) => {
              const exerciseId = `${blockId}_ex_${exerciseIndex}`;
              
              db.prepare(`
                INSERT INTO block_exercises (id, block_id, exercise_name, sets, reps, weight, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                exerciseId,
                blockId,
                exercise.exerciseName,
                exercise.sets,
                exercise.reps,
                exercise.weight || null,
                exerciseIndex
              );
            });
          }
        });
      }
    });
    
    transaction();
    
    // Return updated workout
    const updatedWorkout: any = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
    const blocks_data = db.prepare(`
      SELECT * FROM blocks
      WHERE workout_id = ?
      ORDER BY order_index ASC
    `).all(workoutId);
    
    const blocksWithExercises = blocks_data.map((block: any) => {
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
    
    res.json({
      id: updatedWorkout.id,
      name: updatedWorkout.name,
      date: updatedWorkout.date,
      athleteId: updatedWorkout.athlete_id || undefined,
      teamId: updatedWorkout.team_id || undefined,
      blocks: blocksWithExercises,
    });
  } catch (error) {
    console.error('Error updating workout:', error);
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// DELETE /api/workouts/:id - Delete workout
router.delete('/:id', (req, res) => {
  try {
    const workoutId = req.params.id;
    
    const result = db.prepare('DELETE FROM workouts WHERE id = ?').run(workoutId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// POST /api/workouts/:workoutId/exercises/:exerciseId/sets - Save exercise sets
router.post('/:workoutId/exercises/:exerciseId/sets', (req, res) => {
  try {
    const { workoutId, exerciseId } = req.params;
    const { athleteId, sets } = req.body;
    
    if (!athleteId || !sets || !Array.isArray(sets)) {
      return res.status(400).json({ error: 'athleteId and sets array are required' });
    }
    
    // Verify workout and exercise exist
    const workout: any = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    const exercise: any = db.prepare('SELECT * FROM block_exercises WHERE id = ?').get(exerciseId);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    // Use transaction to save all sets
    const transaction = db.transaction(() => {
      // First, delete all existing sets for this exercise/athlete/workout combination
      // This ensures that deleted sets are actually removed from the database
      db.prepare(`
        DELETE FROM exercise_sets
        WHERE block_exercise_id = ? AND workout_id = ? AND athlete_id = ?
      `).run(exerciseId, workoutId, athleteId);
      
      // Then insert the new sets
      sets.forEach((set: any) => {
        const setId = `${exerciseId}_${athleteId}_${set.set}`;
        
        db.prepare(`
          INSERT INTO exercise_sets 
          (id, block_exercise_id, workout_id, athlete_id, set_number, weight, reps, completed, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          setId,
          exerciseId,
          workoutId,
          athleteId,
          set.set,
          set.weight || null,
          set.reps || null,
          set.completed ? 1 : 0,
          set.completed ? new Date().toISOString() : null
        );
      });
    });
    
    transaction();
    
    // Check and mark workout as complete after saving sets
    checkAndMarkWorkoutComplete(workoutId, athleteId);
    
    res.json({ success: true, message: 'Sets saved successfully' });
  } catch (error: any) {
    console.error('Error saving exercise sets:', error);
    res.status(500).json({ error: 'Failed to save exercise sets', message: error?.message });
  }
});

// GET /api/workouts/:workoutId/exercises/:exerciseId/sets - Get exercise sets for an athlete
router.get('/:workoutId/exercises/:exerciseId/sets', (req, res) => {
  try {
    const { workoutId, exerciseId } = req.params;
    const { athleteId } = req.query;
    
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId query parameter is required' });
    }
    
    const savedSets = db.prepare(`
      SELECT * FROM exercise_sets
      WHERE block_exercise_id = ? AND workout_id = ? AND athlete_id = ?
      ORDER BY set_number ASC
    `).all(exerciseId, workoutId, athleteId);
    
    const sets = savedSets.map((s: any) => ({
      set: s.set_number,
      weight: s.weight || '',
      reps: s.reps || '',
      completed: s.completed === 1,
    }));
    
    res.json(sets);
  } catch (error: any) {
    console.error('Error fetching exercise sets:', error);
    res.status(500).json({ error: 'Failed to fetch exercise sets' });
  }
});

// GET /api/workouts/completions?athleteId=xxx - Get all completed workouts for an athlete
// IMPORTANT: This must come BEFORE /:workoutId/completion to avoid route conflicts
router.get('/completions', (req, res) => {
  try {
    const { athleteId } = req.query;
    
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId query parameter is required' });
    }
    
    // Get all completed workouts for this athlete
    const completions = db.prepare(`
      SELECT workout_id FROM workout_completions
      WHERE athlete_id = ?
    `).all(athleteId) as Array<{ workout_id: string }>;
    
    // Convert to a simple object: { workoutId: true }
    const completionMap: Record<string, boolean> = {};
    completions.forEach((completion) => {
      completionMap[completion.workout_id] = true;
    });
    
    res.json(completionMap);
  } catch (error: any) {
    console.error('Error fetching workout completions:', error);
    res.status(500).json({ error: 'Failed to fetch workout completions' });
  }
});

// GET /api/workouts/:workoutId/completion - Get completion status for all exercises
router.get('/:workoutId/completion', (req, res) => {
  try {
    const { workoutId } = req.params;
    const { athleteId } = req.query;
    
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId query parameter is required' });
    }
    
    // Get all exercises in the workout
    const blocks = db.prepare(`
      SELECT * FROM blocks
      WHERE workout_id = ?
      ORDER BY order_index ASC
    `).all(workoutId);
    
    const completionStatus: Record<string, any> = {};
    
    blocks.forEach((block: any) => {
      const exercises = db.prepare(`
        SELECT * FROM block_exercises
        WHERE block_id = ?
        ORDER BY order_index ASC
      `).all(block.id);
      
      exercises.forEach((exercise: any) => {
        // Get total number of sets from exercise_sets table (actual sets, not exercise.sets)
        const totalSetsResult = db.prepare(`
          SELECT COUNT(*) as count FROM exercise_sets
          WHERE block_exercise_id = ? AND workout_id = ? AND athlete_id = ?
        `).get(exercise.id, workoutId, athleteId) as { count: number };
        
        // Get completion data for this exercise
        const completedSets = db.prepare(`
          SELECT COUNT(*) as count FROM exercise_sets
          WHERE block_exercise_id = ? AND workout_id = ? AND athlete_id = ? AND completed = 1
        `).get(exercise.id, workoutId, athleteId) as { count: number };
        
        const totalSets = totalSetsResult.count;
        const completedCount = completedSets.count;
        
        let status: 'completed' | 'in-progress' | 'not-started' = 'not-started';
        if (completedCount === totalSets && totalSets > 0) {
          status = 'completed';
        } else if (completedCount > 0) {
          status = 'in-progress';
        }
        
        completionStatus[exercise.exercise_name] = {
          status,
          completedSets: completedCount,
          totalSets,
        };
      });
    });
    
    res.json(completionStatus);
  } catch (error: any) {
    console.error('Error fetching completion status:', error);
    res.status(500).json({ error: 'Failed to fetch completion status' });
  }
});

// POST /api/workouts/:workoutId/exercises/:exerciseId/notes - Save exercise notes
router.post('/:workoutId/exercises/:exerciseId/notes', (req, res) => {
  try {
    const { workoutId, exerciseId } = req.params;
    const { athleteId, notes } = req.body;
    
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId is required' });
    }
    
    // Verify workout and exercise exist
    const workout: any = db.prepare('SELECT * FROM workouts WHERE id = ?').get(workoutId);
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    const exercise: any = db.prepare('SELECT * FROM block_exercises WHERE id = ?').get(exerciseId);
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    const noteId = `${exerciseId}_${workoutId}_${athleteId}`;
    
    // Use INSERT OR REPLACE to handle both new and existing notes
    db.prepare(`
      INSERT OR REPLACE INTO exercise_notes 
      (id, block_exercise_id, workout_id, athlete_id, notes, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(noteId, exerciseId, workoutId, athleteId, notes || '');
    
    res.json({ success: true, message: 'Notes saved successfully' });
  } catch (error: any) {
    console.error('Error saving exercise notes:', error);
    res.status(500).json({ error: 'Failed to save exercise notes', message: error?.message });
  }
});

// GET /api/workouts/:workoutId/exercises/:exerciseId/notes - Get exercise notes for an athlete
router.get('/:workoutId/exercises/:exerciseId/notes', (req, res) => {
  try {
    const { workoutId, exerciseId } = req.params;
    const { athleteId } = req.query;
    
    if (!athleteId) {
      return res.status(400).json({ error: 'athleteId query parameter is required' });
    }
    
    const note: any = db.prepare(`
      SELECT notes FROM exercise_notes
      WHERE block_exercise_id = ? AND workout_id = ? AND athlete_id = ?
    `).get(exerciseId, workoutId, athleteId);
    
    res.json({ notes: note?.notes || '' });
  } catch (error: any) {
    console.error('Error fetching exercise notes:', error);
    res.status(500).json({ error: 'Failed to fetch exercise notes' });
  }
});

export default router;
