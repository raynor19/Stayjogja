const fs = require('fs');
const path = require('path');
const assert = require('assert');

const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

console.log('Testing style.css for StayJogja UI/UX Pro Max tokens...');

assert(css.includes('DM Sans'), 'Font DM Sans must be imported');
assert(css.includes('--color-primary') && (css.includes('#1e3a8a') || css.includes('#0f172a')), 'Royal Navy brand token must exist');
assert(css.includes('--color-accent') && (css.includes('#d97706') || css.includes('#a16207')), 'Heritage Gold accent token must exist');
assert(css.includes('.glass-nav') || css.includes('.glass-card') || css.includes('.glass-header'), 'Liquid glass utility classes must exist');
assert(css.includes('@media print'), 'Print stylesheet must isolate vouchers');
assert(css.includes('.bento-card') || css.includes('.property-card'), 'Property card styling must be defined');

console.log('✅ style.css token verification passed!');
