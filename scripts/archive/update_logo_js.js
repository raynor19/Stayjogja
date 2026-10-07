const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'public/js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(jsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('/images/logo-stayjogja.svg')) {
    content = content.replace(/\/images\/logo-stayjogja\.svg/g, '/images/logo-stayjogja.jpg');
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
