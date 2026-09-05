import fs from 'fs';

const html = fs.readFileSync('all_branches.html', 'utf8');
const regex = /<p class="fw-semibold fs-17 mb-0 text-default">(.*?)<\/p>/g;
const matches = [...html.matchAll(regex)];

const branches = matches.map(m => m[1]?.trim()).filter(m => m);

console.log(`Found ${branches.length} branches:`);
console.log(JSON.stringify(branches));
