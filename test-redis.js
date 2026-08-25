const { createClient } = require('redis');
const env = require('fs').readFileSync('.env', 'utf8');
const redisUrlMatch = env.match(/REDIS_URL="([^"]+)"/);
if (!redisUrlMatch) {
  console.log("No REDIS_URL found in .env");
  process.exit(1);
}
const redisUrl = redisUrlMatch[1];
console.log("Connecting to Redis at:", redisUrl.replace(/:[^:@]+@/, ':***@')); // Hide password in log

const client = createClient({ url: redisUrl });
client.on('error', err => console.log('Redis Client Error:', err));

client.connect().then(async () => {
  console.log("Successfully connected to Redis!");
  const ping = await client.ping();
  console.log("PING response:", ping);
  await client.quit();
}).catch(err => {
  console.log("Failed to connect:", err);
});
