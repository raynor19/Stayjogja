// Traveloka TERA Registration Controller
let currentTeraStep = 1;
let currentPropType = 'hotel';

// Proposal Perjanjian Kerjasama Kemitraan (Bagi Hasil 5% Platform)
function toggleAgreementBtn(isChecked) {
  const btn = document.getElementById('btn-accept-partnership');
  if (!btn) return;
  if (isChecked) {
    btn.disabled = false;
    btn.className = 'w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 shadow-sm cursor-pointer transition flex items-center justify-center gap-2';
  } else {
    btn.disabled = true;
    btn.className = 'w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-white bg-slate-400 cursor-not-allowed transition flex items-center justify-center gap-2';
  }
}

function acceptPartnershipAgreement() {
  const checkbox = document.getElementById('agree-partnership-checkbox');
  if (!checkbox || !checkbox.checked) {
    alert('Harap centang persetujuan proposal perjanjian kerjasama terlebih dahulu.');
    return;
  }
  sessionStorage.setItem('stayjogja_partnership_agreed', 'true');
  const modal = document.getElementById('proposal-partnership-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
  // Focus ke input nama properti Langkah 1
  const nameInput = document.getElementById('tera-prop-name');
  if (nameInput) nameInput.focus();
}

function openPartnershipModal() {
  const modal = document.getElementById('proposal-partnership-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  handleTypeChange('hotel');
  updateLivePreview();

  // Tampilkan Proposal Perjanjian Kerjasama (MoU 5% Platform) sebelum memulai pengisian
  const isAgreed = sessionStorage.getItem('stayjogja_partnership_agreed');
  const modal = document.getElementById('proposal-partnership-modal');
  if (isAgreed === 'true') {
    if (modal) modal.classList.add('hidden');
    const chk = document.getElementById('agree-partnership-checkbox');
    if (chk) chk.checked = true;
    toggleAgreementBtn(true);
  } else {
    if (modal) modal.classList.remove('hidden');
  }
});

// Format Rupiah
function formatRupiah(num) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num);
}

// Step Navigation
function goToStep(step) {
  if (step < 1 || step > 6) return;

  // Basic validation before going forward
  if (step > currentTeraStep) {
    if (currentTeraStep === 1) {
      const name = document.getElementById('tera-prop-name').value.trim();
      if (!name) {
        alert('Silakan masukkan nama resmi properti Anda terlebih dahulu.');
        document.getElementById('tera-prop-name').focus();
        return;
      }
    } else if (currentTeraStep === 2) {
      const address = document.getElementById('tera-prop-address').value.trim();
      if (!address) {
        alert('Silakan masukkan alamat lengkap akomodasi.');
        document.getElementById('tera-prop-address').focus();
        return;
      }
    } else if (currentTeraStep === 4) {
      const roomName = document.getElementById('tera-room-name').value.trim();
      const roomPrice = document.getElementById('tera-room-price').value;
      if (!roomName || !roomPrice) {
        alert('Silakan lengkapi nama kamar dan tarif per malam.');
        return;
      }
    } else if (currentTeraStep === 5) {
      if (uploadedPhotos.length === 0 && (!document.getElementById('tera-photo-main') || !document.getElementById('tera-photo-main').value)) {
        alert('Silakan unggah atau tambahkan minimal 1 foto hotel Anda terlebih dahulu.');
        return;
      }
    }
  }

  // Hide all step sections
  for (let i = 1; i <= 6; i++) {
    const sec = document.getElementById(`tera-step-i`.replace('i', i));
    const badge = document.getElementById(`step-badge-i`.replace('i', i));
    const navBtn = document.getElementById(`step-nav-i`.replace('i', i));
    const line = document.getElementById(`step-line-i`.replace('i', i));

    if (sec) sec.classList.add('hidden');

    if (badge) {
      if (i < step) {
        badge.className = 'w-8 h-8 rounded-full flex items-center justify-center step-done font-black text-xs shadow-sm';
        badge.innerHTML = '<i class="fa-solid fa-check text-[11px]"></i>';
      } else if (i === step) {
        badge.className = 'w-8 h-8 rounded-full flex items-center justify-center step-active font-black text-xs shadow-sm';
        badge.textContent = i;
      } else {
        badge.className = 'w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 font-black text-xs border border-slate-200';
        badge.textContent = i;
      }
    }

    if (line && i < 6) {
      if (i < step) {
        line.className = 'flex-1 h-0.5 bg-emerald-500 min-w-[20px] transition';
      } else {
        line.className = 'flex-1 h-0.5 bg-slate-200 min-w-[20px] transition';
      }
    }
  }

  // Show active step section
  const targetSec = document.getElementById(`tera-step-${step}`);
  if (targetSec) targetSec.classList.remove('hidden');

  currentTeraStep = step;
  window.scrollTo({ top: 120, behavior: 'smooth' });
}

// Handle Property Type selection
function handleTypeChange(type) {
  currentPropType = type;
  const types = ['hotel', 'homestay', 'apartemen', 'villa'];

  types.forEach(t => {
    const card = document.getElementById(`card-type-${t}`);
    if (card) {
      if (t === type) {
        card.className = 'cursor-pointer border-2 border-blue-600 bg-blue-50/40 rounded-xl p-3.5 flex flex-col items-center justify-center text-center gap-2 shadow-sm transition ring-2 ring-blue-500/20';
      } else {
        card.className = 'cursor-pointer border-2 border-slate-200 bg-white rounded-xl p-3.5 flex flex-col items-center justify-center text-center gap-2 hover:border-slate-300 transition';
      }
    }
  });

  const starsBox = document.getElementById('hotel-stars-box');
  if (starsBox) {
    if (type === 'hotel') {
      starsBox.classList.remove('hidden');
    } else {
      starsBox.classList.add('hidden');
    }
  }

  updateLivePreview();
}

// Update Live Preview Card on the right column
function updateLivePreview() {
  const nameInput = document.getElementById('tera-prop-name');
  const areaSelect = document.getElementById('tera-prop-area');
  const roomNameInput = document.getElementById('tera-room-name');
  const roomPriceInput = document.getElementById('tera-room-price');
  const photoInput = document.getElementById('tera-photo-main');

  const cardName = document.getElementById('preview-card-name');
  const cardArea = document.getElementById('preview-card-area');
  const cardRoom = document.getElementById('preview-card-room');
  const cardPrice = document.getElementById('preview-card-price');
  const cardImg = document.getElementById('preview-card-img');
  const previewImgBox = document.getElementById('tera-preview-img-box');
  const cardTypeBadge = document.getElementById('preview-card-type-badge');
  const cardStars = document.getElementById('preview-card-stars');

  // Name
  if (cardName) {
    cardName.textContent = (nameInput && nameInput.value.trim()) || 'Nama Akomodasi Baru';
  }

  // Area
  if (cardArea) {
    const areaText = areaSelect ? areaSelect.value : 'Yogyakarta';
    cardArea.innerHTML = `<i class="fa-solid fa-location-dot text-red-500 text-[10px]"></i> <span class="truncate">${areaText}</span>`;
  }

  // Room & Price (Computed from all room cards)
  const roomCards = document.querySelectorAll('.room-card');
  let lowestPrice = 0;
  let firstRoomName = '';
  let validRoomsCount = 0;

  roomCards.forEach((card, idx) => {
    const nameEl = card.querySelector('[name="room_name[]"]') || card.querySelector('#tera-room-name');
    const priceEl = card.querySelector('[name="room_price[]"]') || card.querySelector('#tera-room-price');
    const priceVal = priceEl ? parseInt(priceEl.value, 10) : 0;
    const nameVal = nameEl ? nameEl.value.trim() : '';
    if (idx === 0) firstRoomName = nameVal || 'Deluxe Room';
    if (!isNaN(priceVal) && priceVal > 0) {
      if (lowestPrice === 0 || priceVal < lowestPrice) lowestPrice = priceVal;
      validRoomsCount++;
    }
  });

  if (cardRoom) {
    if (validRoomsCount > 1) {
      cardRoom.textContent = `${firstRoomName} (+${validRoomsCount - 1} Tipe Lainnya)`;
    } else {
      cardRoom.textContent = firstRoomName || 'Deluxe Room';
    }
  }

  if (cardPrice) {
    const p = lowestPrice > 0 ? lowestPrice : 450000;
    cardPrice.innerHTML = `${formatRupiah(p)} <span class="text-[10px] font-normal text-slate-400">/malam</span>`;
  }

  // Photo
  const mainPhoto = (uploadedPhotos.length > 0 && uploadedPhotos[0]) 
    || (photoInput && photoInput.value.trim()) 
    || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
  if (cardImg) cardImg.src = mainPhoto;
  if (previewImgBox) previewImgBox.src = mainPhoto;

  // Type & Stars Badge
  if (cardTypeBadge && cardStars) {
    if (currentPropType === 'hotel') {
      const selectedStarEl = document.querySelector('input[name="hotel_stars"]:checked');
      const stars = selectedStarEl ? parseInt(selectedStarEl.value, 10) : 3;
      cardTypeBadge.className = 'px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 shadow-sm backdrop-blur-md flex items-center gap-1';
      cardTypeBadge.innerHTML = `<i class="fa-solid fa-hotel"></i> Hotel Bintang ${stars}`;
      cardStars.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
      cardStars.classList.remove('hidden');
    } else if (currentPropType === 'homestay') {
      cardTypeBadge.className = 'px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 shadow-sm backdrop-blur-md flex items-center gap-1';
      cardTypeBadge.innerHTML = `<i class="fa-solid fa-house-chimney"></i> Homestay Jogja`;
      cardStars.classList.add('hidden');
    } else if (currentPropType === 'apartemen') {
      cardTypeBadge.className = 'px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 shadow-sm backdrop-blur-md flex items-center gap-1';
      cardTypeBadge.innerHTML = `<i class="fa-solid fa-building"></i> Apartemen`;
      cardStars.classList.add('hidden');
    } else {
      cardTypeBadge.className = 'px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 shadow-sm backdrop-blur-md flex items-center gap-1';
      cardTypeBadge.innerHTML = `<i class="fa-solid fa-tree"></i> Villa / Resort`;
      cardStars.classList.add('hidden');
    }
  }
}

// ================= PHOTO UPLOAD & GALLERY CONTROLLER =================
let uploadedPhotos = [];

function handlePhotoSelect(e) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;
  processSelectedFiles(files);
  e.target.value = '';
}

function handlePhotoDragOver(e) {
  e.preventDefault();
  const dropzone = document.getElementById('photo-upload-dropzone');
  if (dropzone) {
    dropzone.classList.add('border-blue-500', 'bg-blue-100/70', 'scale-[1.01]');
  }
}

function handlePhotoDragLeave(e) {
  e.preventDefault();
  const dropzone = document.getElementById('photo-upload-dropzone');
  if (dropzone) {
    dropzone.classList.remove('border-blue-500', 'bg-blue-100/70', 'scale-[1.01]');
  }
}

function handlePhotoDrop(e) {
  e.preventDefault();
  const dropzone = document.getElementById('photo-upload-dropzone');
  if (dropzone) {
    dropzone.classList.remove('border-blue-500', 'bg-blue-100/70', 'scale-[1.01]');
  }
  const files = Array.from(e.dataTransfer.files).filter(f => f.type && f.type.startsWith('image/'));
  if (files.length > 0) {
    processSelectedFiles(files);
  }
}

// Client-side image compression to prevent large payloads (e.g. 5-15MB camera photos)
function compressImage(dataUrl, maxWidth = 1280, maxHeight = 960, quality = 0.8) {
  return new Promise((resolve) => {
    // If it's already an external HTTP link, skip compression
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function processSelectedFiles(files) {
  let loadedCount = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const compressed = await compressImage(event.target.result);
        uploadedPhotos.push(compressed);
      } catch (err) {
        uploadedPhotos.push(event.target.result);
      }
      loadedCount++;
      if (loadedCount === files.length) {
        renderUploadedPhotos();
      }
    };
    reader.readAsDataURL(file);
  });
}

function toggleUrlSection() {
  const sec = document.getElementById('url-input-section');
  const arrow = document.getElementById('url-toggle-arrow');
  if (sec) {
    sec.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
  }
}

function addPhotoFromUrl() {
  const urlInput = document.getElementById('manual-photo-url');
  if (!urlInput) return;
  const val = urlInput.value.trim();
  if (!val) {
    alert('Silakan tempelkan tautan / URL foto yang valid.');
    return;
  }
  uploadedPhotos.push(val);
  urlInput.value = '';
  renderUploadedPhotos();
}

function addPresetPhoto(url, label) {
  if (url) {
    uploadedPhotos.push(url);
    renderUploadedPhotos();
  }
}

function removeUploadedPhoto(idx) {
  if (idx >= 0 && idx < uploadedPhotos.length) {
    uploadedPhotos.splice(idx, 1);
    renderUploadedPhotos();
  }
}

function setMainPhoto(idx) {
  if (idx > 0 && idx < uploadedPhotos.length) {
    const photo = uploadedPhotos.splice(idx, 1)[0];
    uploadedPhotos.unshift(photo);
    renderUploadedPhotos();
  }
}

function renderUploadedPhotos() {
  const grid = document.getElementById('uploaded-photos-grid');
  const countBadge = document.getElementById('photo-count-badge');
  const hiddenMainPhoto = document.getElementById('tera-photo-main');

  if (!grid) return;

  if (countBadge) {
    countBadge.textContent = `${uploadedPhotos.length} Foto`;
  }

  if (hiddenMainPhoto) {
    hiddenMainPhoto.value = uploadedPhotos[0] || '';
  }

  if (uploadedPhotos.length === 0) {
    grid.innerHTML = `
      <div id="photos-empty-state" class="col-span-2 sm:col-span-4 border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 text-slate-400">
        <i class="fa-regular fa-images text-3xl mb-2 block text-slate-300"></i>
        <span class="text-xs font-medium block text-slate-600">Belum ada foto yang ditambahkan</span>
        <span class="text-[11px] text-slate-400 block mt-0.5">Silakan klik area unggah di atas untuk menambahkan foto hotel Anda.</span>
      </div>
    `;
    updateLivePreview();
    return;
  }

  let html = '';
  uploadedPhotos.forEach((photoUrl, idx) => {
    const isMain = idx === 0;
    html += `
      <div class="relative group rounded-xl overflow-hidden border ${isMain ? 'border-2 border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'} bg-slate-100 aspect-video sm:aspect-square flex items-center justify-center">
        <img src="${photoUrl}" class="w-full h-full object-cover">
        
        <!-- Main badge -->
        ${isMain ? `
          <span class="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow flex items-center gap-1">
            <i class="fa-solid fa-star text-amber-300 text-[9px]"></i> Fasad Utama
          </span>
        ` : `
          <button type="button" onclick="setMainPhoto(${idx})" class="opacity-0 group-hover:opacity-100 absolute top-2 left-2 bg-slate-900/80 hover:bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow transition flex items-center gap-1" title="Jadikan foto utama">
            <i class="fa-solid fa-star text-amber-300 text-[9px]"></i> Jadikan Utama
          </button>
        `}

        <!-- Delete button -->
        <button type="button" onclick="removeUploadedPhoto(${idx})" class="opacity-0 group-hover:opacity-100 absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow transition" title="Hapus foto ini">
          <i class="fa-solid fa-xmark"></i>
        </button>

        <span class="absolute bottom-1 right-2 text-[9px] font-semibold text-white bg-slate-900/60 px-1.5 py-0.5 rounded">
          #${idx + 1}
        </span>
      </div>
    `;
  });

  // Append a "+ Tambah Foto" button inside the gallery grid
  html += `
    <div onclick="document.getElementById('tera-file-input').click()" class="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl aspect-video sm:aspect-square flex flex-col items-center justify-center cursor-pointer bg-slate-50/60 hover:bg-blue-50/50 text-slate-400 hover:text-blue-600 transition group p-2 text-center">
      <div class="w-8 h-8 rounded-full bg-slate-200 group-hover:bg-blue-600 group-hover:text-white text-slate-500 flex items-center justify-center text-sm transition mb-1">
        <i class="fa-solid fa-plus"></i>
      </div>
      <span class="text-[11px] font-bold">Tambah Foto</span>
    </div>
  `;

  grid.innerHTML = html;
  updateLivePreview();
}

// ================= ROOM PHOTOS CONTROLLER =================
let roomPhotos = {};

function handleRoomPhotoSelect(e, roomIdx) {
  const files = Array.from(e.target.files);
  if (!files || files.length === 0) return;

  if (!roomPhotos[roomIdx]) {
    roomPhotos[roomIdx] = [];
  }

  let loadedCount = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const compressed = await compressImage(event.target.result);
        roomPhotos[roomIdx].push(compressed);
      } catch (err) {
        roomPhotos[roomIdx].push(event.target.result);
      }
      loadedCount++;
      if (loadedCount === files.length) {
        renderRoomPhotos(roomIdx);
      }
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function removeRoomPhoto(roomIdx, photoIdx) {
  if (roomPhotos[roomIdx] && roomPhotos[roomIdx].length > photoIdx) {
    roomPhotos[roomIdx].splice(photoIdx, 1);
    renderRoomPhotos(roomIdx);
  }
}

function toggleRoomUrlInput(roomIdx) {
  const box = document.getElementById(`room-url-box-${roomIdx}`);
  if (box) {
    box.classList.toggle('hidden');
  }
}

function addRoomPhotoFromUrl(roomIdx) {
  const input = document.getElementById(`room-url-input-${roomIdx}`);
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert('Silakan masukkan link URL foto yang valid.');
    return;
  }
  if (!roomPhotos[roomIdx]) {
    roomPhotos[roomIdx] = [];
  }
  roomPhotos[roomIdx].push(val);
  input.value = '';
  toggleRoomUrlInput(roomIdx);
  renderRoomPhotos(roomIdx);
}

function renderRoomPhotos(roomIdx) {
  const grid = document.getElementById(`room-photos-grid-${roomIdx}`);
  const countBadge = document.getElementById(`room-photo-count-${roomIdx}`);
  if (!grid) return;

  const photos = roomPhotos[roomIdx] || [];
  if (countBadge) {
    countBadge.textContent = `${photos.length} Foto`;
  }

  let html = '';
  photos.forEach((photoUrl, pIdx) => {
    const isMain = pIdx === 0;
    html += `
      <div class="relative group rounded-xl overflow-hidden border ${isMain ? 'border-2 border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'} bg-slate-100 aspect-video flex items-center justify-center shadow-xs">
        <img src="${photoUrl}" class="w-full h-full object-cover">
        ${isMain ? `
          <span class="absolute top-1.5 left-1.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
            Utama
          </span>
        ` : ''}
        <button type="button" onclick="removeRoomPhoto(${roomIdx}, ${pIdx})" class="opacity-90 sm:opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 bg-red-600/90 hover:bg-red-700 text-white w-5 h-5 rounded-md flex items-center justify-center text-[10px] shadow transition" title="Hapus foto kamar ini">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
  });

  // Always append "+ Tambah Foto" slot
  html += `
    <label class="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[96px] group shadow-2xs">
      <input type="file" accept="image/*" multiple onchange="handleRoomPhotoSelect(event, ${roomIdx})" class="hidden" id="room-file-input-${roomIdx}">
      <div class="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center text-xs mb-1.5 transition">
        <i class="fa-solid fa-cloud-arrow-up"></i>
      </div>
      <span class="text-[11px] font-bold text-blue-700 leading-tight">+ Tambah Foto</span>
      <span class="text-[9px] text-slate-400 mt-0.5">Pilih dari perangkat</span>
    </label>
  `;

  grid.innerHTML = html;
  updateLivePreview();
}

// 1-Click Quick Fill for Demo / Skripsi Presentation
function quickFillTeraDemo(type = 'hotel') {
  if (type === 'hotel') {
    handleTypeChange('hotel');
    document.querySelector('input[name="prop_type"][value="hotel"]').checked = true;
    document.querySelector('input[name="hotel_stars"][value="4"]').checked = true;

    document.getElementById('tera-prop-name').value = 'Grand Malioboro Heritage Hotel & Spa';
    document.getElementById('tera-prop-desc').value = 'Hotel bintang 4 bernuansa heritage kolonial dan keraton Jawa, hanya 300 meter dari Jalan Malioboro dan Stasiun Tugu. Dilengkapi fasilitas kolam renang outdoor, restoran kuliner khas Jogja, spa tradisional, dan resepsionis 24 jam.';
    document.getElementById('tera-prop-area').value = 'Malioboro / Pusat Kota';
    document.getElementById('tera-prop-postal').value = '55271';
    document.getElementById('tera-prop-address').value = 'Jl. Dagen No. 18, Sosromenduran, Gedong Tengen, Kota Yogyakarta';
    
    document.getElementById('tera-room-name').value = 'Executive King Room with Malioboro View';
    document.getElementById('tera-room-bed').value = '1 King Bed (200x200 cm)';
    document.getElementById('tera-room-price').value = '680000';
    document.getElementById('tera-room-stock').value = '8';
    const facsEl1 = document.getElementById('tera-room-facs');
    if (facsEl1) facsEl1.value = 'AC, Smart TV 43 Inch, Kamar Mandi Marmer, Bathtub, Air Panas, WiFi Cepat, Minibar, Sarapan Buffet Gratis';
    document.getElementById('tera-photo-main').value = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
    uploadedPhotos = [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80'
    ];
    renderUploadedPhotos();

    roomPhotos[1] = [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80'
    ];
    renderRoomPhotos(1);
    
    document.getElementById('tera-bank-name').value = 'BCA';
    document.getElementById('tera-bank-account').value = '8820918231';
    document.getElementById('tera-bank-holder').value = 'PT Grand Malioboro Hospitality';
    document.getElementById('tera-ktp-number').value = '3471012903820002';
    const gmapsEl1 = document.getElementById('tera-prop-gmaps');
    if (gmapsEl1) gmapsEl1.value = 'https://maps.google.com/?q=Jl.+Dagen+No.+12+Yogyakarta';
  } else {
    handleTypeChange('homestay');
    document.querySelector('input[name="prop_type"][value="homestay"]').checked = true;

    document.getElementById('tera-prop-name').value = 'Omah Joglo Prawirotaman Homestay';
    document.getElementById('tera-prop-desc').value = 'Homestay arsitektur limasan tradisional Jawa di kawasan seni Prawirotaman. Lingkungan tenang, asri, dengan taman hijau dan gazebo santai, dekat kafe-kafe hipster dan pusat batik.';
    document.getElementById('tera-prop-area').value = 'Prawirotaman / Selatan';
    document.getElementById('tera-prop-postal').value = '55153';
    document.getElementById('tera-prop-address').value = 'Jl. Gerilya, Prawirotaman II No. 45, Mergangsan, Kota Yogyakarta';
    const gmapsEl2 = document.getElementById('tera-prop-gmaps');
    if (gmapsEl2) gmapsEl2.value = 'https://maps.google.com/?q=Jl.+Gerilya+Prawirotaman+Yogyakarta';
    
    document.getElementById('tera-room-name').value = 'Deluxe Traditional Room with Garden View';
    document.getElementById('tera-room-bed').value = '1 Queen Bed (160x200 cm)';
    document.getElementById('tera-room-price').value = '320000';
    document.getElementById('tera-room-stock').value = '4';
    document.getElementById('tera-room-capacity').value = '2';
    const facsEl2 = document.getElementById('tera-room-facs');
    if (facsEl2) facsEl2.value = 'AC, Kamar Mandi Dalam, Air Panas, Teras Santai, Teh/Kopi Gratis, WiFi';
    document.getElementById('tera-photo-main').value = 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80';
    uploadedPhotos = [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80'
    ];
    renderUploadedPhotos();

    roomPhotos[1] = [
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80'
    ];
    renderRoomPhotos(1);
    
    document.getElementById('tera-bank-name').value = 'Bank BPD DIY';
    document.getElementById('tera-bank-account').value = '0012938172';
    document.getElementById('tera-bank-holder').value = 'Ibu Kartika';
    document.getElementById('tera-ktp-number').value = '3471015609870001';
  }

  updateLivePreview();
  alert(`Data contoh ${type.toUpperCase()} berhasil diisi otomatis. Anda dapat menavigasi langkah 1 hingga 6 untuk melihat formulir pendaftaran mitra StayYK.`);
}

// Dynamic Room Types Management
let extraRoomCount = 1;

function addNewRoomType() {
  extraRoomCount++;
  const container = document.getElementById('additional-rooms-container');
  if (!container) return;

  const currentIdx = extraRoomCount;
  const roomDiv = document.createElement('div');
  roomDiv.className = 'p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-4 room-card animate-in fade-in slide-in-from-top-3 duration-200';
  roomDiv.id = `room-card-${currentIdx}`;
  roomDiv.setAttribute('data-room-idx', currentIdx);
  roomDiv.innerHTML = `
    <div class="flex items-center justify-between pb-2 border-b border-blue-200">
      <div class="flex items-center gap-2">
        <span class="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">${currentIdx}</span>
        <span class="text-xs font-bold text-slate-800 uppercase tracking-wide">Tipe Kamar Tambahan #${currentIdx}</span>
      </div>
      <button type="button" onclick="removeRoomType(${currentIdx})" class="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl border border-red-200 transition flex items-center gap-1.5" title="Hapus tipe kamar ini">
        <i class="fa-solid fa-trash-can"></i>
        <span>Hapus Kamar</span>
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="block text-xs font-bold text-slate-800 mb-1">Nama Tipe Kamar / Unit <span class="text-red-500">*</span></label>
        <input type="text" name="room_name[]" placeholder="Contoh: Executive Suite / Twin Superior" required oninput="updateLivePreview()" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-medium">
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-800 mb-1">Tipe Tempat Tidur</label>
        <select name="room_bed[]" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500">
          <option value="1 King Bed (200x200 cm)">1 King Bed (200x200 cm)</option>
          <option value="1 Queen Bed (160x200 cm)">1 Queen Bed (160x200 cm)</option>
          <option value="2 Single Beds (Twin)" selected>2 Single Beds (Twin)</option>
          <option value="1 Double Bed + 1 Single Bed">1 Double Bed + 1 Single Bed (Family)</option>
          <option value="3 Queen Beds (Suite)">3 Queen Beds (Suite)</option>
          <option value="Bunk Bed Bertingkat">Bunk Bed Bertingkat</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label class="block text-xs font-bold text-slate-800 mb-1">Tarif per Malam (IDR) <span class="text-red-500">*</span></label>
        <div class="relative">
          <span class="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
          <input type="number" name="room_price[]" placeholder="600000" min="50000" step="10000" required oninput="updateLivePreview()" class="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 font-black focus:outline-none focus:border-blue-500">
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-800 mb-1">Jumlah Kamar Tersedia (Stok)</label>
        <input type="number" name="room_stock[]" value="3" min="1" max="100" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-500">
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-800 mb-1">Kapasitas Tamu</label>
        <select name="room_capacity[]" class="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500">
          <option value="2">2 Orang Dewasa</option>
          <option value="3">3 Orang (Family)</option>
          <option value="4" selected>4 Orang (Grup)</option>
          <option value="1">1 Orang (Solo Traveler)</option>
          <option value="6">6+ Orang (Rombongan)</option>
        </select>
      </div>
    </div>

    <!-- Fasilitas di Dalam Kamar (Checklist Pilihan) -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="block text-xs font-bold text-slate-800">
          <i class="fa-solid fa-list-check text-blue-600 mr-1"></i> Fasilitas di Dalam Kamar <span class="text-slate-400 font-normal">(Centang yang tersedia)</span>
        </label>
        <span class="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Pilih fasilitas kamar</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs room-facility-grid">
        <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white cursor-pointer transition select-none">
          <input type="checkbox" name="room_facility_${currentIdx}" value="AC" checked class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-snowflake text-blue-500 w-3.5"></i> AC</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white cursor-pointer transition select-none">
          <input type="checkbox" name="room_facility_${currentIdx}" value="Kamar Mandi Pribadi" checked class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-bath text-blue-500 w-3.5"></i> Kamar Mandi Dalam</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white cursor-pointer transition select-none">
          <input type="checkbox" name="room_facility_${currentIdx}" value="Air Panas (Water Heater)" checked class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-shower text-blue-500 w-3.5"></i> Air Panas</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white cursor-pointer transition select-none">
          <input type="checkbox" name="room_facility_${currentIdx}" value="WiFi Gratis" checked class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-wifi text-blue-500 w-3.5"></i> WiFi Gratis</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white cursor-pointer transition select-none">
          <input type="checkbox" name="room_facility_${currentIdx}" value="TV Layar Datar" checked class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-tv text-blue-500 w-3.5"></i> TV Layar Datar</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white cursor-pointer transition select-none">
          <input type="checkbox" name="room_facility_${currentIdx}" value="Perlengkapan Mandi Gratis" checked class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-pump-soap text-blue-500 w-3.5"></i> Perlengkapan Mandi</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white cursor-pointer transition select-none">
          <input type="checkbox" name="room_facility_${currentIdx}" value="Balkon / Teras" class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-mountain-sun text-blue-500 w-3.5"></i> Balkon / Teras</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white cursor-pointer transition select-none">
          <input type="checkbox" name="room_facility_${currentIdx}" value="Kulkas / Mini Bar" class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-temperature-low text-blue-500 w-3.5"></i> Mini Bar / Kulkas</span>
        </label>

        <label class="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 bg-white cursor-pointer transition select-none">
          <input type="checkbox" name="room_facility_${currentIdx}" value="Kopi & Teh Gratis" class="w-4 h-4 text-blue-600 rounded">
          <span class="text-slate-700 flex items-center gap-1.5"><i class="fa-solid fa-mug-hot text-blue-500 w-3.5"></i> Kopi & Teh Gratis</span>
        </label>
      </div>

      <!-- Input Tambahan Fasilitas Khusus (Opsional) -->
      <div class="mt-2.5">
        <input type="text" name="room_custom_facs[]" placeholder="+ Tambah fasilitas lainnya (opsional, pisahkan dengan koma)" class="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500">
      </div>
    </div>

    <!-- Foto Khusus Tipe Kamar Tambahan -->
    <div class="pt-3 border-t border-blue-200">
      <div class="flex items-center justify-between mb-2">
        <div>
          <label class="block text-xs font-bold text-slate-800">
            <i class="fa-solid fa-camera text-blue-600 mr-1"></i> Foto Tipe Kamar #${currentIdx} <span class="text-slate-400 font-normal">(Opsional / Dianjurkan)</span>
          </label>
          <p class="text-[11px] text-slate-500">Unggah foto suasana kasur, kamar mandi, atau interior unit ini.</p>
        </div>
        <span class="text-[10px] text-blue-700 bg-white font-bold px-2.5 py-0.5 rounded-full border border-blue-200" id="room-photo-count-${currentIdx}">0 Foto</span>
      </div>

      <!-- Grid Foto Kamar & Tombol Upload -->
      <div class="space-y-2">
        <div id="room-photos-grid-${currentIdx}" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <!-- Slot Upload Foto -->
          <label class="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[96px] group shadow-2xs">
            <input type="file" accept="image/*" multiple onchange="handleRoomPhotoSelect(event, ${currentIdx})" class="hidden" id="room-file-input-${currentIdx}">
            <div class="w-8 h-8 rounded-full bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center text-xs mb-1.5 transition">
              <i class="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <span class="text-[11px] font-bold text-blue-700 leading-tight">+ Tambah Foto</span>
            <span class="text-[9px] text-slate-400 mt-0.5">Pilih dari perangkat</span>
          </label>
        </div>

        <!-- Pilihan URL Foto (Opsional) -->
        <div class="flex items-center justify-between pt-1">
          <button type="button" onclick="toggleRoomUrlInput(${currentIdx})" class="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition">
            <i class="fa-solid fa-link text-[10px]"></i>
            <span>Atau gunakan link URL foto</span>
          </button>
          <span class="text-[10px] text-slate-400">Format: JPG, PNG, WebP</span>
        </div>

        <div id="room-url-box-${currentIdx}" class="hidden flex gap-2 pt-1">
          <input type="url" id="room-url-input-${currentIdx}" placeholder="https://images.unsplash.com/photo-... (link gambar)" class="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500">
          <button type="button" onclick="addRoomPhotoFromUrl(${currentIdx})" class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition">
            Tambah
          </button>
        </div>
      </div>
    </div>
  `;

  container.appendChild(roomDiv);
  updateLivePreview();
}

function removeRoomType(id) {
  const el = document.getElementById(`room-card-${id}`);
  if (el) {
    el.remove();
    delete roomPhotos[id];
    updateLivePreview();
  }
}

// Handle Form Submission
async function handleTeraFormSubmit(e) {
  e.preventDefault();

  const btnSubmit = document.getElementById('btn-submit-tera');
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Mendaftarkan ke StayYK...</span>`;

  try {
    // Collect Facilities
    const facilities = Array.from(document.querySelectorAll('input[name="prop_facility"]:checked')).map(c => c.value);

    // Collect Data
    const propType = currentPropType;
    let stars = null;
    if (propType === 'hotel') {
      const selectedStarEl = document.querySelector('input[name="hotel_stars"]:checked');
      stars = selectedStarEl ? parseInt(selectedStarEl.value, 10) : 3;
    }

    // Property Photos
    const propertyPhotos = (uploadedPhotos && uploadedPhotos.length > 0)
      ? uploadedPhotos
      : [document.getElementById('tera-photo-main').value.trim()].filter(Boolean);

    const finalPhotos = propertyPhotos.length > 0
      ? propertyPhotos
      : ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'];

    // Collect All Room Units
    const roomCards = document.querySelectorAll('.room-card');
    const unitsPayload = [];

    roomCards.forEach((card, idx) => {
      const cardRoomIdx = card.getAttribute('data-room-idx') || (idx + 1);
      const nameEl = card.querySelector('[name="room_name[]"]') || card.querySelector('#tera-room-name');
      const bedEl = card.querySelector('[name="room_bed[]"]') || card.querySelector('#tera-room-bed');
      const priceEl = card.querySelector('[name="room_price[]"]') || card.querySelector('#tera-room-price');
      const stockEl = card.querySelector('[name="room_stock[]"]') || card.querySelector('#tera-room-stock');
      const capEl = card.querySelector('[name="room_capacity[]"]') || card.querySelector('#tera-room-capacity');

      // Collect checked checkboxes inside this specific card
      const checkedBoxes = Array.from(card.querySelectorAll('input[type="checkbox"]:checked'))
        .filter(cb => cb.name && cb.name.startsWith('room_facility_'))
        .map(cb => cb.value);

      // Collect custom typed facilities if any
      const customFacsInput = card.querySelector('input[name="room_custom_facs[]"]');
      let customFacs = [];
      if (customFacsInput && customFacsInput.value.trim()) {
        customFacs = customFacsInput.value.split(',').map(f => f.trim()).filter(Boolean);
      }

      const allFacs = [...checkedBoxes, ...customFacs];
      const rFacs = allFacs.length > 0 ? allFacs : ['AC', 'WiFi Gratis', 'Kamar Mandi Dalam', 'Air Panas'];

      const rName = nameEl ? nameEl.value.trim() : `Tipe Kamar ${idx + 1}`;
      const rPrice = priceEl ? parseFloat(priceEl.value) : 450000;
      const rStock = stockEl ? parseInt(stockEl.value, 10) : 3;
      const rCap = capEl ? parseInt(capEl.value, 10) : 2;
      const rBed = bedEl ? bedEl.value : '1 King Bed';

      // Photos specific to this room, or fallback to property main photos
      const thisRoomPhotos = (roomPhotos[cardRoomIdx] && roomPhotos[cardRoomIdx].length > 0)
        ? roomPhotos[cardRoomIdx]
        : finalPhotos;

      if (rName && !isNaN(rPrice)) {
        unitsPayload.push({
          name: rName,
          price: rPrice,
          available_stock: rStock,
          capacity: rCap,
          bed_type: rBed,
          facilities: rFacs,
          photos: thisRoomPhotos
        });
      }
    });

    const payload = {
      name: document.getElementById('tera-prop-name').value.trim(),
      type: propType,
      stars: stars,
      area: document.getElementById('tera-prop-area').value,
      address: document.getElementById('tera-prop-address').value.trim(),
      postal_code: document.getElementById('tera-prop-postal').value.trim(),
      gmaps_url: document.getElementById('tera-prop-gmaps') ? document.getElementById('tera-prop-gmaps').value.trim() : '',
      description: document.getElementById('tera-prop-desc').value.trim(),
      facilities: facilities,
      photos: finalPhotos,
      
      // PIC
      pic_name: document.getElementById('tera-pic-name').value.trim(),
      pic_phone: document.getElementById('tera-pic-phone').value.trim(),
      pic_email: document.getElementById('tera-pic-email').value.trim(),

      // Multiple Room Units
      units: unitsPayload,

      // Fallback single room unit
      unit_name: unitsPayload[0]?.name || document.getElementById('tera-room-name').value.trim(),
      unit_bed: unitsPayload[0]?.bed_type || document.getElementById('tera-room-bed').value,
      unit_price: unitsPayload[0]?.price || parseFloat(document.getElementById('tera-room-price').value),
      unit_stock: unitsPayload[0]?.available_stock || parseInt(document.getElementById('tera-room-stock').value, 10),
      unit_capacity: unitsPayload[0]?.capacity || parseInt(document.getElementById('tera-room-capacity').value, 10),
      unit_facilities: unitsPayload[0]?.facilities || ['AC', 'WiFi Gratis', 'Kamar Mandi Pribadi', 'Air Panas'],
      unit_photo: finalPhotos[0],

      // Payout Bank
      bank_name: document.getElementById('tera-bank-name').value,
      bank_account: document.getElementById('tera-bank-account').value.trim(),
      bank_holder: document.getElementById('tera-bank-holder').value.trim(),
      ktp_number: document.getElementById('tera-ktp-number').value.trim()
    };

    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      if (res.status === 413) {
        throw new Error('Ukuran foto terlalu besar. Silakan pilih foto dengan resolusi lebih kecil atau kurangi jumlah foto.');
      }
      throw new Error(`Server error (${res.status}): ${text.slice(0, 100)}`);
    }

    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<i class="fa-solid fa-check-circle"></i> <span>Kirim Pendaftaran Mitra StayYK</span>`;

    if (!data.success) {
      alert(data.message || 'Gagal mendaftarkan properti.');
      return;
    }

    // Populate Success Modal
    document.getElementById('modal-success-prop-name').textContent = payload.name;
    document.getElementById('modal-success-prop-type').textContent = `${payload.type.toUpperCase()}${payload.stars ? ' ★' + payload.stars : ''} • ${payload.area}`;
    
    const minPrice = unitsPayload.reduce((min, u) => u.price < min ? u.price : min, unitsPayload[0]?.price || payload.unit_price);
    document.getElementById('modal-success-prop-price').textContent = `${formatRupiah(minPrice)} / malam (${unitsPayload.length} Tipe Kamar)`;

    // Show modal
    document.getElementById('tera-success-modal').classList.remove('hidden');

  } catch (err) {
    console.error('Error submitting StayYK registration:', err);
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<i class="fa-solid fa-check-circle"></i> <span>Kirim Pendaftaran Mitra StayYK</span>`;
    alert(`Gagal mengirim pendaftaran: ${err.message || 'Periksa apakah server masih berjalan di terminal Anda.'}`);
  }
}

// Test / Open Google Maps link from input
function testGmapsUrl() {
  const input = document.getElementById('tera-prop-gmaps');
  let url = input ? input.value.trim() : '';
  if (!url) {
    const name = document.getElementById('tera-prop-name')?.value || '';
    const addr = document.getElementById('tera-prop-address')?.value || '';
    url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((name + ' ' + addr).trim() || 'Yogyakarta')}`;
  }
  window.open(url, '_blank');
}
