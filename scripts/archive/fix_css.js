const fs = require('fs');
['public/index.html', 'public/user.html'].forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/style="image-rendering: -webkit-optimize-contrast; image-rendering: crisp-edges;"/g, '');
  fs.writeFileSync(f, content);
  console.log('Fixed CSS in', f);
});
