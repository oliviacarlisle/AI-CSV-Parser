# CSV-Parser

A streaming CSV parser library for Node.js written in TypeScript. Designed to efficiently process large CSV files without loading the entire dataset into memory.

** Note: this is a prototype/work in progress, not for production use **

## Features

- Efficient streaming processing of CSV files
- Handles files of any size with constant memory usage
- Properly handles quoted fields with embedded commas and newlines
- Converts CSV rows to objects using header fields as keys
- Processes data in chunks of configurable size (default 4MB)
- Written in TypeScript with full type safety

## Usage

```typescript
// Import the parser
import { parseAndLogCsv } from './dist/index.js';

// Parse a CSV file (path is relative to the project root)
parseAndLogCsv('path/to/your/file.csv');
```

## Implementation Details

The parser uses Node.js streams to read files in chunks, maintaining a small memory footprint even for very large files. It:

1. Reads the file in configurable chunks (default 4MB)
2. Correctly handles line breaks within quoted fields
3. Preserves incomplete lines between chunks
4. Uses the first row as headers to create structured objects

## License

MIT
