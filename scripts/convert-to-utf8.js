import fs from 'fs';
import path from 'path';
import chardet from 'chardet';
import iconv from 'iconv-lite';

const root = process.cwd();
const skipDirs = new Set(['node_modules', '.git']);
const exts = new Set(['.js','.mjs','.cjs','.json','.html','.css','.md','.txt','.env','.yml','.yaml','.xml','.ejs','.ts','.tsx','.jsx']);

async function* walk(dir){
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for(const ent of entries){
    if(ent.isDirectory()){
      if(skipDirs.has(ent.name)) continue;
      yield* walk(path.join(dir, ent.name));
    } else if(ent.isFile()){
      yield path.join(dir, ent.name);
    }
  }
}

async function convertFile(file){
  const ext = path.extname(file).toLowerCase();
  if(!exts.has(ext)) return false;
  const buf = await fs.promises.readFile(file);
  const detected = chardet.detect(buf);
  if(!detected) return false;
  const enc = String(detected).toUpperCase();
  if(enc.includes('UTF-8') || enc.includes('ASCII') || enc.includes('US-ASCII')) return false;
  try{
    const decoded = iconv.decode(buf, detected);
    await fs.promises.writeFile(file, decoded, { encoding: 'utf8' });
    console.log(`Converted ${file} from ${detected} -> utf8`);
    return true;
  }catch(e){
    console.error(`Failed to convert ${file}:`, e.message);
    return false;
  }
}

(async ()=>{
  console.log('Scanning workspace for text files to convert to UTF-8...');
  let converted = 0;
  for await (const f of walk(root)){
    try{
      const ok = await convertFile(f);
      if(ok) converted++;
    }catch(e){
      // ignore
    }
  }
  console.log(`Done. Converted ${converted} files.`);
})();
