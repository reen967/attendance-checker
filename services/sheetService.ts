import { Student } from "../types";

/**
 * Fetches and parses a CSV from a public URL (Google Sheets "Publish to web").
 * Expected headers: "Name" (required), "Photo" or "Image" (optional).
 */
export const fetchStudentsFromCsv = async (url: string): Promise<Student[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    
    const text = await response.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    
    if (lines.length < 2) {
      throw new Error("CSV file appears to be empty or missing headers.");
    }

    // Parse headers (first line)
    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    
    // Identify column indices
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('student'));
    const photoIndex = headers.findIndex(h => h.includes('photo') || h.includes('image') || h.includes('pic') || h.includes('url') || h.includes('avatar'));

    if (nameIndex === -1) {
      throw new Error("Could not find a 'Name' column in the CSV. Please ensure the first row contains a header like 'Student Name'.");
    }

    const students: Student[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      
      // Ensure row has enough columns
      if (row[nameIndex]) {
        const name = row[nameIndex].trim();
        if (name) {
          let photoUrl = undefined;
          if (photoIndex !== -1 && row[photoIndex]) {
             photoUrl = processPhotoUrl(row[photoIndex]);
          }
          
          students.push({
            id: crypto.randomUUID(),
            name,
            photoUrl
          });
        }
      }
    }

    return students;
  } catch (error) {
    console.error("CSV Import Error:", error);
    throw error;
  }
};

/**
 * Basic CSV Line parser that handles quoted strings containing commas.
 */
function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
      current = '';
    } else {
      current += char;
    }
  }
  // Push the last field
  result.push(current.trim().replace(/^"|"$/g, ''));
  
  return result;
}

/**
 * Converts Google Drive sharing URLs to direct image display URLs.
 */
function processPhotoUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Regex to capture ID from various Google Drive URL formats
  // 1. https://drive.google.com/file/d/FILE_ID/view...
  // 2. https://drive.google.com/open?id=FILE_ID
  // 3. https://drive.google.com/uc?id=FILE_ID...
  const driveRegex = /drive\.google\.com.*(?:id=|\/d\/)([a-zA-Z0-9_-]+)/;
  
  const match = trimmed.match(driveRegex);
  
  if (match && match[1]) {
    // Return the export=view URL which works in <img src> tags
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  
  return trimmed;
}