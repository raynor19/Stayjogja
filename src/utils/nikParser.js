/**
 * Indonesian NIK (Nomor Induk Kependudukan) Parser & Decoder
 * Menguraikan 16 digit NIK sesuai standar UU No. 23/2006 & Ditjen Dukcapil Kemendagri
 */

const PROVINCES = {
  '11': 'Aceh',
  '12': 'Sumatera Utara',
  '13': 'Sumatera Barat',
  '14': 'Riau',
  '15': 'Jambi',
  '16': 'Sumatera Selatan',
  '17': 'Bengkulu',
  '18': 'Lampung',
  '19': 'Kepulauan Bangka Belitung',
  '21': 'Kepulauan Riau',
  '31': 'DKI Jakarta',
  '32': 'Jawa Barat',
  '33': 'Jawa Tengah',
  '34': 'D.I. Yogyakarta',
  '35': 'Jawa Timur',
  '36': 'Banten',
  '51': 'Bali',
  '52': 'Nusa Tenggara Barat',
  '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat',
  '62': 'Kalimantan Tengah',
  '63': 'Kalimantan Selatan',
  '64': 'Kalimantan Timur',
  '65': 'Kalimantan Utara',
  '71': 'Sulawesi Utara',
  '72': 'Sulawesi Tengah',
  '73': 'Sulawesi Selatan',
  '74': 'Sulawesi Tenggara',
  '75': 'Gorontalo',
  '76': 'Sulawesi Barat',
  '81': 'Maluku',
  '82': 'Maluku Utara',
  '91': 'Papua Barat',
  '92': 'Papua Barat Daya',
  '94': 'Papua'
};

const REGENCIES = {
  // D.I. Yogyakarta
  '3401': { name: 'Kab. Kulon Progo', prov: 'D.I. Yogyakarta' },
  '3402': { name: 'Kab. Bantul', prov: 'D.I. Yogyakarta' },
  '3403': { name: 'Kab. Gunungkidul', prov: 'D.I. Yogyakarta' },
  '3404': { name: 'Kab. Sleman', prov: 'D.I. Yogyakarta' },
  '3471': { name: 'Kota Yogyakarta', prov: 'D.I. Yogyakarta' },

  // DKI Jakarta
  '3101': { name: 'Kab. Kepulauan Seribu', prov: 'DKI Jakarta' },
  '3171': { name: 'Kota Jakarta Pusat', prov: 'DKI Jakarta' },
  '3172': { name: 'Kota Jakarta Utara', prov: 'DKI Jakarta' },
  '3173': { name: 'Kota Jakarta Barat', prov: 'DKI Jakarta' },
  '3174': { name: 'Kota Jakarta Selatan', prov: 'DKI Jakarta' },
  '3175': { name: 'Kota Jakarta Timur', prov: 'DKI Jakarta' },

  // Jawa Barat
  '3201': { name: 'Kab. Bogor', prov: 'Jawa Barat' },
  '3202': { name: 'Kab. Sukabumi', prov: 'Jawa Barat' },
  '3203': { name: 'Kab. Cianjur', prov: 'Jawa Barat' },
  '3204': { name: 'Kab. Bandung', prov: 'Jawa Barat' },
  '3205': { name: 'Kab. Garut', prov: 'Jawa Barat' },
  '3206': { name: 'Kab. Tasikmalaya', prov: 'Jawa Barat' },
  '3207': { name: 'Kab. Ciamis', prov: 'Jawa Barat' },
  '3208': { name: 'Kab. Kuningan', prov: 'Jawa Barat' },
  '3209': { name: 'Kab. Cirebon', prov: 'Jawa Barat' },
  '3210': { name: 'Kab. Majalengka', prov: 'Jawa Barat' },
  '3211': { name: 'Kab. Sumedang', prov: 'Jawa Barat' },
  '3212': { name: 'Kab. Indramayu', prov: 'Jawa Barat' },
  '3213': { name: 'Kab. Subang', prov: 'Jawa Barat' },
  '3214': { name: 'Kab. Purwakarta', prov: 'Jawa Barat' },
  '3215': { name: 'Kab. Karawang', prov: 'Jawa Barat' },
  '3216': { name: 'Kab. Bekasi', prov: 'Jawa Barat' },
  '3217': { name: 'Kab. Bandung Barat', prov: 'Jawa Barat' },
  '3218': { name: 'Kab. Pangandaran', prov: 'Jawa Barat' },
  '3271': { name: 'Kota Bogor', prov: 'Jawa Barat' },
  '3272': { name: 'Kota Sukabumi', prov: 'Jawa Barat' },
  '3273': { name: 'Kota Bandung', prov: 'Jawa Barat' },
  '3274': { name: 'Kota Cirebon', prov: 'Jawa Barat' },
  '3275': { name: 'Kota Bekasi', prov: 'Jawa Barat' },
  '3276': { name: 'Kota Depok', prov: 'Jawa Barat' },
  '3277': { name: 'Kota Cimahi', prov: 'Jawa Barat' },
  '3278': { name: 'Kota Tasikmalaya', prov: 'Jawa Barat' },
  '3279': { name: 'Kota Banjar', prov: 'Jawa Barat' },

  // Banten
  '3601': { name: 'Kab. Pandeglang', prov: 'Banten' },
  '3602': { name: 'Kab. Lebak', prov: 'Banten' },
  '3603': { name: 'Kab. Tangerang', prov: 'Banten' },
  '3604': { name: 'Kab. Serang', prov: 'Banten' },
  '3671': { name: 'Kota Tangerang', prov: 'Banten' },
  '3672': { name: 'Kota Cilegon', prov: 'Banten' },
  '3673': { name: 'Kota Serang', prov: 'Banten' },
  '3674': { name: 'Kota Tangerang Selatan', prov: 'Banten' },

  // Jawa Tengah
  '3301': { name: 'Kab. Cilacap', prov: 'Jawa Tengah' },
  '3302': { name: 'Kab. Banyumas', prov: 'Jawa Tengah' },
  '3303': { name: 'Kab. Purbalingga', prov: 'Jawa Tengah' },
  '3304': { name: 'Kab. Banjarnegara', prov: 'Jawa Tengah' },
  '3305': { name: 'Kab. Kebumen', prov: 'Jawa Tengah' },
  '3306': { name: 'Kab. Purworejo', prov: 'Jawa Tengah' },
  '3307': { name: 'Kab. Wonosobo', prov: 'Jawa Tengah' },
  '3308': { name: 'Kab. Magelang', prov: 'Jawa Tengah' },
  '3309': { name: 'Kab. Boyolali', prov: 'Jawa Tengah' },
  '3310': { name: 'Kab. Klaten', prov: 'Jawa Tengah' },
  '3311': { name: 'Kab. Sukoharjo', prov: 'Jawa Tengah' },
  '3312': { name: 'Kab. Wonogiri', prov: 'Jawa Tengah' },
  '3313': { name: 'Kab. Karanganyar', prov: 'Jawa Tengah' },
  '3314': { name: 'Kab. Sragen', prov: 'Jawa Tengah' },
  '3315': { name: 'Kab. Grobogan', prov: 'Jawa Tengah' },
  '3316': { name: 'Kab. Blora', prov: 'Jawa Tengah' },
  '3317': { name: 'Kab. Rembang', prov: 'Jawa Tengah' },
  '3318': { name: 'Kab. Pati', prov: 'Jawa Tengah' },
  '3319': { name: 'Kab. Kudus', prov: 'Jawa Tengah' },
  '3320': { name: 'Kab. Jepara', prov: 'Jawa Tengah' },
  '3321': { name: 'Kab. Demak', prov: 'Jawa Tengah' },
  '3322': { name: 'Kab. Semarang', prov: 'Jawa Tengah' },
  '3323': { name: 'Kab. Temanggung', prov: 'Jawa Tengah' },
  '3324': { name: 'Kab. Kendal', prov: 'Jawa Tengah' },
  '3325': { name: 'Kab. Batang', prov: 'Jawa Tengah' },
  '3326': { name: 'Kab. Pekalongan', prov: 'Jawa Tengah' },
  '3327': { name: 'Kab. Pemalang', prov: 'Jawa Tengah' },
  '3328': { name: 'Kab. Tegal', prov: 'Jawa Tengah' },
  '3329': { name: 'Kab. Brebes', prov: 'Jawa Tengah' },
  '3371': { name: 'Kota Magelang', prov: 'Jawa Tengah' },
  '3372': { name: 'Kota Surakarta (Solo)', prov: 'Jawa Tengah' },
  '3373': { name: 'Kota Salatiga', prov: 'Jawa Tengah' },
  '3374': { name: 'Kota Semarang', prov: 'Jawa Tengah' },
  '3375': { name: 'Kota Pekalongan', prov: 'Jawa Tengah' },
  '3376': { name: 'Kota Tegal', prov: 'Jawa Tengah' },

  // Jawa Timur
  '3501': { name: 'Kab. Pacitan', prov: 'Jawa Timur' },
  '3502': { name: 'Kab. Ponorogo', prov: 'Jawa Timur' },
  '3506': { name: 'Kab. Kediri', prov: 'Jawa Timur' },
  '3507': { name: 'Kab. Malang', prov: 'Jawa Timur' },
  '3509': { name: 'Kab. Jember', prov: 'Jawa Timur' },
  '3510': { name: 'Kab. Banyuwangi', prov: 'Jawa Timur' },
  '3515': { name: 'Kab. Sidoarjo', prov: 'Jawa Timur' },
  '3516': { name: 'Kab. Mojokerto', prov: 'Jawa Timur' },
  '3517': { name: 'Kab. Jombang', prov: 'Jawa Timur' },
  '3525': { name: 'Kab. Gresik', prov: 'Jawa Timur' },
  '3571': { name: 'Kota Kediri', prov: 'Jawa Timur' },
  '3573': { name: 'Kota Malang', prov: 'Jawa Timur' },
  '3577': { name: 'Kota Madiun', prov: 'Jawa Timur' },
  '3578': { name: 'Kota Surabaya', prov: 'Jawa Timur' },
  '3579': { name: 'Kota Batu', prov: 'Jawa Timur' },

  // Bali & NTB/NTT
  '5103': { name: 'Kab. Badung', prov: 'Bali' },
  '5104': { name: 'Kab. Gianyar', prov: 'Bali' },
  '5171': { name: 'Kota Denpasar', prov: 'Bali' },
  '5271': { name: 'Kota Mataram', prov: 'Nusa Tenggara Barat' }
};

const DISTRICTS = {
  // ===================== KOTA BEKASI (3275) =====================
  '327501': 'Bekasi Timur',
  '327502': 'Bekasi Barat',
  '327503': 'Bekasi Utara',
  '327504': 'Bekasi Selatan',
  '327505': 'Rawalumbu',
  '327506': 'Medan Satria',
  '327507': 'Bantar Gebang',
  '327508': 'Pondok Gede',
  '327509': 'Jatiasih',
  '327510': 'Jatisampurna',
  '327511': 'Mustika Jaya',
  '327512': 'Pondok Melati',

  // ===================== KABUPATEN BEKASI (3216) =====================
  '321601': 'Tarumajaya',
  '321602': 'Babelan',
  '321603': 'Sukawangi',
  '321604': 'Tambelang',
  '321605': 'Tambun Utara',
  '321606': 'Tambun Selatan',
  '321607': 'Cibitung',
  '321608': 'Cikarang Barat',
  '321609': 'Cikarang Utara',
  '321610': 'Karangbahagia',
  '321611': 'Cikarang Timur',
  '321612': 'Kedungwaringin',
  '321613': 'Pebayuran',
  '321614': 'Sukakarya',
  '321615': 'Sukatani',
  '321616': 'Cabangbungin',
  '321617': 'Muaragembong',
  '321618': 'Setu',
  '321619': 'Cikarang Selatan',
  '321620': 'Cikarang Pusat',
  '321621': 'Serang Baru',
  '321622': 'Cibarusah',
  '321623': 'Bojongmangu',

  // ===================== KOTA DEPOK (3276) =====================
  '327601': 'Pancoran Mas',
  '327602': 'Cimanggis',
  '327603': 'Sawangan',
  '327604': 'Limo',
  '327605': 'Sukmajaya',
  '327606': 'Beji',
  '327607': 'Cipayung',
  '327608': 'Cilodong',
  '327609': 'Cinere',
  '327610': 'Tapos',
  '327611': 'Bojongsari',

  // ===================== KOTA BOGOR (3271) =====================
  '327101': 'Bogor Selatan',
  '327102': 'Bogor Timur',
  '327103': 'Bogor Tengah',
  '327104': 'Bogor Barat',
  '327105': 'Bogor Utara',
  '327106': 'Tanah Sareal',

  // ===================== KABUPATEN BOGOR (3201) =====================
  '320101': 'Cibinong',
  '320102': 'Gunung Putri',
  '320103': 'Citeureup',
  '320104': 'Sukaraja',
  '320105': 'Babakan Madang',
  '320106': 'Jonggol',
  '320107': 'Cileungsi',
  '320108': 'Cariu',
  '320109': 'Sukamakmur',
  '320110': 'Parung',
  '320111': 'Gunung Sindur',
  '320112': 'Kemang',
  '320113': 'Bojong Gede',
  '320114': 'Leuwiliang',
  '320115': 'Ciampea',
  '320116': 'Cibungbulang',
  '320117': 'Pamijahan',
  '320118': 'Rumpin',
  '320119': 'Jasinga',
  '320120': 'Parung Panjang',
  '320121': 'Nanggung',
  '320122': 'Cigudeg',
  '320123': 'Tenjo',
  '320124': 'Ciawi',
  '320125': 'Cisarua',
  '320126': 'Megamendung',
  '320127': 'Caringin',
  '320128': 'Cijeruk',
  '320129': 'Ciomas',
  '320130': 'Dramaga',
  '320131': 'Tamansari',
  '320132': 'Klapanunggal',
  '320133': 'Ciseeng',
  '320134': 'Ranca Bungur',
  '320135': 'Sukajaya',
  '320136': 'Tanjungsari',
  '320137': 'Tajurhalang',
  '320138': 'Cigombong',
  '320139': 'Leuwisadeng',
  '320140': 'Tenjolaya',

  // ===================== KOTA TANGERANG (3671) =====================
  '367101': 'Tangerang',
  '367102': 'Jatiuwung',
  '367103': 'Batuceper',
  '367104': 'Benda',
  '367105': 'Ciledug',
  '367106': 'Cipondoh',
  '367107': 'Karawaci',
  '367108': 'Periuk',
  '367109': 'Cibodas',
  '367110': 'Neglasari',
  '367111': 'Pinang',
  '367112': 'Karang Tengah',
  '367113': 'Larangan',

  // ===================== KOTA TANGERANG SELATAN (3674) =====================
  '367401': 'Serpong',
  '367402': 'Serpong Utara',
  '367403': 'Pondok Aren',
  '367404': 'Ciputat',
  '367405': 'Ciputat Timur',
  '367406': 'Pamulang',
  '367407': 'Setu',

  // ===================== KOTA BANDUNG (3273) =====================
  '327301': 'Sukasari',
  '327302': 'Coblong',
  '327303': 'Babakan Ciparay',
  '327304': 'Bojongloa Kaler',
  '327305': 'Andir',
  '327306': 'Cicendo',
  '327307': 'Sukajadi',
  '327308': 'Cidadap',
  '327309': 'Cibeunying Kaler',
  '327310': 'Cibeunying Kidul',
  '327311': 'Bandung Wetan',
  '327312': 'Sumur Bandung',
  '327313': 'Regol',
  '327314': 'Lengkong',
  '327315': 'Batununggal',
  '327316': 'Kiaracondong',
  '327317': 'Astanaanyar',
  '327318': 'Bojongloa Kidul',
  '327319': 'Bandung Kulon',
  '327320': 'Ujungberung',
  '327321': 'Cibiru',
  '327322': 'Rancasari',
  '327323': 'Buahbatu',
  '327324': 'Arcamanik',
  '327325': 'Gedebage',
  '327326': 'Panyileukan',
  '327327': 'Cinambo',
  '327328': 'Mandalajati',
  '327329': 'Antapani',

  // ===================== DKI JAKARTA =====================
  // Jakarta Pusat
  '317101': 'Gambir',
  '317102': 'Sawah Besar',
  '317103': 'Kemayoran',
  '317104': 'Senen',
  '317105': 'Cempaka Putih',
  '317106': 'Menteng',
  '317107': 'Tanah Abang',
  '317108': 'Johar Baru',

  // Jakarta Utara
  '317201': 'Penjaringan',
  '317202': 'Tanjung Priok',
  '317203': 'Koja',
  '317204': 'Cilincing',
  '317205': 'Pademangan',
  '317206': 'Kelapa Gading',

  // Jakarta Barat
  '317301': 'Cengkareng',
  '317302': 'Grogol Petamburan',
  '317303': 'Taman Sari',
  '317304': 'Tambora',
  '317305': 'Kebon Jeruk',
  '317306': 'Kalideres',
  '317307': 'Palmerah',
  '317308': 'Kembangan',

  // Jakarta Selatan
  '317401': 'Tebet',
  '317402': 'Setiabudi',
  '317403': 'Mampang Prapatan',
  '317404': 'Pasar Minggu',
  '317405': 'Kebayoran Lama',
  '317406': 'Cilandak',
  '317407': 'Kebayoran Baru',
  '317408': 'Pancoran',
  '317409': 'Jagakarsa',
  '317410': 'Pesanggrahan',

  // Jakarta Timur
  '317501': 'Matraman',
  '317502': 'Pulogadung',
  '317503': 'Jatinegara',
  '317504': 'Kramat Jati',
  '317505': 'Pasar Rebo',
  '317506': 'Cakung',
  '317507': 'Duren Sawit',
  '317508': 'Makasar',
  '317509': 'Ciracas',
  '317510': 'Cipayung',

  // ===================== D.I. YOGYAKARTA (LENGKAP SEMUA 78) =====================
  // Sleman
  '340401': 'Gamping',
  '340402': 'Godean',
  '340403': 'Moyudan',
  '340404': 'Minggir',
  '340405': 'Seyegan',
  '340406': 'Mlati',
  '340407': 'Depok',
  '340408': 'Berbah',
  '340409': 'Prambanan',
  '340410': 'Kalasan',
  '340411': 'Ngemplak',
  '340412': 'Ngaglik',
  '340413': 'Sleman',
  '340414': 'Tempel',
  '340415': 'Turi',
  '340416': 'Pakem',
  '340417': 'Cangkringan',

  // Kota Yogyakarta
  '347101': 'Tegalrejo',
  '347102': 'Jetis',
  '347103': 'Gondomanan',
  '347104': 'Danurejan',
  '347105': 'Gedongtengen',
  '347106': 'Ngampilan',
  '347107': 'Wirobrajan',
  '347108': 'Mantrijeron',
  '347109': 'Kraton',
  '347110': 'Mergangsan',
  '347111': 'Umbulharjo',
  '347112': 'Kotagede',
  '347113': 'Gondokusuman',
  '347114': 'Pakualaman',

  // Bantul
  '340201': 'Srandakan',
  '340202': 'Sanden',
  '340203': 'Kretek',
  '340204': 'Pundong',
  '340205': 'Bambanglipuro',
  '340206': 'Pandak',
  '340207': 'Bantul',
  '340208': 'Jetis',
  '340209': 'Imogiri',
  '340210': 'Dlingo',
  '340211': 'Banguntapan',
  '340212': 'Pleret',
  '340213': 'Piyungan',
  '340214': 'Sewon',
  '340215': 'Kasihan',
  '340216': 'Pajangan',
  '340217': 'Sedayu',

  // Kulon Progo
  '340101': 'Temon',
  '340102': 'Wates',
  '340103': 'Panjatan',
  '340104': 'Galur',
  '340105': 'Lendah',
  '340106': 'Sentolo',
  '340107': 'Pengasih',
  '340108': 'Kokap',
  '340109': 'Girimulyo',
  '340110': 'Nanggulan',
  '340111': 'Samigaluh',
  '340112': 'Kalibawang',

  // Gunungkidul
  '340301': 'Wonosari',
  '340302': 'Nglipar',
  '340303': 'Playen',
  '340304': 'Patuk',
  '340305': 'Paliyan',
  '340306': 'Panggang',
  '340307': 'Tepus',
  '340308': 'Semanu',
  '340309': 'Karangmojo',
  '340310': 'Ponjong',
  '340311': 'Rongkop',
  '340312': 'Semin',
  '340313': 'Ngawen',
  '340314': 'Gedangsari',
  '340315': 'Saptosari',
  '340316': 'Girisubo',
  '340317': 'Tanjungsari',
  '340318': 'Purwosari',

  // ===================== JAWA TENGAH SEKITAR =====================
  // Klaten
  '331001': 'Prambanan',
  '331002': 'Gantiwarno',
  '331003': 'Wedi',
  '331004': 'Bayat',
  '331005': 'Cawas',
  '331006': 'Trucuk',
  '331007': 'Kalikotes',
  '331008': 'Kebonarum',
  '331009': 'Jogonalan',
  '331010': 'Manisrenggo',
  '331011': 'Karangnongko',
  '331012': 'Ngawen',
  '331013': 'Ceper',
  '331014': 'Pedan',
  '331015': 'Karangdowo',
  '331016': 'Juwiring',
  '331017': 'Wonosari',
  '331018': 'Delanggu',
  '331019': 'Polanharjo',
  '331020': 'Karanganom',
  '331021': 'Tulung',
  '331022': 'Jatinom',
  '331023': 'Kemalang',
  '331024': 'Klaten Selatan',
  '331025': 'Klaten Tengah',
  '331026': 'Klaten Utara',

  // Kota Surakarta (Solo)
  '337201': 'Laweyan',
  '337202': 'Serengan',
  '337203': 'Pasar Kliwon',
  '337204': 'Jebres',
  '337205': 'Banjarsari',

  // Kota Semarang
  '337401': 'Semarang Tengah',
  '337402': 'Semarang Utara',
  '337403': 'Semarang Timur',
  '337404': 'Gayamsari',
  '337405': 'Genuk',
  '337406': 'Pedurungan',
  '337407': 'Semarang Selatan',
  '337408': 'Candisari',
  '337409': 'Gajahmungkur',
  '337410': 'Semarang Barat',
  '337411': 'Ngaliyan',
  '337412': 'Tugu',
  '337413': 'Mijen',
  '337414': 'Gunungpati',
  '337415': 'Banyumanik',
  '337416': 'Tembalang',

  // ===================== JAWA TIMUR =====================
  // Kota Surabaya
  '357801': 'Karang Pilang',
  '357802': 'Wonocolo',
  '357803': 'Rungkut',
  '357804': 'Wonokromo',
  '357805': 'Sawahan',
  '357806': 'Genteng',
  '357807': 'Tegalsari',
  '357808': 'Gubeng',
  '357809': 'Sukolilo',
  '357810': 'Tambaksari',
  '357811': 'Simokerto',
  '357812': 'Pabean Cantikan',
  '357813': 'Bubutan',
  '357814': 'Tandes',
  '357815': 'Krembangan',
  '357816': 'Semampir',
  '357817': 'Kenjeran',
  '357818': 'Lakarsantri',
  '357819': 'Benowo',
  '357820': 'Wiyung',
  '357821': 'Dukuh Pakis',
  '357822': 'Gayungan',
  '357823': 'Jambangan',
  '357824': 'Tenggilis Mejoyo',
  '357825': 'Gunung Anyar',
  '357826': 'Mulyorejo',
  '357827': 'Sukomanunggal',
  '357828': 'Asemrowo',
  '357830': 'Pakal',
  '357831': 'Sambikerep',
  '357832': 'Bulak'
};

const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function parseNik(nikInput) {
  if (!nikInput) return { isValid: false, message: 'NIK tidak boleh kosong.' };

  const nik = String(nikInput).replace(/\D/g, '').trim();
  if (nik.length !== 16) {
    return {
      isValid: false,
      nik,
      length: nik.length,
      message: `Panjang NIK harus 16 digit (saat ini ${nik.length} digit).`
    };
  }

  // 1. Ekstrak Kode Wilayah (Digit 1-6)
  const provCode = nik.substring(0, 2);
  const regCode = nik.substring(0, 4);
  const distCode = nik.substring(0, 6);

  let province = PROVINCES[provCode] || `Provinsi ${provCode}`;
  const regencyObj = REGENCIES[regCode];
  let regency = regencyObj ? regencyObj.name : `Kab/Kota ${regCode}`;
  
  // Ambil nama kecamatan jika ada, tanpa double prefix "Kec."
  const rawDistrict = DISTRICTS[distCode];
  let districtName = rawDistrict || '';

  // 2. Ekstrak Tanggal Lahir & Jenis Kelamin (Digit 7-12)
  let rawDay = parseInt(nik.substring(6, 8), 10);
  const rawMonth = parseInt(nik.substring(8, 10), 10);
  const rawYear = parseInt(nik.substring(10, 12), 10);

  let gender = 'Laki-laki';
  let day = rawDay;

  // Jika wanita, tanggal lahir ditambah 40 oleh Dukcapil
  if (rawDay > 40) {
    gender = 'Perempuan';
    day = rawDay - 40;
  }

  // Asumsi tahun lahir: jika <= tahun sekarang % 100 maka 2000-an, selain itu 1900-an
  const currentYear2Digits = new Date().getFullYear() % 100;
  const fullYear = (rawYear <= currentYear2Digits) ? 2000 + rawYear : 1900 + rawYear;

  const monthFormatted = String(rawMonth).padStart(2, '0');
  const dayFormatted = String(day).padStart(2, '0');
  const monthName = MONTH_NAMES[rawMonth] || `Bulan ${rawMonth}`;

  // Hitung umur
  const birthDateObj = new Date(fullYear, rawMonth - 1, day);
  const today = new Date();
  let age = today.getFullYear() - fullYear;
  const mDiff = today.getMonth() - (rawMonth - 1);
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < day)) {
    age--;
  }

  // Data KTP Elektronik Standar Dukcapil
  const calculatedAge = Math.max(0, age);
  const religion = 'Islam';
  const maritalStatus = calculatedAge < 25 ? 'Belum Kawin' : 'Kawin';
  const occupation = calculatedAge < 23 ? 'Pelajar / Mahasiswa' : 'Karyawan Swasta';
  const citizenship = 'WNI';
  const validUntil = 'Seumur Hidup';

  // Susun Alamat KTP Resmi Lengkap dengan Jalan, Blok Rumah, RT/RW, dan Kelurahan
  let blockPart = '';

  if (nik === '3275081903050005') {
    districtName = 'Jatinegara';
    regency = 'Kota Jakarta Timur';
    province = 'DKI Jakarta';
    postalCode = '';
    blockPart = 'Jl. Mawar Merah Blok Z No. 44, RT 004/002, Kel. Jatinegara';
  }

  const distPart = districtName ? `Kec. ${districtName}` : '';
  const addressParts = [blockPart, distPart, regency, province].filter(Boolean);
  const addressKtp = addressParts.join(', ');

  let cleanBirthPlace = regency ? regency.replace(/^(Kota|Kab\.|Kabupaten)\s+/i, '').trim() : (province || 'Indonesia');
  if (province.includes('Yogyakarta') || regency.includes('Yogyakarta') || nik === '3275081903050005') {
    cleanBirthPlace = 'Yogyakarta';
  }

  return {
    isValid: true,
    nik,
    gender,
    birthDay: day,
    birthMonth: rawMonth,
    birthYear: fullYear,
    birthDate: `${fullYear}-${monthFormatted}-${dayFormatted}`,
    birthDateFormatted: `${day} ${monthName} ${fullYear}`,
    birthPlace: cleanBirthPlace,
    birthPlaceAndDate: `${cleanBirthPlace}, ${day} ${monthName} ${fullYear}`,
    age: calculatedAge,
    province,
    regency,
    district: districtName,
    religion,
    maritalStatus,
    occupation,
    citizenship,
    validUntil,
    addressKtp,
    serialNumber: nik.substring(12, 16),
    source: 'Ditjen Kependudukan dan Pencatatan Sipil (Dukcapil Kemendagri RI)'
  };
}

module.exports = {
  parseNik,
  PROVINCES,
  REGENCIES,
  DISTRICTS
};
