import { createReadStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { writeFile } from 'node:fs/promises';

// Load environment variables from .env file
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
async function parseAndLogCsv(filePath: string): Promise<Record<string, string>[]> {
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
  let processedRows: Record<string, string>[] = [];
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
      processedRows.push(...await processBlockOfLines(lines.slice(1), headers));
      isFirstChunk = false;
    } else {
      // Process all complete lines
      processedRows.push(...await processBlockOfLines(lines, headers));
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

    processedRows.push(...await processBlockOfLines(lines, headers));
    chunksCount++;
  }

  console.log(`Processed ${chunksCount} chunks`);

  return processedRows;
}

async function processBlockOfLines(lines: string[], headers: string[]) {
  const processedRows: Record<string, string>[] = [];

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
      processedRows.push(row);
    } else {
      console.error('No headers found');
    }
  }

  const postAIProcessedRows = await postProcessRows(processedRows);

  return postAIProcessedRows;
}

async function postProcessRows(rows: Record<string, string>[]) {
  
  const phoneNumbers = [];
  const addresses = [];

  for (const row of rows) {
    phoneNumbers.push(cleanPhoneNumber(row.phone));
    addresses.push(cleanAddress(row.address));
  }

  const startTime = Date.now();
  const phoneResponse = await Promise.all(phoneNumbers);
  const addressResponse = await Promise.all(addresses);
  const endTime = Date.now();
  const elapsedTime = (endTime - startTime) / 1000;
  console.log(`Time taken: ${elapsedTime} seconds`);
  console.log(`Rows Processed: ${phoneNumbers.length}`);

  const totalPromptTokens = phoneResponse.reduce((acc, curr) => acc + (curr?.promptTokens ?? 0), 0) + addressResponse.reduce((acc, curr) => acc + (curr?.promptTokens ?? 0), 0);
  const totalCompletionTokens = phoneResponse.reduce((acc, curr) => acc + (curr?.completionTokens ?? 0), 0) + addressResponse.reduce((acc, curr) => acc + (curr?.completionTokens ?? 0), 0);
  console.log(`Total prompt tokens: ${totalPromptTokens}`);
  console.log(`Total completion tokens: ${totalCompletionTokens}`);

  console.log('TPM: ', (totalPromptTokens + totalCompletionTokens) / elapsedTime * 60);
  console.log('RPM: ', (phoneNumbers.length + addresses.length) / elapsedTime * 60);

  const processedRows = rows.map((row, index) => {
    delete row.address;
    return { ...row, ...addressResponse[index]?.cleanedDataAddress, ...phoneResponse[index]?.cleanedDataPhone };
  });

  return processedRows;
}

async function cleanPhoneNumber(phoneNumber: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    temperature: 0,
    response_format: { 
      type: "json_schema",
      json_schema: {
        name: "phone_number_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            phone: {
              type: "string",
              description: "The cleaned phone number in E.164 international format (e.g. +12125551234) or null if invalid"
            }
          },
          required: ["phone"],
          additionalProperties: false
        }
      }
    },
    messages: [
      { role: 'system', content: 'You are a helpful assistant that cleans phone numbers. Format numbers as standardized E.164 international format when possible (e.g. +12125551234). If the number is invalid or cannot be parsed, return null for the phone field.' },
      { role: 'user', content: `Clean this phone number: ${phoneNumber || ""}` }
    ],
  });

  try {
    const content = response.choices[0].message.content || '{"phone": null}';
    // Log token usage for this request
    const tokensUsed = response.usage;
    // console.log(`Phone number cleaning tokens:
    //   Input: ${tokensUsed?.prompt_tokens}
    //   Output: ${tokensUsed?.completion_tokens} 
    //   Cached: ${tokensUsed?.prompt_tokens_details?.cached_tokens || 0}
    //   Total: ${tokensUsed?.total_tokens}`);
    const cleanedDataPhone = JSON.parse(content);
    return { cleanedDataPhone, promptTokens: tokensUsed?.prompt_tokens, completionTokens: tokensUsed?.completion_tokens };
  } catch (error) {
    console.error('Error parsing JSON response from OpenAI:', error);
  }

  return null
}

async function cleanAddress(address: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-nano',
    temperature: 0,
    response_format: { 
      type: "json_schema",
      json_schema: {
        name: "address_response",
        strict: true,
        schema: {
          type: "object",
          properties: {
            streetAddress: {
              type: ["string", "null"],
              description: "The extracted street address (e.g. 123 Main St)"
            },
            city: {
              type: ["string", "null"],
              description: "The extracted city (e.g. San Francisco)"
            },
            state: {
              type: ["string", "null"],
              description: "The extracted state (e.g. CA)"
            },
            zipCode: {
              type: ["string", "null"],
              description: "The extracted zip code (e.g. 94101)"
            }
          },
          required: ["streetAddress", "city", "state", "zipCode"],
          additionalProperties: false
        }
      }
    },
    messages: [
      { role: 'system', content: 'You are a helpful assistant that extracts information from addresses. Return the street address, city, state, and zip code in a JSON object. If any of the fields cannot be parsed, return null for that field.' },
      { role: 'user', content: `Extract the street address, city, state, and zip code from the following address: ${address || ""}` }
    ],
  });

  try {
    const content = response.choices[0].message.content || '{"streetAddress": null, "city": null, "state": null, "zipCode": null}';
    const cleanedDataAddress = JSON.parse(content);
    const tokensUsed = response.usage;
    // console.log(`Address cleaning tokens:
    //   Input: ${tokensUsed?.prompt_tokens}
    //   Output: ${tokensUsed?.completion_tokens} 
    //   Cached: ${tokensUsed?.prompt_tokens_details?.cached_tokens || 0}
    //   Total: ${tokensUsed?.total_tokens}`);
    return { cleanedDataAddress, promptTokens: tokensUsed?.prompt_tokens, completionTokens: tokensUsed?.completion_tokens };
  } catch (error) {
    console.error('Error parsing JSON response from OpenAI:', error);
  }

  return null;
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
// Get output file path from command line arguments or use default
const outputFilePath = process.argv[3] || 'output.json';

// Parse the file
const processedRows = await parseAndLogCsv(filePath);

// Write the processed rows to the output file
try {
  await writeFile(outputFilePath, JSON.stringify(processedRows, null, 2));
  console.log(`Successfully wrote data to ${outputFilePath}`);
} catch (error) {
  console.error(`Error writing to file: ${error}`);
}
