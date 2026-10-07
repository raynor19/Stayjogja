const fs = require('fs');
let owner = fs.readFileSync('public/js/owner.js', 'utf8');
owner = owner.replace("const tabs = ['acc', 'rooms', 'properties'];", "const tabs = ['acc', 'rooms', 'properties', 'finance'];");
owner = owner.replace("sec.classList.remove('hidden');", "sec.classList.remove('hidden');\n        if(t === 'finance' && tab === 'finance') loadOwnerFinance();");
fs.writeFileSync('public/js/owner.js', owner);
