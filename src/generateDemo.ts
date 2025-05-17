import { generateLargeCsv } from './csvGenerator.js';

// Get the number of rows from command line argument, default to 10000
const numRows = process.argv[2] ? parseInt(process.argv[2]) : 1000;

console.log(`Generating CSV with ${numRows} rows...`);
const startTime = Date.now();
const filePath = generateLargeCsv(numRows);
const endTime = Date.now();
const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);
console.log(`CSV generation complete in ${elapsedSeconds} seconds. File saved at: ${filePath}`); 