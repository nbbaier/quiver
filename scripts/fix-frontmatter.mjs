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
  const relativePath = path.relative(postsDir, filePath);
  const pathParts = relativePath.split(path.sep);
  
  // Assume structure: series-name/filename.md
  // If file is at root, series is "Other"
  let series = "Other";
  if (pathParts.length > 1) {
    series = pathParts[0];
    // Capitalize first letter
    series = series.charAt(0).toUpperCase() + series.slice(1);
  }

  const filename = path.basename(filePath);
  
  // Check if already has frontmatter
  if (content.startsWith('---')) {
    // We might want to update existing frontmatter if we're running this again to organize things
    // But for now, let's assume we only run this on raw markdown.
    // Actually, since we just moved files that ALREADY have frontmatter, we might need to update the slug!
    // Let's parse the existing frontmatter lightly.
    
    // If we just moved the files, they have frontmatter but the slug might be "01-weekend..." 
    // instead of "quiver/01-weekend...".
    // Let's force update the slug and series.
    
    const frontmatterEnd = content.indexOf('---', 3);
    if (frontmatterEnd !== -1) {
      const frontmatter = content.substring(3, frontmatterEnd);
      let body = content.substring(frontmatterEnd + 3).trim();
      
      // Extract existing title
      const titleMatch = frontmatter.match(/title:\s*"(.*)"/);
      const title = titleMatch ? titleMatch[1] : filename.replace('.md', '');
      
      const seriesTitleMatch = frontmatter.match(/seriesTitle:\s*"(.*)"/);
      const seriesTitle = seriesTitleMatch ? seriesTitleMatch[1] : series;

      const newSlug = relativePath.replace('.md', '');
      
      const newFrontmatter = `---
title: "${title}"
seriesTitle: "${seriesTitle}"
slug: "${newSlug}"
series: "${series}"
---`;
      
      fs.writeFileSync(filePath, newFrontmatter + '\n\n' + body);
      console.log(`Updated ${relativePath}`);
      return;
    }
  }

  // Extract title from first H1 for new files
  const match = content.match(/^# (.*)$/m);
  let title = filename.replace('.md', '');
  
  if (match) {
    title = match[1].trim();
    content = content.replace(/^# .*$/m, '').trim();
  }

  const newSlug = relativePath.replace('.md', '');

  const newContent = `---
title: "${title.replace(/"/g, '\\"')}"
seriesTitle: "${series.replace(/"/g, '\\"')}"
slug: "${newSlug}"
series: "${series}"
---

${content}`;

  fs.writeFileSync(filePath, newContent);
  console.log(`Processed ${relativePath}`);
});
