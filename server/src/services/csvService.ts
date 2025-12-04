import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve CSV path relative to server root
const csvPath = path.resolve(__dirname, '../../data/Lifts+Mobility.csv');

export interface Exercise {
  id: string;
  name: string;
  videoUrl?: string;
  category?: string;
  instructions?: string;
}

// Read exercises from CSV
export async function readExercisesFromCSV(): Promise<Exercise[]> {
  try {
    const fileContent = await fs.readFile(csvPath, 'utf-8');
    
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Allow rows with fewer columns
    }) as Array<{ 'Exercise Name': string; 'Video URL'?: string }>;

    return records.map((record, index) => ({
      id: (index + 1).toString(),
      name: record['Exercise Name'] || '',
      videoUrl: record['Video URL'] || undefined,
      category: undefined, // CSV doesn't have categories
      instructions: undefined, // CSV doesn't have instructions
    }));
  } catch (error) {
    console.error('Error reading CSV file:', error);
    throw new Error('Failed to read exercises from CSV');
  }
}

// Write exercises to CSV
export async function writeExercisesToCSV(exercises: Exercise[]): Promise<void> {
  try {
    // Convert exercises to CSV format
    const records = exercises.map(exercise => ({
      'Exercise Name': exercise.name,
      'Video URL': exercise.videoUrl || '',
    }));

    // Add header row
    const csvData = stringify(records, {
      header: true,
      columns: ['Exercise Name', 'Video URL'],
    });

    await fs.writeFile(csvPath, csvData, 'utf-8');
  } catch (error) {
    console.error('Error writing CSV file:', error);
    throw new Error('Failed to write exercises to CSV');
  }
}

// Get CSV file path (for verification)
export function getCSVPath(): string {
  return csvPath;
}
