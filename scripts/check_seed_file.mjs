import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async ()=>{
  const txt = await fs.readFile(path.join(__dirname, 'seed.json'), 'utf8');
  const json = JSON.parse(txt);
  console.log('First product_name from seed.json:', json[0].product_name);
})();
