import { createReadStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';

// Get current file's directory (ES module equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define constants
const DELIMITER = ',';
const QUOTE = '"';
const NEWLINE = '\n';
const CARRIAGE_RETURN = '\r';
const CHUNK_SIZE = 4 * 2 ** 20; // 4MB
const ENCODING = 'utf8';

const LF = NEWLINE.charCodeAt(0);
const CR = CARRIAGE_RETURN.charCodeAt(0);
const QUOTE_CHAR_CODE = QUOTE.charCodeAt(0);

// Function to parse a CSV line into an array of values
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (const char of line) {
    if (char === QUOTE) {
      inQuotes = !inQuotes;
    } else if (char === DELIMITER && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last value
  values.push(current);
  return values;
}

// Main function to parse and log the CSV file
async function parseAndLogCsv(filePath: string): Promise<void> {
  const fullPath = resolve(__dirname, '..', filePath);
  
  // Create a readable stream with specified chunk size
  const stream = createReadStream(fullPath, {
    highWaterMark: CHUNK_SIZE, // Controls maximum chunk size in bytes
    flags: 'r',  // Read-only mode
    encoding: undefined // Get Buffer objects instead of strings
  });

  let chunksCount = 0;
  let headers: string[] = [];
  let isFirstChunk = true;

  // Store incomplete line from previous buffer
  let remainderBuffer: Buffer = Buffer.alloc(0);
  
  for await (const chunk of stream) {
    // Combine with remainder from previous chunk
    const buffer = Buffer.concat([remainderBuffer, chunk as Buffer]);

    const { lines, remainder } = splitLinesFromBuffer(buffer);

    console.log(`${lines.length} lines in chunk ${chunksCount}`);

    // Process headers from the first line if this is the first chunk
    if (isFirstChunk && lines.length > 0) {
      headers = parseCsvLine(lines[0]);
      console.log('Headers:', headers);
      
      // Process remaining lines in the first chunk (skip headers)
      await processBlockOfLines(lines.slice(1), headers);
      isFirstChunk = false;
    } else {
      // Process all complete lines
      await processBlockOfLines(lines, headers);
    }

    // Save the remainder for next chunk
    remainderBuffer = remainder;

    // Increment chunks count
    chunksCount++;
  }

  // Don't forget to process the last line if there's anything left in remainder
  if (remainderBuffer.length > 0) {
    const { lines } = splitLinesFromBuffer(remainderBuffer);
    console.log(`${lines.length} lines in chunk ${chunksCount}`);

    await processBlockOfLines(lines, headers);
    chunksCount++;
  }

  console.log(`Processed ${chunksCount} chunks`);
}

async function processBlockOfLines(lines: string[], headers: string[]) {
  for (const line of lines) {
    const values = parseCsvLine(line);
    
    // If headers exist, create an object mapping headers to values
    if (headers.length > 0) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (index < values.length) {
          row[header] = values[index];
        }
      });
      console.log(row);
    } else {
      console.log(values);
    }
  }

  // Return a Promise that resolves after the timeout
  return new Promise<void>(resolve => {
    setTimeout(() => {
      console.log('Done');
      resolve();
    }, 500);
  });
}

// Modified function that returns both complete lines and remainder
function splitLinesFromBuffer(buffer: Buffer): { 
  lines: string[], 
  remainder: Buffer 
} {
  const lines: string[] = [];
  let lineStart = 0;
  let lastNewLinePos = -1;
  let inQuotes = false;
  let i = 0;
  
  while (i < buffer.length) {
    // Handle escaped quotes (double quotes in CSV)
    if (buffer[i] === QUOTE_CHAR_CODE) {
      inQuotes = !inQuotes;
      
      // Check for escaped quotes (two consecutive quotes)
      if (i + 1 < buffer.length && buffer[i + 1] === QUOTE_CHAR_CODE) {
        i++; // Skip the next quote as it's part of the escape sequence
      }
    }
    
    // Process newlines when not inside quotes
    if (buffer[i] === LF && !inQuotes) {
      // Handle CR+LF (\r\n)
      const end = (i > 0 && buffer[i - 1] === CR) ? i - 1 : i;
      
      // Extract line and add to array
      lines.push(buffer.subarray(lineStart, end).toString(ENCODING));
      
      lineStart = i + 1;
      lastNewLinePos = i;
    }
    
    i++;
  }

  // If we have content after the last newline and quotes are balanced,
  // and it's the only line in the buffer, treat it as a complete line
  if (lastNewLinePos === -1 && !inQuotes && buffer.length > 0) {
    lines.push(buffer.toString(ENCODING));
    return { lines, remainder: Buffer.alloc(0) };
  }
  
  // Extract remainder (incomplete line) as Buffer
  const remainder = buffer.subarray(lastNewLinePos >= 0 ? lastNewLinePos + 1 : lineStart);
  
  return { lines, remainder };
}

// Get file path from command line arguments or use default
const filePath = process.argv[2] || 'samples/users.csv';

// Parse the file
parseAndLogCsv(filePath);
