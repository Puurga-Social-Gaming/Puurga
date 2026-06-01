const fs = require('fs');

const content = fs.readFileSync('src/pages/Home.tsx', 'utf-8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('{/* Mobile Sidebar Drawer */}'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('</button>') && lines[i-1].includes('ChevronRight'));

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find block bounds');
  process.exit(1);
}

// Cut the block
const block = lines.splice(startIndex, endIndex - startIndex + 1);

// Find insert point
const insertIndex = lines.findIndex(l => l.includes('{/* Floating Create Post Button */}'));
lines.splice(insertIndex, 0, ...block);

fs.writeFileSync('src/pages/Home.tsx', lines.join('\n'));
console.log('Successfully moved the drawer and toggle button.');
