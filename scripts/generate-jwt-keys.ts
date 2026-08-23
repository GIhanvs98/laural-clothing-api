import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function generateKeys() {
  console.log('Generating RS256 Key Pair...');

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Convert to Base64 to avoid multiline issues in .env
  const base64PublicKey = Buffer.from(publicKey).toString('base64');
  const base64PrivateKey = Buffer.from(privateKey).toString('base64');

  console.log('\n--- BASE64 ENCODED PRIVATE KEY (JWT_PRIVATE_KEY) ---');
  console.log(base64PrivateKey);
  console.log('\n--- BASE64 ENCODED PUBLIC KEY (JWT_PUBLIC_KEY) ---');
  console.log(base64PublicKey);
  console.log('\nKeys generated successfully. You can copy the base64 strings into your .env file.\n');

  // Optionally attempt to append to .env file if it exists and keys are missing
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    let appended = false;
    
    if (!envContent.includes('JWT_PRIVATE_KEY=')) {
      envContent += `\nJWT_PRIVATE_KEY="${base64PrivateKey}"`;
      appended = true;
    }
    
    if (!envContent.includes('JWT_PUBLIC_KEY=')) {
      envContent += `\nJWT_PUBLIC_KEY="${base64PublicKey}"\n`;
      appended = true;
    }

    if (appended) {
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('Successfully appended keys to .env file.');
    } else {
      console.log('.env file already contains JWT_PRIVATE_KEY or JWT_PUBLIC_KEY.');
    }
  }
}

generateKeys();
