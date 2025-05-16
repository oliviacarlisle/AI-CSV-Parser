import { generateLargeCsv } from './csvGenerator.js';

// Get the number of rows from command line argument, default to 10000
const numRows = process.argv[2] ? parseInt(process.argv[2]) : 1000;

console.log(`Generating CSV with ${numRows} rows...`);
const filePath = generateLargeCsv(numRows);
console.log(`CSV generation complete. File saved at: ${filePath}`); 