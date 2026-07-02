/**
 * One-time cleanup script: removes the orphaned hardcoded events array from Events.js
 * Run: node cleanup_events.js
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'components', 'Events.js');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the line with 'const isValidObjectId'
const validObjectIdLine = lines.findIndex(l => l.includes('const isValidObjectId'));
console.log('isValidObjectId found at line:', validObjectIdLine + 1);

// Keep lines 0-8 (imports + comment) + lines from isValidObjectId onwards
const keepTop = lines.slice(0, 9); // lines 0-8: imports + comment
const keepBottom = lines.slice(validObjectIdLine); // from isValidObjectId to end

const result = [...keepTop, '', ...keepBottom].join('\n');
fs.writeFileSync(filePath, result, 'utf8');

const newLines = result.split('\n');
console.log(`Done! File reduced from ${lines.length} to ${newLines.length} lines`);
console.log('Lines 1-15 of cleaned file:');
newLines.slice(0, 15).forEach((l, i) => console.log(`${i+1}: ${l}`));
