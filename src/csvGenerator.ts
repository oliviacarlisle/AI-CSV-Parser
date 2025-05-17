import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates a large CSV file with random data
 * @param numLines Number of rows to generate
 * @param outputPath Optional custom output path
 * @param batchSize Number of rows to process in each batch (default: 10000)
 * @returns Path to the generated file
 */
export function generateLargeCsv(
  numLines: number, 
  outputPath?: string, 
  batchSize: number = 100000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const filePath = outputPath || path.join(process.cwd(), `random_data_${numLines}_rows.csv`);
    
    // CSV header
    const header = 'name,age,email,address,phone\n';
    
    // Open write stream
    const writeStream = fs.createWriteStream(filePath);
    writeStream.write(header);
    
    let rowsWritten = 0;
    let isWriting = false;
    
    // Process function to handle batches
    function processBatch() {
      if (rowsWritten >= numLines) {
        // We're done
        writeStream.end();
        console.log(`CSV file with ${numLines} rows generated at: ${filePath}`);
        resolve(filePath);
        return;
      }
      
      if (isWriting) {
        // Wait for current write to finish
        return;
      }
      
      isWriting = true;
      let batch = '';
      const batchEnd = Math.min(rowsWritten + batchSize, numLines);
      
      // Generate the current batch
      for (let i = rowsWritten; i < batchEnd; i++) {
        const name = generateRandomName();
        const age = generateRandomAge();
        const email = generateRandomEmail(name);
        const address = generateRandomAddress();
        const phone = generateRandomPhoneNumber();
        
        batch += `${name},${age},${email},"${address}","${phone}"\n`;
      }
      
      // Log progress for large files
      if (numLines > 100000 && (batchEnd % 1000000 === 0 || batchEnd === numLines)) {
        console.log(`Generated ${batchEnd} rows...`);
      }
      
      // Check if the stream can accept more data
      const canContinue = writeStream.write(batch);
      rowsWritten = batchEnd;
      
      // If the buffer is full, wait for it to drain
      if (!canContinue) {
        isWriting = false;
        writeStream.once('drain', () => {
          isWriting = false;
          processBatch();
        });
      } else {
        // Continue with the next batch
        isWriting = false;
        // Use setImmediate to prevent call stack overflow
        setImmediate(processBatch);
      }
    }
    
    // Handle errors
    writeStream.on('error', (err) => {
      reject(err);
    });
    
    // Start processing
    processBatch();
  });
}

function generateRandomName(): string {
  const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 
    'William', 'Elizabeth', 'David', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah',
    'Thomas', 'Karen', 'Charles', 'Nancy', 'Christopher', 'Lisa', 'Daniel', 'Margaret',
    'Matthew', 'Betty', 'Anthony', 'Sandra', 'Mark', 'Ashley', 'Donald', 'Dorothy',
    'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
    'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Melissa', 'George', 'Deborah'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia',
    'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez',
    'Moore', 'Martin', 'Jackson', 'Thompson', 'White', 'Lopez', 'Lee', 'Gonzalez',
    'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall', 'Young',
    'Allen', 'Sanchez', 'Wright', 'King', 'Scott', 'Green', 'Baker', 'Adams',
    'Nelson', 'Hill', 'Ramirez', 'Campbell', 'Mitchell', 'Roberts', 'Carter',
    'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards', 'Stewart'
  ];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
}

function generateRandomAge(): number {
  // Random age between 18 and 90
  return Math.floor(Math.random() * 73) + 18;
}

function generateRandomEmail(name: string): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'example.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  // Convert name to email format (lowercase, no spaces, may add numbers)
  let emailName = name.toLowerCase().replace(/\s+/g, '.');
  
  // Occasionally add random numbers
  if (Math.random() > 0.7) {
    emailName += Math.floor(Math.random() * 100);
  }
  
  return `${emailName}@${domain}`;
}

function generateRandomAddress(): string {
  // Street numbers
  const streetNumber = Math.floor(Math.random() * 9900) + 100;
  
  // Street names
  const streetNames = [
    'Main St', 'Oak Ave', 'Maple Dr', 'Washington Blvd', 'Park Ave', 'Pine St',
    'Cedar Ln', 'Lake St', 'Elm St', 'River Rd', 'Church St', 'High St', 
    'Walnut St', 'Mill Rd', 'Sunset Dr', 'Lincoln Ave', 'Jackson St', 'Highland Ave',
    'Forest Ave', 'Broadway', 'Jefferson Ave', 'Center St', 'College St', 'Spring St',
    'Adams St', 'Madison Ave', 'Cherry St', 'Dogwood Ln', 'Valley Rd', 'Ridge Rd'
  ];
  
  // Cities and states (paired)
  const cityStates = [
    { city: 'New York', state: 'NY' },
    { city: 'Los Angeles', state: 'CA' },
    { city: 'Chicago', state: 'IL' },
    { city: 'Houston', state: 'TX' },
    { city: 'Phoenix', state: 'AZ' },
    { city: 'Philadelphia', state: 'PA' },
    { city: 'San Antonio', state: 'TX' },
    { city: 'San Diego', state: 'CA' },
    { city: 'Dallas', state: 'TX' },
    { city: 'San Jose', state: 'CA' },
    { city: 'Austin', state: 'TX' },
    { city: 'Jacksonville', state: 'FL' },
    { city: 'Fort Worth', state: 'TX' },
    { city: 'Columbus', state: 'OH' },
    { city: 'Charlotte', state: 'NC' },
    { city: 'San Francisco', state: 'CA' },
    { city: 'Indianapolis', state: 'IN' },
    { city: 'Seattle', state: 'WA' },
    { city: 'Denver', state: 'CO' },
    { city: 'Boston', state: 'MA' }
  ];
  
  const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
  const cityState = cityStates[Math.floor(Math.random() * cityStates.length)];
  const zipCode = (Math.floor(Math.random() * 89999) + 10000).toString();
  
  return `${streetNumber} ${streetName}, ${cityState.city}, ${cityState.state} ${zipCode}`;
}

function generateRandomPhoneNumber(): string {
  // Generate random 10-digit US phone number
  const areaCode = Math.floor(Math.random() * 900) + 100; // 100-999
  const prefix = Math.floor(Math.random() * 900) + 100;   // 100-999
  const lineNumber = Math.floor(Math.random() * 10000);   // 0-9999
  const lineNumberFormatted = lineNumber.toString().padStart(4, '0');
  
  // Different format styles with varying probabilities
  const formatStyle = Math.random();
  
  if (formatStyle < 0.25) {
    // (555) 123-4567
    return `(${areaCode}) ${prefix}-${lineNumberFormatted}`;
  } else if (formatStyle < 0.5) {
    // 555-123-4567
    return `${areaCode}-${prefix}-${lineNumberFormatted}`;
  } else if (formatStyle < 0.7) {
    // 5551234567 (no formatting)
    return `${areaCode}${prefix}${lineNumberFormatted}`;
  } else if (formatStyle < 0.85) {
    // 555.123.4567
    return `${areaCode}.${prefix}.${lineNumberFormatted}`;
  } else {
    // +1 555 123 4567
    return `+1 ${areaCode} ${prefix} ${lineNumberFormatted}`;
  }
}

// Example usage:
// generateLargeCsv(1000000); // Generate 1 million rows
