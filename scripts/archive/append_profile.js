const fs = require('fs');
const content = `

// --- EDIT PROFILE MODAL LOGIC ---
function openGlobalEditProfileModal(e) {
  if(e) { e.preventDefault(); e.stopPropagation(); }
  const user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if(!user.id) return alert('Silakan login terlebih dahulu.');

  // Inject modal to body if not exists
  if (!document.getElementById('global-edit-profile-modal')) {
    const modalHTML = \`
      <div id="global-edit-profile-modal" class="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm hidden flex items-center justify-center p-4">
        <div class="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
          <div class="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
            <div>
              <h3 class="font-bold text-slate-900 font-display">Edit Profil Anda</h3>
              <p class="text-[11px] text-slate-500">Perbarui nama, email, dan WhatsApp</p>
            </div>
            <button type="button" onclick="closeGlobalEditProfileModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <form id="global-edit-profile-form" onsubmit="submitGlobalEditProfile(event)" class="p-6 space-y-4 text-xs">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
              <input type="text" id="g-prof-name" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" required>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Alamat Email</label>
              <input type="email" id="g-prof-email" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" required>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
              <input type="tel" id="g-prof-phone" class="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500" required>
            </div>
            <button type="submit" class="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-2.5 rounded-xl transition shadow-md flex items-center justify-center gap-2">
              <i class="fa-solid fa-save"></i> Simpan Profil
            </button>
          </form>
        </div>
      </div>
    \`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  document.getElementById('g-prof-name').value = user.name || '';
  document.getElementById('g-prof-email').value = user.email || '';
  document.getElementById('g-prof-phone').value = user.phone || '';
  
  document.getElementById('global-edit-profile-modal').classList.remove('hidden');
}

function closeGlobalEditProfileModal() {
  const m = document.getElementById('global-edit-profile-modal');
  if (m) m.classList.add('hidden');
}

async function submitGlobalEditProfile(e) {
  e.preventDefault();
  const user = JSON.parse(localStorage.getItem('stayjogja_user') || '{}');
  if(!user.id) return;

  const name = document.getElementById('g-prof-name').value.trim();
  const email = document.getElementById('g-prof-email').value.trim();
  const phone = document.getElementById('g-prof-phone').value.trim();

  try {
    const res = await fetch(\`/api/auth/profile/\${user.id}\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone })
    });
    const data = await res.json();
    
    if(data.success) {
      localStorage.setItem('stayjogja_user', JSON.stringify(data.user));
      alert('Profil berhasil diperbarui!');
      closeGlobalEditProfileModal();
      window.location.reload();
    } else {
      alert(data.message || 'Gagal memperbarui profil.');
    }
  } catch (err) {
    console.error(err);
    alert('Terjadi kesalahan jaringan.');
  }
}
`;
fs.appendFileSync('public/js/app.js', content, 'utf8');
