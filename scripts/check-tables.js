require('dotenv').config();
const { Client } = require('pg');

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    try {
        const legacyRes = await client.query(`
            SELECT "name", "featuredImage", "gallery" 
            FROM "LegacyProduct" 
            WHERE "name" ILIKE '%Molly Top%'
            LIMIT 10;
        `);
        console.log("Legacy Molly Top products:");
        console.dir(legacyRes.rows, { depth: null });
        
        const vRes = await client.query(`
            SELECT "name", "featuredImage", "gallery" 
            FROM "ProductVariant" 
            WHERE "name" ILIKE '%Molly Top%'
            LIMIT 10;
        `);
        console.log("Molly Top Variants:");
        console.dir(vRes.rows, { depth: null });
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
