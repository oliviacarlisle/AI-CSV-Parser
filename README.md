# CSV-Parser

A AI-powered streaming CSV parser library for Node.js written in TypeScript. Designed to efficiently process and transform large CSV files using AI without loading the entire dataset into memory.

> **⚠️ Note:** This is a prototype/work in progress, not for production use

## Features

- Efficient streaming processing of CSV files
- Handles files of any size with constant memory usage
- Properly handles quoted fields with embedded commas and newlines
- Converts CSV rows to objects using header fields as keys
- Processes data in chunks of configurable size (default 4MB)
- Written in TypeScript with full type safety
- Uses OpenAI GPT-4.1 nano model to:
  - Clean and format phone numbers to E.164 international format
  - Parse and structure addresses into components (street, city, state, zip)

> 🚀 **Why GPT-4.1 nano?**  
> GPT-4.1 nano is specifically chosen for its exceptional cost-efficiency and ultra-low latency. This makes it ideal for cleaning and structuring CSV data on the fly, providing AI-powered transformations without the high costs or latency typically associated with larger language models.

## Performance Optimizations

- **Parallel Processing**: Each chunk of CSV data is processed concurrently using `Promise.all()`
- **Batched API Calls**: All rows in a chunk are sent to GPT-4.1 nano simultaneously to minimize API latency
- **Stream Processing**: Data is processed in chunks to maintain constant memory usage regardless of file size
- **Efficient Tokenization**: CSV rows are pre-processed to minimize token usage in API calls

> 💡 **Performance Impact**  
> By processing all rows in a chunk in parallel, we achieve exponentially faster processing compared to sequential processing. Benchmarks coming soon.

## Usage

```bash
# Basic usage with default files
npm install
npm start

# Specify input and output files
npm start -- path/input.csv path/output.json
```

Or programmatically:

```typescript
// Import the parser
import { parseAndLogCsv } from './dist/index.js';

// Parse a CSV file and get the processed data
const cleanData = await parseAndLogCsv('path/to/your/file.csv');
```

### CSV Generation

The project includes a utility for generating random CSV files for testing:

```bash
# Generate a CSV file with 10000 rows
npm run generate-csv 10000
```

This will create CSV files with random:
- Names
- Ages (18-90)
- Email addresses
- Physical addresses (with proper formatting for street, city, state, and zip)
- Phone numbers (in various formats, perfect for testing the AI cleaning)

> Note: Each row is approximately 95–100 bytes in size, on average.

### OpenAI Integration

The parser uses OpenAI's API to clean data. To use this feature:

1. Create a `.env` file in the project root with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

2. The parser will automatically:
   - Format phone numbers to E.164 international format using the GPT-4.1 nano model
   - Parse addresses into structured components (street address, city, state, zip code)

## Example Transformation

### Input (messy CSV data)

Here's an example from `samples/users.csv`:

```csv
name,age,email,address,phone
Ashley Campbell,22,ashley.campbell@outlook.com,"1119 Church St, Jacksonville, FL 64406","6688640751"
Thomas Adams,85,thomas.adams@example.com,"9080 College St, Denver, CO 17491","(570) 122-8759"
Kevin White,31,kevin.white51@outlook.com,"9981 Pine St, San Diego, CA 57433","+1 146 610 3974"
Daniel Mitchell,45,daniel.mitchell@example.com,"5455 Sunset Dr, Austin, TX 47461","891-852-4224"
```

### Output (clean structured JSON)

The parser transforms this messy data into clean, structured JSON:

```json
[
  {
    "name": "Ashley Campbell",
    "age": "22",
    "email": "ashley.campbell@outlook.com",
    "phone": "+16688640751",
    "streetAddress": "1119 Church St",
    "city": "Jacksonville",
    "state": "FL",
    "zipCode": "64406"
  },
  {
    "name": "Thomas Adams",
    "age": "85", 
    "email": "thomas.adams@example.com",
    "phone": "+15701228759",
    "streetAddress": "9080 College St",
    "city": "Denver",
    "state": "CO",
    "zipCode": "17491"
  },
  {
    "name": "Kevin White",
    "age": "31",
    "email": "kevin.white51@outlook.com",
    "phone": "+11466103974",
    "streetAddress": "9981 Pine St",
    "city": "San Diego",
    "state": "CA",
    "zipCode": "57433"
  },
  {
    "name": "Daniel Mitchell",
    "age": "45",
    "email": "daniel.mitchell@example.com",
    "phone": "+18918524224",
    "streetAddress": "5455 Sunset Dr",
    "city": "Austin",
    "state": "TX",
    "zipCode": "47461"
  }
]
```

Note how the parser:
- Standardizes all phone numbers to E.164 format with country code
- Extracts address components into separate fields
- Maintains all other data as provided in the input

## Implementation Details

The parser uses Node.js streams to read files in chunks, maintaining a small memory footprint even for very large files. It:

1. Reads the file in configurable chunks (default 4MB)
2. Correctly handles line breaks within quoted fields
3. Preserves incomplete lines between chunks
4. Uses the first row as headers to create structured objects
5. Sends processed rows to OpenAI for data cleaning and structuring
6. Writes the cleaned data to a JSON output file

## License

MIT
