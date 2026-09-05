import fs from 'fs';

const html = fs.readFileSync('all_branches.html', 'utf8');
const regex = /<h5[^>]*>([\s\S]*?)<\/h5>/g;
const matches = [...html.matchAll(regex)];

const branches = matches.map(m => m[1]?.trim()).filter(m => m && !m.includes('Find your nearest'));

console.log(`Found ${branches.length} branches:`);
console.log(branches.slice(0, 10).join(', '));
console.log('...');
console.log(branches.slice(-10).join(', '));
