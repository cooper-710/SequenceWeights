import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../../_helpers/cors.js';

// Helper function to slugify names (matches frontend logic)
function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const supabase = getSupabaseClient();
  const nameSlug = req.query.name as string;

  if (!nameSlug) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    // Get all athletes from Supabase
    const { data: athletes, error: fetchError } = await supabase
      .from('athletes')
      .select('id, name, email');

    if (fetchError) {
      console.error('Error fetching athletes:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch athletes' });
    }

    if (!athletes || athletes.length === 0) {
      return res.status(401).json({ error: 'Athlete not found' });
    }

    // Find athlete by slugified name match
    const athlete = athletes.find(a => {
      const slug = slugifyName(a.name);
      return slug === nameSlug.toLowerCase();
    });

    if (!athlete) {
      return res.status(401).json({ error: 'Athlete not found' });
    }

    res.json({
      user: {
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        role: 'user' as const,
      },
    });
  } catch (error: any) {
    console.error('Error in auth by-name API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}

