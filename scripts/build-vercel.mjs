import fs from 'node:fs';
import path from 'node:path';

const output = path.resolve('public');
fs.mkdirSync(output, {recursive: true});
for (const name of ['index.html', 'style.css', 'theme.css', 'app.js', 'shared.js']) {
  let content = fs.readFileSync(path.join('dist', name), 'utf8');
  if (name === 'shared.js') {
    const previous = "const API_BASE='https://team-week-board-1102.skp-k-2881.chatgpt.site';";
    if (!content.includes(previous)) throw Error('Shared API configuration has changed; review Vercel build.');
    content = content.replace(previous, "const API_BASE='';");
  }
  fs.writeFileSync(path.join(output, name), content);
}
console.log('Built Vercel frontend with same-origin schedule API.');
