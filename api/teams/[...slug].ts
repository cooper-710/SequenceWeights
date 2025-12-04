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
  const { slug } = req.query;
  
  // Parse slug array - can be empty [], ['teamId'], ['teamId', 'athletes']
  const slugArray = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const teamId = slugArray[0] || null;
  const isAthletesRoute = slugArray[1] === 'athletes';

  try {
    // Handle GET /api/teams (all teams)
    if (slugArray.length === 0 && req.method === 'GET') {
      const { data: teams, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const teamsWithData = await Promise.all(
        (teams || []).map(async (team: any) => {
          const { data: teamAthletes } = await supabase
            .from('team_athletes')
            .select('athlete_id')
            .eq('team_id', team.id);

          const athleteIds = (teamAthletes || []).map((ta: any) => ta.athlete_id);

          const { data: athletes } = await supabase
            .from('athletes')
            .select('id, name, email, created_at')
            .in('id', athleteIds);

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

      return res.json(teamsWithData);
    }
    
    // Handle POST /api/teams (create team)
    if (slugArray.length === 0 && req.method === 'POST') {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
      }

      const newTeamId = Date.now().toString();

      const { data, error } = await supabase
        .from('teams')
        .insert({
          id: newTeamId,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        id: data.id,
        name: data.name,
        description: data.description,
        createdAt: data.created_at,
        athletes: [],
        workouts: [],
      });
    }

    // Handle routes with team ID
    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    // Handle /api/teams/:id/athletes
    if (isAthletesRoute) {
      if (req.method === 'POST') {
        const { athleteId } = req.body;

        if (!athleteId) {
          return res.status(400).json({ error: 'Athlete ID is required' });
        }

        const { data: team } = await supabase
          .from('teams')
          .select('id')
          .eq('id', teamId)
          .single();

        if (!team) {
          return res.status(404).json({ error: 'Team not found' });
        }

        const { data: athlete } = await supabase
          .from('athletes')
          .select('id')
          .eq('id', athleteId)
          .single();

        if (!athlete) {
          return res.status(404).json({ error: 'Athlete not found' });
        }

        const { data: existing } = await supabase
          .from('team_athletes')
          .select('*')
          .eq('team_id', teamId)
          .eq('athlete_id', athleteId)
          .single();

        if (existing) {
          return res.status(409).json({ error: 'Athlete is already in this team' });
        }

        const { error } = await supabase
          .from('team_athletes')
          .insert({
            team_id: teamId,
            athlete_id: athleteId,
          });

        if (error) throw error;

        return res.status(204).end();
      } else if (req.method === 'DELETE') {
        const athleteId = req.query.athleteId as string || req.body?.athleteId;

        if (!athleteId || typeof athleteId !== 'string') {
          return res.status(400).json({ error: 'Athlete ID is required' });
        }

        const { error } = await supabase
          .from('team_athletes')
          .delete()
          .eq('team_id', teamId)
          .eq('athlete_id', athleteId);

        if (error) throw error;

        return res.status(204).end();
      } else {
        res.setHeader('Allow', ['POST', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
      }
    }

    // Handle /api/teams/:id
    if (req.method === 'GET') {
      const { data: team, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (error || !team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      const { data: teamAthletes } = await supabase
        .from('team_athletes')
        .select('athlete_id')
        .eq('team_id', teamId);

      const athleteIds = (teamAthletes || []).map((ta: any) => ta.athlete_id);

      const { data: athletes } = await supabase
        .from('athletes')
        .select('id, name, email, created_at')
        .in('id', athleteIds.length > 0 ? athleteIds : ['']);

      const { data: workoutRows } = await supabase
        .from('workouts')
        .select('id')
        .eq('team_id', teamId)
        .order('date', { ascending: false });

      const workouts = await Promise.all(
        (workoutRows || []).map((w: any) => getWorkoutWithBlocks(supabase, w.id))
      );

      return res.json({
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
      const { name, description } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;

      if (Object.keys(updates).length === 0) {
        const { data: team } = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
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
        .eq('id', teamId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Team not found' });
        }
        throw error;
      }

      const { data: teamAthletes } = await supabase
        .from('team_athletes')
        .select('athlete_id')
        .eq('team_id', teamId);

      const athleteIds = (teamAthletes || []).map((ta: any) => ta.athlete_id);

      const { data: athletes } = await supabase
        .from('athletes')
        .select('id, name, email, created_at')
        .in('id', athleteIds.length > 0 ? athleteIds : ['']);

      const { data: workoutRows } = await supabase
        .from('workouts')
        .select('id')
        .eq('team_id', teamId)
        .order('date', { ascending: false });

      const workouts = await Promise.all(
        (workoutRows || []).map((w: any) => getWorkoutWithBlocks(supabase, w.id))
      );

      return res.json({
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
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Team not found' });
        }
        throw error;
      }

      return res.status(204).end();
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in teams API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}

