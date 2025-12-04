import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple CSV parser that handles quoted fields
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Push last value
    
    if (values.length >= 2) {
      records.push({
        'Exercise Name': values[0] || '',
        'Video URL': values[1] || ''
      });
    }
  }
  
  return records;
}

function escapeCSV(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function convertCSV() {
  try {
    const projectRoot = path.join(__dirname, '..');
    const inputPath = path.join(projectRoot, 'server/data/Lifts+Mobility.csv');
    const outputPath = path.join(projectRoot, 'exercises_import.csv');

    console.log('Reading CSV file from:', inputPath);
    
    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    const records = parseCSV(fileContent);

    console.log(`Found ${records.length} exercises to convert`);

    // Create output CSV
    let output = 'id,name,video_url\n';
    
    records.forEach((record, index) => {
      const id = (index + 1).toString();
      const name = record['Exercise Name'] || '';
      const videoUrl = record['Video URL'] || '';
      
      output += `${id},${escapeCSV(name)},${escapeCSV(videoUrl)}\n`;
    });

    fs.writeFileSync(outputPath, output, 'utf-8');

    console.log(`\n✅ Success! Converted CSV saved to: ${outputPath}`);
    console.log(`   Total exercises: ${records.length}`);
    console.log(`\nYou can now upload 'exercises_import.csv' to Supabase!`);
    console.log(`   File location: ${path.resolve(outputPath)}`);

  } catch (error) {
    console.error('❌ Error converting CSV:', error.message);
    console.error(error);
    process.exit(1);
  }
}

convertCSV();
