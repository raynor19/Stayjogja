const fs = require('fs');

const replacement = `<button type="button" onclick="selectArea('all', 'Semua Wilayah Yogyakarta')" data-area="all" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between font-semibold text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-map-location-dot text-blue-900 mr-2"></i> Semua Wilayah Yogyakarta</span>
                  <span class="text-[10px] text-slate-400">DIY</span>
                </button>
                <button type="button" onclick="selectArea('Malioboro', 'Malioboro & Stasiun Tugu')" data-area="Malioboro" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-train-subway text-amber-600 mr-2"></i> Malioboro & Stasiun Tugu</span>
                  <span class="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">Paling Populer</span>
                </button>
                <button type="button" onclick="selectArea('Prawirotaman', 'Prawirotaman & Kotabaru')" data-area="Prawirotaman" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-mosque text-emerald-600 mr-2"></i> Prawirotaman & Kotabaru</span>
                  <span class="text-[10px] text-slate-400">Budaya & Seni</span>
                </button>
                <button type="button" onclick="selectArea('Sleman', 'Sleman / Dekat Kampus UGM')" data-area="Sleman" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-graduation-cap text-purple-600 mr-2"></i> Sleman / Dekat Kampus UGM</span>
                  <span class="text-[10px] text-slate-400">Ringroad Utara</span>
                </button>
                <button type="button" onclick="selectArea('Kaliurang', 'Kaliurang / Lereng Merapi')" data-area="Kaliurang" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-mountain text-slate-600 mr-2"></i> Kaliurang / Lereng Merapi</span>
                  <span class="text-[10px] text-slate-400">Sejuk & Villa</span>
                </button>
                <button type="button" onclick="selectArea('Bantul', 'Bantul & Parangtritis')" data-area="Bantul" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-umbrella-beach text-blue-500 mr-2"></i> Bantul & Parangtritis</span>
                  <span class="text-[10px] text-slate-400">Alam & Pantai</span>
                </button>
                <button type="button" onclick="selectArea('Kulon Progo', 'Kulon Progo / YIA')" data-area="Kulon Progo" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-plane-departure text-sky-600 mr-2"></i> Kulon Progo / YIA</span>
                  <span class="text-[10px] text-slate-400">Bandara</span>
                </button>
                <button type="button" onclick="selectArea('Gunungkidul', 'Gunungkidul / Pantai Selatan')" data-area="Gunungkidul" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-water text-cyan-600 mr-2"></i> Gunungkidul / Pantai Selatan</span>
                  <span class="text-[10px] text-slate-400">Pantai & Resort</span>
                </button>
                <button type="button" onclick="selectArea('Kotagede', 'Kotagede')" data-area="Kotagede" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-vihara text-amber-700 mr-2"></i> Kotagede</span>
                  <span class="text-[10px] text-slate-400">Sejarah & Budaya</span>
                </button>
                <button type="button" onclick="selectArea('Seturan', 'Seturan & Babarsari')" data-area="Seturan" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-building text-slate-500 mr-2"></i> Seturan & Babarsari</span>
                  <span class="text-[10px] text-slate-400">Kampus & Kuliner</span>
                </button>
                <button type="button" onclick="selectArea('Prambanan', 'Prambanan')" data-area="Prambanan" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-monument text-slate-600 mr-2"></i> Prambanan</span>
                  <span class="text-[10px] text-slate-400">Candi & Wisata</span>
                </button>
                <button type="button" onclick="selectArea('Dlingo', 'Dlingo / Mangunan')" data-area="Dlingo" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-700 cursor-pointer">
                  <span><i class="fa-solid fa-tree text-emerald-700 mr-2"></i> Dlingo / Mangunan</span>
                  <span class="text-[10px] text-slate-400">Alam & Pegunungan</span>
                </button>`;

const lines = fs.readFileSync('public/index.html', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('class="max-h-56 overflow-y-auto space-y-1 pt-1"'));
const end = lines.findIndex((l, i) => i > start && l.includes('</div>') && lines[i+1].includes('</div>'));

if (start !== -1 && end !== -1) {
  const newLines = [
    ...lines.slice(0, start + 1),
    replacement,
    ...lines.slice(end)
  ];
  fs.writeFileSync('public/index.html', newLines.join('\n'));
  console.log('Successfully updated destinations in index.html');
} else {
  console.log('Failed to find bounds:', start, end);
}
