import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase';
import { handleCors, setCorsHeaders } from '../_helpers/cors';

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

  try {
    if (req.method === 'GET') {
      // Get all teams with their athletes and workouts
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const teamsWithData = await Promise.all(
        (teams || []).map(async (team: any) => {
          // Get athletes for this team
          const { data: teamAthletes } = await supabase
            .from('team_athletes')
            .select('athlete_id')
            .eq('team_id', team.id);

          const athleteIds = (teamAthletes || []).map((ta: any) => ta.athlete_id);

          const { data: athletes } = await supabase
            .from('athletes')
            .select('id, name, email, created_at')
            .in('id', athleteIds);

          // Get workouts for this team
          const { data: workoutRows } = await supabase
            .from('workouts')
            .select('id')
            .eq('team_id', team.id)
            .order('date', { ascending: false });

          const workouts = await Promise.all(
            (workoutRows || []).map((w: any) => getWorkoutWithBlocks(supabase, w.id))
          );

          return {
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
          };
        })
      );

      res.json(teamsWithData);
    } else if (req.method === 'POST') {
      // Create new team
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
      }

      const teamId = Date.now().toString();

      const { data, error } = await supabase
        .from('teams')
        .insert({
          id: teamId,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        id: data.id,
        name: data.name,
        description: data.description,
        createdAt: data.created_at,
        athletes: [],
        workouts: [],
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in teams API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
