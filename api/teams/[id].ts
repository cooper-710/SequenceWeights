import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';

async function getWorkoutWithBlocks(supabase: any, workoutId: string) {
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (workoutError || !workout) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('*')
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: true });

  if (blocksError) throw blocksError;

  const blocksWithExercises = await Promise.all(
    (blocks || []).map(async (block: any) => {
      const { data: exercises, error: exercisesError } = await supabase
        .from('block_exercises')
        .select('*')
        .eq('block_id', block.id)
        .order('order_index', { ascending: true });

      if (exercisesError) throw exercisesError;

      return {
        id: block.id,
        name: block.name,
        exercises: (exercises || []).map((ex: any) => ({
          id: ex.id,
          exerciseName: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight || undefined,
        })),
      };
    })
  );

  return {
    id: workout.id,
    name: workout.name,
    date: workout.date,
    athleteId: workout.athlete_id || undefined,
    teamId: workout.team_id || undefined,
    blocks: blocksWithExercises,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Team ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get single team
      const { data: team, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Get athletes
      const { data: teamAthletes } = await supabase
        .from('team_athletes')
        .select('athlete_id')
        .eq('team_id', id);

      const athleteIds = (teamAthletes || []).map((ta: any) => ta.athlete_id);

      const { data: athletes } = await supabase
        .from('athletes')
        .select('id, name, email, created_at')
        .in('id', athleteIds.length > 0 ? athleteIds : ['']);

      // Get workouts
      const { data: workoutRows } = await supabase
        .from('workouts')
        .select('id')
        .eq('team_id', id)
        .order('date', { ascending: false });

      const workouts = await Promise.all(
        (workoutRows || []).map((w: any) => getWorkoutWithBlocks(supabase, w.id))
      );

      res.json({
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.created_at,
        athletes: (athletes || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          createdAt: a.created_at,
        })),
        workouts: workouts.filter(Boolean),
      });
    } else if (req.method === 'PUT') {
      // Update team
      const { name, description } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      if (Object.keys(updates).length === 0) {
        // No updates, just return existing team
        const { data: team } = await supabase
          .from('teams')
          .select('*')
          .eq('id', id)
          .single();

        if (!team) {
          return res.status(404).json({ error: 'Team not found' });
        }

        return res.json({
          id: team.id,
          name: team.name,
          description: team.description,
          createdAt: team.created_at,
          athletes: [],
          workouts: [],
        });
      }

      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Team not found' });
        }
        throw error;
      }

      // Get athletes and workouts
      const { data: teamAthletes } = await supabase
        .from('team_athletes')
        .select('athlete_id')
        .eq('team_id', id);

      const athleteIds = (teamAthletes || []).map((ta: any) => ta.athlete_id);

      const { data: athletes } = await supabase
        .from('athletes')
        .select('id, name, email, created_at')
        .in('id', athleteIds.length > 0 ? athleteIds : ['']);

      const { data: workoutRows } = await supabase
        .from('workouts')
        .select('id')
        .eq('team_id', id)
        .order('date', { ascending: false });

      const workouts = await Promise.all(
        (workoutRows || []).map((w: any) => getWorkoutWithBlocks(supabase, w.id))
      );

      res.json({
        id: data.id,
        name: data.name,
        description: data.description,
        createdAt: data.created_at,
        athletes: (athletes || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          createdAt: a.created_at,
        })),
        workouts: workouts.filter(Boolean),
      });
    } else if (req.method === 'DELETE') {
      // Delete team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Team not found' });
        }
        throw error;
      }

      res.status(204).end();
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in team API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
