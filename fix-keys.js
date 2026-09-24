const fs = require('fs');
const crypto = require('crypto');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const b64Pub = Buffer.from(publicKey).toString('base64');
const b64Priv = Buffer.from(privateKey).toString('base64');

let env = fs.readFileSync('.env', 'utf8');

// The file currently has JWT_PRIVATE_KEY= and JWT_PUBLIC_KEY=
// We'll replace them using regex
env = env.replace(/JWT_PRIVATE_KEY=.*/, `JWT_PRIVATE_KEY=${b64Priv}`);
env = env.replace(/JWT_PUBLIC_KEY=.*/, `JWT_PUBLIC_KEY=${b64Pub}`);

fs.writeFileSync('.env', env);
console.log('Successfully wrote new keys to .env without quotes');
