import express from 'express';
import { readExercisesFromCSV, writeExercisesToCSV, Exercise } from '../services/csvService.js';

const router = express.Router();

// GET /api/exercises - Get all exercises
router.get('/', async (req, res) => {
  try {
    const exercises = await readExercisesFromCSV();
    res.json(exercises);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// GET /api/exercises/:id - Get single exercise
router.get('/:id', async (req, res) => {
  try {
    const exercises = await readExercisesFromCSV();
    const exercise = exercises.find(ex => ex.id === req.params.id);
    
    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    res.json(exercise);
  } catch (error) {
    console.error('Error fetching exercise:', error);
    res.status(500).json({ error: 'Failed to fetch exercise' });
  }
});

// POST /api/exercises - Create new exercise
router.post('/', async (req, res) => {
  try {
    const { name, videoUrl, category, instructions } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Exercise name is required' });
    }
    
    const exercises = await readExercisesFromCSV();
    
    // Generate new ID (highest existing ID + 1)
    const maxId = exercises.reduce((max, ex) => {
      const idNum = parseInt(ex.id, 10);
      return idNum > max ? idNum : max;
    }, 0);
    
    const newExercise: Exercise = {
      id: (maxId + 1).toString(),
      name,
      videoUrl: videoUrl || undefined,
      category: category || undefined,
      instructions: instructions || undefined,
    };
    
    exercises.push(newExercise);
    await writeExercisesToCSV(exercises);
    
    res.status(201).json(newExercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// PUT /api/exercises/:id - Update exercise
router.put('/:id', async (req, res) => {
  try {
    const { name, videoUrl, category, instructions } = req.body;
    const exerciseId = req.params.id;
    
    const exercises = await readExercisesFromCSV();
    const exerciseIndex = exercises.findIndex(ex => ex.id === exerciseId);
    
    if (exerciseIndex === -1) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    // Update exercise (note: CSV only stores name and videoUrl)
    exercises[exerciseIndex] = {
      ...exercises[exerciseIndex],
      name: name || exercises[exerciseIndex].name,
      videoUrl: videoUrl !== undefined ? videoUrl : exercises[exerciseIndex].videoUrl,
      category: category !== undefined ? category : exercises[exerciseIndex].category,
      instructions: instructions !== undefined ? instructions : exercises[exerciseIndex].instructions,
    };
    
    await writeExercisesToCSV(exercises);
    
    res.json(exercises[exerciseIndex]);
  } catch (error) {
    console.error('Error updating exercise:', error);
    res.status(500).json({ error: 'Failed to update exercise' });
  }
});

// DELETE /api/exercises/:id - Delete exercise
router.delete('/:id', async (req, res) => {
  try {
    const exerciseId = req.params.id;
    
    const exercises = await readExercisesFromCSV();
    const filteredExercises = exercises.filter(ex => ex.id !== exerciseId);
    
    if (filteredExercises.length === exercises.length) {
      return res.status(404).json({ error: 'Exercise not found' });
    }
    
    // Re-index IDs to be sequential
    const reindexedExercises = filteredExercises.map((ex, index) => ({
      ...ex,
      id: (index + 1).toString(),
    }));
    
    await writeExercisesToCSV(reindexedExercises);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting exercise:', error);
    res.status(500).json({ error: 'Failed to delete exercise' });
  }
});

export default router;
