const fs = require('fs');
const lines = fs.readFileSync('public/index.html', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('class="max-h-56 overflow-y-auto'));
const end = lines.findIndex((l, i) => i > start && l.includes('</div>') && lines[i+1].includes('</div>'));
console.log('start', start, 'end', end);
