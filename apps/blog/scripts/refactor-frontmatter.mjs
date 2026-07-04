import fs from 'fs';
import path from 'path';

const postsDir = path.join(process.cwd(), 'src/content/posts');

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else {
      if (file.endsWith('.md')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const files = getFilesRecursively(postsDir);

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if file has frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.log(`Skipping ${filePath}: No frontmatter found`);
    return;
  }

  const frontmatter = frontmatterMatch[1];
  let body = content.replace(/^---\n[\s\S]*?\n---/, '').trim();

  // Extract current values
  const titleMatch = frontmatter.match(/title:\s*"(.*?)"/);
  const seriesMatch = frontmatter.match(/series:\s*"(.*?)"/);
  const slugMatch = frontmatter.match(/slug:\s*"(.*?)"/);

  let currentTitle = titleMatch ? titleMatch[1] : '';
  let series = seriesMatch ? seriesMatch[1] : '';
  let slug = slugMatch ? slugMatch[1] : '';

  // Find the first H2 (## Title)
  // We look for "## " at the start of a line
  const h2Match = body.match(/^##\s+(.*)$/m);
  
  let newPostTitle = currentTitle;
  let newSeriesTitle = currentTitle;

  if (h2Match) {
    newPostTitle = h2Match[1].trim(); // "Part 1: The Weekend Project"
    newSeriesTitle = currentTitle;    // "Building Quiver..." (Preserve the old H1/Title as Series Title)
    
    // Remove the H2 line from body
    body = body.replace(/^##\s+.*$/m, '').trim();
    
    console.log(`Updating ${path.basename(filePath)}:`);
    console.log(`  Series Title: ${newSeriesTitle}`);
    console.log(`  Post Title:   ${newPostTitle}`);
  } else {
    console.log(`No H2 found in ${path.basename(filePath)}, keeping existing title.`);
  }

  // Reconstruct frontmatter
  const newFrontmatter = `---
title: "${newPostTitle.replace(/"/g, '\\"')}"
seriesTitle: "${newSeriesTitle.replace(/"/g, '\\"')}"
series: "${series}"
slug: "${slug}"
---`;

  fs.writeFileSync(filePath, newFrontmatter + '\n\n' + body);
});
