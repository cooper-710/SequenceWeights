import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function convertCSV() {
  try {
    // Input and output file paths (relative to project root)
    const projectRoot = path.join(__dirname, '..');
    const inputPath = path.join(projectRoot, 'server/data/Lifts+Mobility.csv');
    const outputPath = path.join(projectRoot, 'exercises_import.csv');

    console.log('Reading CSV file from:', inputPath);
    
    // Read the original CSV file
    const fileContent = await fs.readFile(inputPath, 'utf-8');
    
    // Parse CSV with proper handling of commas in values
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Array<{ 'Exercise Name': string; 'Video URL'?: string }>;

    console.log(`Found ${records.length} exercises to convert`);

    // Convert to Supabase format
    const supabaseRecords = records.map((record, index) => {
      const exerciseName = record['Exercise Name']?.trim() || '';
      const videoUrl = record['Video URL']?.trim() || '';

      return {
        id: (index + 1).toString(),
        name: exerciseName,
        video_url: videoUrl || '', // Empty string instead of null for CSV
      };
    });

    // Convert to CSV format with proper headers
    const csvOutput = stringify(supabaseRecords, {
      header: true,
      columns: ['id', 'name', 'video_url'],
      quoted: true, // Quote fields to handle commas in exercise names
      quoted_empty: false,
    });

    // Write the converted CSV
    await fs.writeFile(outputPath, csvOutput, 'utf-8');

    console.log(`\n✅ Success! Converted CSV saved to: ${outputPath}`);
    console.log(`   Total exercises: ${supabaseRecords.length}`);
    console.log(`\nYou can now upload 'exercises_import.csv' to Supabase!`);
    console.log(`   File location: ${path.resolve(outputPath)}`);

  } catch (error: any) {
    console.error('❌ Error converting CSV:', error.message);
    console.error(error);
    process.exit(1);
  }
}

convertCSV();
