/* Sign JWT avec jsonwebtoken pour garantir un token valide (HMAC-SHA256 + secret du projet) */
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

// Lit .env depuis la racine du backend (où index.ts le lit lui aussi via dotenv.config()).
// __dirname = backend/src/modules/migration, donc ../../../.env = backend/.env
const dotenvPath = path.resolve(__dirname, '../../../.env');
const envContent = fs.existsSync(dotenvPath) ? fs.readFileSync(dotenvPath, 'utf8') : '';
const jwtSecret = (envContent.match(/JWT_SECRET="?([^"\n]+)"?/) || [])[1] || 'fallback';
console.log('JWT_SECRET len=', jwtSecret.length, ' start=', jwtSecret.slice(0, 10));

const token = jwt.sign(
  { userId: 'f1b42ff0-8e38-48ab-89b7-2c20f4b35292', role: 'ADMIN' },
  jwtSecret,
  { expiresIn: '1h' }
);
console.log('TOKEN=' + token);
