const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      replaceInDir(filePath);
    } else if (filePath.endsWith('.html') || filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('/images/logo-stayjogja.jpg')) {
        content = content.replace(/\/images\/logo-stayjogja\.jpg/g, '/images/logo-stayjogja.png');
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'public'));
