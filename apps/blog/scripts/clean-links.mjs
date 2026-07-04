import fs from 'fs';
import path from 'path';

const postsDir = path.join(process.cwd(), 'src/content/posts/quiver');

const files = fs.readdirSync(postsDir);

files.forEach(file => {
  if (!file.endsWith('.md')) return;
  
  const filePath = path.join(postsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Remove lines starting with "_Next in the series:" or "*Next in the series:"
  const lines = content.split('\n');
  const newLines = lines.filter(line => {
    return !line.match(/^[_*]Next in the series:/);
  });
  
  // Also check for relative links causing issues in "The complete series" list
  // The links look like [Part 2](./02-database-architecture.md)
  // We replace them with /posts/quiver/02-database-architecture
  
  const fixedContent = newLines.join('\n').replace(
    /\]\(\.\/(.*?)\.md\)/g, 
    '](/posts/quiver/$1)'
  );
  
  if (content !== fixedContent) {
     fs.writeFileSync(filePath, fixedContent);
     console.log(`Cleaned ${file}`);
  }
});
