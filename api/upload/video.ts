import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase';
import { handleCors, setCorsHeaders } from '../_helpers/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();

  try {
    if (req.method === 'POST') {
      // Handle video upload
      // Note: For file uploads in Vercel serverless functions, you typically need to:
      // 1. Use a form-data parser like `formidable` or `multiparty`
      // 2. Or use Supabase Storage client-side upload with a signed URL
      
      // For now, we'll accept the file data in the request body
      // In production, you'd want to use Supabase Storage directly from the client
      // or use a proper multipart form parser
      
      const { file, filename } = req.body;

      if (!file || !filename) {
        return res.status(400).json({ error: 'File and filename are required' });
      }

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExt = filename.split('.').pop();
      const baseName = filename.replace(/\.[^/.]+$/, '');
      const uniqueFilename = `${baseName}-${uniqueSuffix}.${fileExt}`;

      // Upload to Supabase Storage
      const bucketName = 'videos'; // You'll need to create this bucket in Supabase
      
      // Convert base64 to buffer if needed
      const fileBuffer = Buffer.from(file, 'base64');

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(uniqueFilename, fileBuffer, {
          contentType: req.headers['content-type'] || 'video/mp4',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(uniqueFilename);

      res.json({
        success: true,
        videoUrl: urlData.publicUrl,
        filename: uniqueFilename,
        originalName: filename,
        size: fileBuffer.length,
      });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: error.message || 'Failed to upload video' });
  }
}

// Note: For proper file upload handling, consider using:
// 1. Client-side upload directly to Supabase Storage with signed URLs
// 2. Or use Vercel's file upload handling with a library like `formidable`
