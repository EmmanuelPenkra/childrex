import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'apps/web/public/assets');
await mkdir(path.join(out, 'cards'), { recursive: true });
await mkdir(path.join(out, 'avatars'), { recursive: true });

const ranks = [['A','ace'],['2','2'],['3','3'],['4','4'],['5','5'],['6','6'],['7','7'],['8','8'],['9','9'],['T','10'],['J','jack'],['Q','queen'],['K','king']];
const suits = [['S','spades'],['H','hearts'],['D','diamonds'],['C','clubs']];
for (const [rank] of ranks) for (const [suit] of suits) {
  await access(path.join(out, 'cards', `${rank}${suit}.svg`));
}
await access(path.join(out, 'cards/back.svg'));

for (let n = 1; n <= 24; n++) {
  const id = String(n).padStart(2, '0');
  const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=sequence-${id}&backgroundColor=transparent`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Avatar ${id}: ${response.status}`);
  await writeFile(path.join(out, 'avatars', `avataaars-${id}.svg`), await response.text());
}

await access(path.join(out, 'CARD_ASSET_LICENSE.txt'));
console.log('Prepared 52 card faces, one back, and 24 Avataaars SVGs.');
