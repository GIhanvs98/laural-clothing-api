require('dotenv').config();
const { Client } = require('pg');

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    try {
        const res = await client.query('SELECT description, excerpt FROM "LegacyProduct" WHERE description IS NOT NULL LIMIT 1');
        console.log("Legacy Product:", res.rows[0]);
    } finally {
        await client.end();
    }
}
main();
