# StayJogja Full Application UI/UX Pro Max Redesign Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melakukan *Full Refactor* desain seluruh halaman aplikasi reservasi akomodasi StayJogja berdasarkan intelijen **UI/UX Pro Max** (`design-system/stayjogja/MASTER.md`), menggantikan gaya tiruan Traveloka dengan identitas visual mandiri yang elegan (Royal Navy `#0F172A`/`#1E3A8A`, Heritage Amber Gold `#D97706`, Liquid Glass material, dan tipografi Plus Jakarta Sans).

**Architecture:** Token-driven styling via `public/css/style.css` yang dipakai serentak di 6 tampilan web (`index.html`, `login.html`, `user.html`, `owner.html`, `tera.html`, `admin.html`). Masing-masing halaman diperbarui struktur HTML semantiknya agar responsif, modern, dan memiliki hierarki visual tegas, dengan tetap mempertahankan seluruh integrasi JavaScript (`app.js`, `login.js`, `user.js`, `owner.js`, `tera.js`, `admin.js`) dan API backend Express.

**Tech Stack:** Node.js, Express.js, Vanilla HTML5/CSS3/JavaScript, Tailwind CSS (Custom extended config), Google Font *Plus Jakarta Sans* & *Playfair Display*, Font Awesome 6.

**Spec:** `docs/superpowers/specs/2026-09-29-stayyk-ui-ux-promax-redesign-design.md`

## Global Constraints
- Primary Brand: Royal Navy `#1E3A8A` / Deep Slate `#0F172A`
- Accent / CTA: Heritage Amber Gold `#D97706` (Hover `#B45309`)
- Supporting Blue: Royal Sapphire `#2563EB`
- Backgrounds: `#F8FAFC` (App background), `#FFFFFF` (Cards), `#0F172A` (Admin/Dark elements)
- Typography: `Plus Jakarta Sans` for UI, `Playfair Display` or `Outfit` for editorial headings
- Touch targets: >= 44x44px; WCAG AA contrast ratio >= 4.5:1
- Preserve 100% backend Express endpoints (`/api/*`) and JavaScript functional IDs

---

### Task 1: Global Token System & Liquid Glass Styling (`public/css/style.css`)

**Files:**
- Modify: `public/css/style.css`
- Test: `tests/verify-ui-tokens.js`

**Interfaces:**
- Consumes: Google Fonts (`Plus Jakarta Sans` & `Playfair Display`)
- Produces: CSS custom properties (`--color-primary`, `--color-accent`, `--shadow-card`, etc.), glass utilities (`.glass-nav`, `.glass-card`, `.search-capsule`), bento card styles, status badges, and `@media print` voucher isolation.

- [ ] **Step 1: Write test for StayJogja tokens and utility classes**

Update `tests/verify-ui-tokens.js`:
```javascript
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
const css = fs.readFileSync(cssPath, 'utf8');

console.log('Testing style.css for StayJogja UI/UX Pro Max tokens...');

assert(css.includes('Plus Jakarta Sans'), 'Font Plus Jakarta Sans must be imported');
assert(css.includes('--color-primary: #1e3a8a') || css.includes('#1e3a8a'), 'Royal Navy brand token must exist');
assert(css.includes('--color-accent: #d97706') || css.includes('#d97706'), 'Heritage Gold accent token must exist');
assert(css.includes('.glass-nav') || css.includes('.glass-card'), 'Liquid glass utility classes must exist');
assert(css.includes('@media print'), 'Print stylesheet must isolate vouchers');

console.log('✅ style.css token verification passed!');
```

- [ ] **Step 2: Run test to check current state**

Run: `node tests/verify-ui-tokens.js`

- [ ] **Step 3: Implement comprehensive token system in `public/css/style.css`**

Implement complete design tokens, liquid glass classes, card elevations, button styles, custom scrollbars, animations, chatbot bubble styles, and print media rules.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-ui-tokens.js`
Expected: PASS

---

### Task 2: Public Guest Portal & Booking Flow (`public/index.html` & `app.js`)

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Test: `tests/verify-index-page.js`

**Interfaces:**
- Consumes: `/api/properties`, `/api/reservations`, `/api/chatbot`
- Produces: StayJogja brand navigation, floating universal search capsule, 2-column catalog grid with sticky filter sidebar, bento property cards, room detail modal, sandbox checkout modal, printable e-voucher, and floating AI assistant.

- [ ] **Step 1: Write verification test for public guest portal**

Create `tests/verify-index-page.js`:
```javascript
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');

console.log('Testing StayJogja Guest Portal elements...');

assert(html.includes('StayJogja'), 'Page title and branding must be StayJogja');
assert(html.includes('id="search-form"'), 'Search form capsule must exist');
assert(html.includes('id="property-list"'), 'Property list container must exist');
assert(html.includes('id="detail-modal"'), 'Room detail modal must exist');
assert(html.includes('id="booking-modal"'), 'Checkout modal must exist');
assert(html.includes('id="voucher-modal"'), 'Voucher modal must exist');
assert(html.includes('id="chatbot-toggle-btn"'), 'AI chatbot widget must exist');
assert(js.includes('renderProperties'), 'renderProperties function must exist in app.js');

console.log('✅ Guest Portal verification passed!');
```

- [ ] **Step 2: Run test to inspect current index.html**

Run: `node tests/verify-index-page.js`

- [ ] **Step 3: Refactor `public/index.html` and update card renderer in `app.js`**

- Refactor `public/index.html` with:
  - Header: Sticky Liquid Glass navbar with StayJogja brand icon, type pill switcher, and orders button.
  - Hero: Jogja cultural panorama with modern typography and elevated floating search capsule.
  - Catalog: Sticky filter sidebar + Bento card grid with gold rating pills and transparent pricing.
  - Modals: Polished detail modal, 3-step checkout stepper, sandbox payment simulator, and e-voucher.
  - Chatbot: Floating circular assistant with Jogja recommendation chips.
- Update `public/js/app.js` to render the modern card structure and support new UI selectors.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-index-page.js`
Expected: PASS

---

### Task 3: Authentication & Multi-Role Gateway (`public/login.html` & `login.js`)

**Files:**
- Modify: `public/login.html`
- Modify: `public/js/login.js`
- Test: `tests/verify-login-page.js`

**Interfaces:**
- Consumes: `/api/auth/login`, `/api/auth/register`
- Produces: Seamless login/register form with Jogja Ken Burns slideshow, quick demo account selector (Tamu, Owner, Admin), and feedback toasts.

- [ ] **Step 1: Write test for login page**

Create `tests/verify-login-page.js`:
```javascript
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'login.html'), 'utf8');

console.log('Testing StayJogja Login Gateway...');

assert(html.includes('StayJogja'), 'Branding must be StayJogja');
assert(html.includes('id="login-form"'), 'Login form must exist');
assert(html.includes('id="register-form"'), 'Register form must exist');
assert(html.includes('fillDemoLogin'), 'Quick demo role buttons must exist');

console.log('✅ Login page verification passed!');
```

- [ ] **Step 2: Run test**

Run: `node tests/verify-login-page.js`

- [ ] **Step 3: Refactor `public/login.html` and synchronize `login.js`**

Refactor `public/login.html` into a modern Liquid Glass gateway aligned with the Royal Navy + Heritage Gold color tokens, preserving the Ken Burns Jogja slideshow backdrop and quick role selector cards.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-login-page.js`
Expected: PASS

---

### Task 4: Guest Traveler Hub & Orders Dashboard (`public/user.html` & `user.js`)

**Files:**
- Modify: `public/user.html`
- Modify: `public/js/user.js`
- Test: `tests/verify-user-page.js`

**Interfaces:**
- Consumes: `/api/reservations/user/:userId`
- Produces: Traveler profile banner, active booking cards, past reservations timeline, and e-voucher viewer modal.

- [ ] **Step 1: Write test for user dashboard**

Create `tests/verify-user-page.js`:
```javascript
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'user.html'), 'utf8');

console.log('Testing Guest User Hub...');

assert(html.includes('StayJogja'), 'Branding must be StayJogja');
assert(html.includes('id="active-bookings-list"'), 'Active bookings list container must exist');
assert(html.includes('id="history-bookings-list"'), 'History bookings list container must exist');

console.log('✅ User dashboard verification passed!');
```

- [ ] **Step 2: Run test**

Run: `node tests/verify-user-page.js`

- [ ] **Step 3: Refactor `public/user.html` and harmonize `public/js/user.js`**

Update `user.html` with:
- Top bar and navbar matching StayJogja Liquid Glass design
- Metric stats cards (Reservasi Aktif, Riwayat Selesai, Status Akun)
- Booking item cards with status badges and action buttons
- E-Voucher modal ready for printing

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-user-page.js`
Expected: PASS

---

### Task 5: Owner Partner Portal & Registration Onboarding (`public/owner.html`, `public/tera.html`, `owner.js`, `tera.js`)

**Files:**
- Modify: `public/owner.html`
- Modify: `public/tera.html`
- Modify: `public/js/owner.js`
- Modify: `public/js/tera.js`
- Test: `tests/verify-owner-pages.js`

**Interfaces:**
- Consumes: `/api/properties/owner/:ownerId`, `/api/reservations/owner/:ownerId`, `/api/properties/register`
- Produces: StayJogja Partner Hub dashboard (revenue stats, occupancy, reservation approval/reject table, property listing) and multi-step onboarding wizard.

- [ ] **Step 1: Write test for owner and registration portals**

Create `tests/verify-owner-pages.js`:
```javascript
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ownerHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'owner.html'), 'utf8');
const teraHtml = fs.readFileSync(path.join(__dirname, '..', 'public', 'tera.html'), 'utf8');

console.log('Testing Owner Partner Hub & Onboarding...');

assert(ownerHtml.includes('StayJogja'), 'Owner page must use StayJogja branding');
assert(ownerHtml.includes('id="pending-reservations-table"') || ownerHtml.includes('pending'), 'Pending reservations table must exist');
assert(teraHtml.includes('StayJogja'), 'Registration page must use StayJogja branding');
assert(!teraHtml.includes('traveloka-blue'), 'tera.html should not contain hardcoded traveloka-blue classes');

console.log('✅ Owner and Registration pages verification passed!');
```

- [ ] **Step 2: Run test**

Run: `node tests/verify-owner-pages.js`

- [ ] **Step 3: Refactor `public/owner.html` and `public/tera.html`**

- Refactor `public/owner.html`: Rebrand to **StayJogja Partner Hub**, update metrics cards with Royal Navy headers, improve reservation approval buttons (ACC / Tolak) with high-contrast styling, and clean unit management cards.
- Refactor `public/tera.html`: Remove all traveloka hardcoded references, update to StayJogja Partner Onboarding with 4-step Liquid Glass wizard, clean input fields, and modern progress bar.
- Update `owner.js` and `tera.js` to match the refreshed styling classes.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-owner-pages.js`
Expected: PASS

---

### Task 6: Admin Master Control Center (`public/admin.html` & `admin.js`)

**Files:**
- Modify: `public/admin.html`
- Modify: `public/js/admin.js`
- Test: `tests/verify-admin-page.js`

**Interfaces:**
- Consumes: `/api/admin/*`
- Produces: Executive dark slate control center, property & owner moderation cards, system audit log table, and AI chatbot knowledge manager.

- [ ] **Step 1: Write test for admin control center**

Create `tests/verify-admin-page.js`:
```javascript
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin.html'), 'utf8');

console.log('Testing Admin Control Center...');

assert(html.includes('StayJogja'), 'Admin page must use StayJogja branding');
assert(html.includes('id="moderation-property-list"'), 'Property moderation list must exist');
assert(html.includes('id="audit-transactions-table"'), 'Transaction audit table must exist');
assert(html.includes('id="chatbot-knowledge-table"'), 'Chatbot knowledge table must exist');

console.log('✅ Admin page verification passed!');
```

- [ ] **Step 2: Run test**

Run: `node tests/verify-admin-page.js`

- [ ] **Step 3: Refactor `public/admin.html` and `admin.js`**

Refactor `public/admin.html` with:
- Dark slate header with luxury gold indicators
- Metric cards for system totals (Total Properti, Total Transaksi, Owner Menunggu Verifikasi)
- Moderation review cards with clear *Approve* (emerald) and *Reject* (rose) buttons
- Transaction audit table with clean typography and status badges
- Chatbot knowledge management table with quick add/edit modal

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/verify-admin-page.js`
Expected: PASS

---

### Task 7: Full System Verification, Health Checks & Visual Polish

**Files:**
- Run: `server.js`
- Test: `tests/verify-system.js`
- Test: HTTP endpoint verification for all 6 pages

- [ ] **Step 1: Run comprehensive backend system tests**

Run: `npm test` or `node tests/verify-system.js`
Expected: PASS with 100% healthy backend status.

- [ ] **Step 2: Verify all 6 web pages serve HTTP 200 OK with StayJogja branding**

Test:
```bash
node -e "
const pages = ['/', '/tamu', '/user', '/owner', '/tera', '/admin'];
Promise.all(pages.map(p => fetch('http://localhost:3000' + p).then(r => r.text()))).then(res => {
  res.forEach((html, i) => {
    assert(html.includes('StayJogja'), 'Page ' + pages[i] + ' must include StayJogja');
    console.log('Page ' + pages[i] + ' OK (' + html.length + ' bytes)');
  });
  console.log('✅ All 6 pages successfully verified with StayJogja branding!');
});
"
```

- [ ] **Step 3: Inspect in Browser and review responsiveness**

Verify visual polish, glassmorphism blur, responsive breakpoints (375px mobile, 1024px tablet, 1440px desktop), and smooth interactions across all pages.
