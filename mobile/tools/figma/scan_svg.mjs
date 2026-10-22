import fs from 'node:fs';
import readline from 'node:readline';

const stream = fs.createReadStream('design-reference/QueueLess (Community).svg');
const rl = readline.createInterface({ input: stream });

let count = 0;
for await (const line of rl) {
  if (line.includes('<g id="')) {
    const idMatch = line.match(/id="([^"]+)"/);
    if (idMatch && !idMatch[1].startsWith('clip') && !idMatch[1].startsWith('filter') && !idMatch[1].startsWith('pattern')) {
      console.log('Group ID:', idMatch[1]);
      count++;
      if (count > 50) break;
    }
  }
}
