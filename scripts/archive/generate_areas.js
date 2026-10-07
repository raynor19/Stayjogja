const data = {
  "Kota Yogyakarta": ["Malioboro", "Prawirotaman", "Kotabaru", "Kotagede", "Beringharjo", "Keraton", "Alun-Alun Kidul", "Mantrijeron", "Sosromenduran", "Ngampilan", "Pakualaman", "Kauman", "Kraton", "Lempuyangan", "Gondokusuman", "Wirobrajan", "Gedongtengen", "Umbulharjo", "Mergangsan", "Tegalrejo"],
  "Kabupaten Sleman": ["Depok", "Seturan", "Babarsari", "Caturtunggal", "Condongcatur", "Karangasem", "Gejayan", "Jalan Kaliurang", "Pogung", "Sinduadi", "Mlati", "Kaliurang", "Pakem", "Cangkringan", "Ngaglik", "Gamping", "Berbah", "Kalasan", "Prambanan", "Ngemplak", "Tempel", "Seyegan", "Minggir", "Moyudan", "Turi"],
  "Kabupaten Bantul": ["Parangtritis", "Depok", "Samas", "Goa Cemara", "Kuwaru", "Pandansimo", "Dlingo", "Mangunan", "Imogiri", "Kasihan", "Kasongan", "Sewon", "Banguntapan", "Piyungan", "Pleret", "Pajangan", "Sedayu"],
  "Kabupaten Kulon Progo": ["Temon", "YIA", "Glagah", "Congot", "Wates", "Kalibawang", "Samigaluh", "Girimulyo", "Kokap", "Nanggulan", "Panjatan", "Sentolo"],
  "Kabupaten Gunungkidul": ["Wonosari", "Baron", "Kukup", "Krakal", "Drini", "Indrayanti", "Sadranan", "Pok Tunggal", "Siung", "Timang", "Nglambor", "Wediombo", "Jungwok", "Sepanjang", "Patuk", "Nglipar", "Semanu", "Tepus", "Tanjungsari", "Saptosari", "Purwosari"]
};

let html = `<button type="button" onclick="selectArea('all', 'Semua Wilayah Yogyakarta')" data-area="all" class="area-item-btn w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between font-semibold text-slate-700 cursor-pointer">
  <span><i class="fa-solid fa-map-location-dot text-blue-900 mr-2"></i> Semua Wilayah Yogyakarta</span>
  <span class="text-[10px] text-slate-400">DIY</span>
</button>\n`;

for (const [region, areas] of Object.entries(data)) {
  html += `\n<div class="px-3 py-1 mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">${region}</div>\n`;
  for (const area of areas) {
    html += `<button type="button" onclick="selectArea('${area}', '${area}, ${region}')" data-area="${area}" class="area-item-btn w-full text-left px-4 py-1.5 rounded-lg hover:bg-amber-50 hover:text-amber-800 transition flex items-center justify-between text-slate-600 cursor-pointer text-xs">
  <span>${area}</span>
</button>\n`;
  }
}

const fs = require('fs');
const lines = fs.readFileSync('public/index.html', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('class="max-h-56 overflow-y-auto space-y-1 pt-1"'));
const end = lines.findIndex((l, i) => i > start && l.includes('</div>') && lines[i+1].includes('</div>'));

if (start !== -1 && end !== -1) {
  const newLines = [
    ...lines.slice(0, start + 1),
    html,
    ...lines.slice(end)
  ];
  fs.writeFileSync('public/index.html', newLines.join('\n'));
  console.log('Successfully generated extensive area list in index.html');
} else {
  console.log('Failed to find bounds:', start, end);
}
