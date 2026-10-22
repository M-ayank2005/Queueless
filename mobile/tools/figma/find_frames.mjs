import fs from 'node:fs';
import readline from 'node:readline';

const stream = fs.createReadStream('design-reference/QueueLess (Community).svg');
const rl = readline.createInterface({ input: stream });

let lineNo = 0;
for await (const line of rl) {
  lineNo++;
  if (lineNo >= 40 && lineNo <= 96 && line.includes('<rect')) {
    console.log(`Line ${lineNo}: ${line.trim().slice(0, 120)}`);
  }
}
