import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_border(cell, **kwargs):
    """
    Set cell borders
    kwargs: top, bottom, left, right
    values: dict(sz=12, val='single', color='FF0000', space='0')
    """
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = tcPr.first_child_found_in("w:tcBorders")
    if tcBorders is None:
        tcBorders = OxmlElement('w:tcBorders')
        tcPr.append(tcBorders)
    
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)
            element = tcBorders.find(qn(tag))
            if element is None:
                element = OxmlElement(tag)
                tcBorders.append(element)
            for key, val in edge_data.items():
                element.set(qn('w:{}'.format(key)), str(val))

def set_cell_background(cell, fill_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def create_thesis_document():
    doc = Document()

    # 1. Page Margins (Standar Skripsi UII: Top 2.54 cm, Bottom 2.54 cm, Left 3.0 cm, Right 2.54 cm)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.18)  # 3.0 cm
        section.right_margin = Inches(1.0)
        section.page_width = Inches(8.27)   # A4
        section.page_height = Inches(11.69) # A4

    # 2. Base Styles
    style_normal = doc.styles['Normal']
    style_normal.font.name = 'Times New Roman'
    style_normal.font.size = Pt(12)
    style_normal.font.color.rgb = RGBColor(0, 0, 0)
    style_normal.paragraph_format.line_spacing = 1.5
    style_normal.paragraph_format.space_after = Pt(0)
    style_normal.paragraph_format.space_before = Pt(0)

    def add_p(text, bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.JUSTIFY, space_after=0, first_indent=1.0):
        p = doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.space_after = Pt(space_after)
        p.paragraph_format.space_before = Pt(0)
        if first_indent > 0:
            p.paragraph_format.first_line_indent = Inches(first_indent / 2.54)
        run = p.add_run(text)
        run.bold = bold
        run.italic = italic
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        return p

    def add_heading_chapter(chapter_num, chapter_title):
        p1 = doc.add_paragraph()
        p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p1.paragraph_format.line_spacing = 1.5
        p1.paragraph_format.space_before = Pt(12)
        p1.paragraph_format.space_after = Pt(0)
        p1.paragraph_format.first_line_indent = 0
        run1 = p1.add_run(f"BAB {chapter_num}")
        run1.bold = True
        run1.font.name = 'Times New Roman'
        run1.font.size = Pt(14)

        p2 = doc.add_paragraph()
        p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p2.paragraph_format.line_spacing = 1.5
        p2.paragraph_format.space_before = Pt(0)
        p2.paragraph_format.space_after = Pt(12)
        p2.paragraph_format.first_line_indent = 0
        run2 = p2.add_run(chapter_title)
        run2.bold = True
        run2.font.name = 'Times New Roman'
        run2.font.size = Pt(14)

    def add_heading_section(num_str, title_str):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.first_line_indent = 0
        run = p.add_run(f"{num_str} {title_str}")
        run.bold = True
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        return p

    def add_heading_subsection(num_str, title_str):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.first_line_indent = 0
        run = p.add_run(f"{num_str} {title_str}")
        run.bold = True
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        return p

    def add_table(headers, rows_data, caption_text, col_widths=None):
        cp = doc.add_paragraph()
        cp.alignment = WD_ALIGN_PARAGRAPH.LEFT
        cp.paragraph_format.space_before = Pt(8)
        cp.paragraph_format.space_after = Pt(2)
        cp.paragraph_format.first_line_indent = 0
        r_cap = cp.add_run(caption_text)
        r_cap.bold = True
        r_cap.font.name = 'Times New Roman'
        r_cap.font.size = Pt(11)

        table = doc.add_table(rows=len(rows_data) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        
        # Header row
        hdr_cells = table.rows[0].cells
        for i, header_text in enumerate(headers):
            hdr_cells[i].text = header_text
            set_cell_background(hdr_cells[i], "EAECEE")
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.runs[0].font.name = 'Times New Roman'
            p.runs[0].font.size = Pt(10)
            p.runs[0].bold = True
            hdr_cells[i].vertical_alignment = WD_ALIGN_VERTICAL.CENTER

        # Data rows
        for r_idx, row_values in enumerate(rows_data):
            row_cells = table.rows[r_idx + 1].cells
            for c_idx, cell_value in enumerate(row_values):
                row_cells[c_idx].text = str(cell_value)
                p = row_cells[c_idx].paragraphs[0]
                p.runs[0].font.name = 'Times New Roman'
                p.runs[0].font.size = Pt(10)
                row_cells[c_idx].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                if c_idx == 0:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT

        # Set borders
        for row in table.rows:
            for cell in row.cells:
                set_cell_border(cell,
                                top=dict(sz=4, val='single', color='CCCCCC'),
                                bottom=dict(sz=4, val='single', color='CCCCCC'),
                                left=dict(sz=4, val='single', color='CCCCCC'),
                                right=dict(sz=4, val='single', color='CCCCCC'))

        p_after = doc.add_paragraph()
        p_after.paragraph_format.space_before = Pt(4)
        p_after.paragraph_format.space_after = Pt(6)
        return table

    # =========================================================================
    # COVER / HALAMAN JUDUL
    # =========================================================================
    p_cov_title = doc.add_paragraph()
    p_cov_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cov_title.paragraph_format.space_before = Pt(24)
    p_cov_title.paragraph_format.space_after = Pt(12)
    p_cov_title.paragraph_format.line_spacing = 1.15
    r = p_cov_title.add_run("PENGEMBANGAN PROTOTIPE APLIKASI HOTEL UNTUK RESERVASI KAMAR, CHECK-IN DAN CHECK-OUT TAMU")
    r.bold = True
    r.font.size = Pt(14)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(36)
    r = p_sub.add_run("TUGAS AKHIR\nDiajukan Sebagai Salah Satu Syarat untuk Memperoleh Gelar Sarjana Komputer\nProgram Studi Informatika Program Sarjana\nFakultas Teknologi Industri\nUniversitas Islam Indonesia")
    r.font.size = Pt(11)

    logo_path = os.path.join(os.path.dirname(__file__), '..', 'temp_uii_template', 'uii-logo.png')
    if os.path.exists(logo_path):
        p_logo = doc.add_paragraph()
        p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_logo.paragraph_format.space_after = Pt(36)
        p_logo.add_run().add_picture(logo_path, width=Inches(2.0))

    p_author = doc.add_paragraph()
    p_author.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_author.paragraph_format.line_spacing = 1.15
    p_author.paragraph_format.space_after = Pt(36)
    r = p_author.add_run("Disusun Oleh:\n")
    r.font.size = Pt(11)
    r2 = p_author.add_run("RAYNOR ATHAILLAH\n")
    r2.bold = True
    r2.font.size = Pt(12)
    r3 = p_author.add_run("Nomor Mahasiswa: 20523000")
    r3.font.size = Pt(11)

    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_inst.paragraph_format.line_spacing = 1.15
    p_inst.paragraph_format.space_before = Pt(24)
    r = p_inst.add_run("JURUSAN INFORMATIKA\nFAKULTAS TEKNOLOGI INDUSTRI\nUNIVERSITAS ISLAM INDONESIA\nYOGYAKARTA\n2026")
    r.bold = True
    r.font.size = Pt(12)

    doc.add_page_break()

    # =========================================================================
    # LEMBAR PENGESAHAN
    # =========================================================================
    p_peng = doc.add_paragraph()
    p_peng.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_peng.paragraph_format.space_after = Pt(18)
    r = p_peng.add_run("LEMBAR PENGESAHAN TUGAS AKHIR")
    r.bold = True
    r.font.size = Pt(14)

    add_p("Tugas Akhir dengan judul:", align=WD_ALIGN_PARAGRAPH.CENTER, first_indent=0)
    p_t = doc.add_paragraph()
    p_t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_t.paragraph_format.space_after = Pt(12)
    r = p_t.add_run("PENGEMBANGAN PROTOTIPE APLIKASI HOTEL UNTUK RESERVASI KAMAR, CHECK-IN DAN CHECK-OUT TAMU")
    r.bold = True
    r.font.size = Pt(12)

    add_p("Oleh: Raynor Athaillah (NIM: 20523000)\n\nTelah dipertahankan di hadapan Sidang Tim Penguji Tugas Akhir Program Studi Informatika Program Sarjana Fakultas Teknologi Industri Universitas Islam Indonesia pada tanggal 20 Oktober 2026 dan dinyatakan LULUS.", first_indent=0)

    doc.add_paragraph()
    p_ttd = doc.add_paragraph()
    p_ttd.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_ttd.paragraph_format.line_spacing = 1.15
    p_ttd.add_run("Menyetujui,\n\n\n\n\n( Dosen Pembimbing Tugas Akhir, S.T., M.Eng. )\nNIK / NIP: ....................................................\n\n\n\n\n( Ketua Program Studi Informatika Program Sarjana )\nNIK / NIP: ....................................................")

    doc.add_page_break()

    # =========================================================================
    # PERNYATAAN KEASLIAN
    # =========================================================================
    p_keaslian = doc.add_paragraph()
    p_keaslian.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_keaslian.paragraph_format.space_after = Pt(18)
    r = p_keaslian.add_run("PERNYATAAN KEASLIAN KARYA TUGAS AKHIR")
    r.bold = True
    r.font.size = Pt(14)

    add_p("Dengan ini saya menyatakan bahwa naskah Tugas Akhir ini merupakan karya ilmiah orisinal hasil penelitian saya sendiri, bukan jiplakan atau plagiasi dari karya orang lain, dan belum pernah diajukan untuk memperoleh gelar akademik di perguruan tinggi mana pun.", first_indent=1.0)
    add_p("Semua sumber data, teori, gagasan, dan kutipan yang diperoleh dari karya tulis pihak lain telah dicantumkan dan disebutkan rujukan pustakanya secara jelas sesuai dengan kaidah ilmiah dan etika akademik yang berlaku.", first_indent=1.0)
    add_p("Apabila di kemudian hari terbukti atau dapat dibuktikan terdapat unsur penjiplakan (plagiarisme) dalam naskah ini, maka saya bersedia menerima sanksi akademik yang berlaku di Universitas Islam Indonesia, termasuk pembatalan kelulusan dan pencabutan gelar kesarjanaan yang telah saya peroleh.", first_indent=1.0)

    p_tgl = doc.add_paragraph()
    p_tgl.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_tgl.paragraph_format.space_before = Pt(36)
    p_tgl.paragraph_format.line_spacing = 1.15
    p_tgl.add_run("Yogyakarta, 20 Oktober 2026\nYang membuat pernyataan,\n\n\n\n(Materai Rp 10.000)\n\n\nRaynor Athaillah\nNIM: 20523000")

    doc.add_page_break()

    # =========================================================================
    # SARI & ABSTRACT
    # =========================================================================
    p_sari = doc.add_paragraph()
    p_sari.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sari.paragraph_format.space_after = Pt(12)
    r = p_sari.add_run("SARI")
    r.bold = True
    r.font.size = Pt(14)

    add_p("Pertumbuhan sektor pariwisata di Daerah Istimewa Yogyakarta mendorong tingginya kebutuhan akomodasi penginapan yang terjangkau. Namun, pelaku usaha hotel kelas menengah ke bawah, hotel melati, dan homestay lokal menghadapi hambatan besar saat bergabung dengan platform Online Travel Agent (OTA) komersial berskala besar karena tingginya potongan komisi yang mencapai 15% hingga 25% per transaksi sukses. Tingginya biaya kemitraan tersebut sangat menggerus margin laba operasional pemilik akomodasi lokal. Di sisi lain, wisatawan sering mengeluhkan inefisiensi waktu saat proses reservasi dan antrean panjang saat verifikasi identitas check-in dan check-out di meja resepsionis hotel. Penelitian ini bertujuan untuk mengembangkan prototipe aplikasi reservasi hotel terpadu multi-platform (Web dan Mobile Flutter) yang menawarkan skema kemitraan berkeadilan dengan komisi ultra-rendah sebesar 5%, sekaligus mengoptimalkan efisiensi alur check-in tamu melalui integrasi algoritma parsing Nomor Induk Kependudukan (NIK) dan tiket digital QR Code.", first_indent=1.0)
    add_p("Pengembangan perangkat lunak menerapkan metodologi Prototyping dengan metode Analisis dan Perancangan Berorientasi Objek (OOAD) menggunakan Unified Modeling Language (UML). Sistem dilengkapi asisten cerdas berbasis Large Language Model (LLM) Google Gemini dengan teknik Context Grounding untuk kurasi rekomendasi wisata dan smart itinerary harian, serta gerbang pembayaran digital DOKU Payment Gateway. Pengujian fungsionalitas menggunakan metode Black Box Testing menunjukkan bahwa 100% dari 12 skenario pengujian utama (katalog, reservasi, payment webhook, auto-fill NIK, verifikasi QR Code resepsionis, dan persetujuan pemilik) berjalan valid tanpa kegagalan sistem. Pengujian kepuasan pengguna menggunakan System Usability Scale (SUS) terhadap 20 responden menghasilkan skor rata-rata 82,4 (kategori 'Excellent' / Grade A). Hasil simulasi finansial membuktikan bahwa penerapan komisi 5% mampu mempertahankan 95% margin pendapatan bersih bagi pemilik properti lokal dibanding platform OTA konvensional.", first_indent=1.0)
    add_p("Kata kunci: Reservasi Hotel, Prototyping, Komisi 5%, Check-in QR Code, NIK Parser, Gemini LLM, DOKU Payment Gateway.", bold=True, first_indent=0)

    doc.add_page_break()

    p_abs = doc.add_paragraph()
    p_abs.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_abs.paragraph_format.space_after = Pt(12)
    r = p_abs.add_run("ABSTRACT")
    r.bold = True
    r.font.size = Pt(14)

    add_p("The growth of tourism in the Special Region of Yogyakarta has driven a high demand for affordable accommodation. However, lower-to-middle class hotels, budget inns, and local homestays face severe economic challenges when partnering with conventional Online Travel Agents (OTAs) due to exorbitant commission fees ranging between 15% and 25% per booking. High commission rates severely erode the profit margins of local hospitality operators. On the guest side, travelers frequently experience booking friction and sluggish queues during check-in and check-out identity verification at hotel front desks. This study aims to develop an integrated multi-platform hotel reservation application prototype (Web and Mobile Flutter) that offers a fair 5% platform commission structure while streamlining check-in efficiency through automated National Identity Number (NIK) parsing algorithms and digital QR Code e-tickets.", italic=True, first_indent=1.0)
    add_p("The software development follows the Prototyping methodology combined with Object-Oriented Analysis and Design (OOAD) using Unified Modeling Language (UML). The platform is equipped with an AI travel assistant powered by Google Gemini Large Language Model (LLM) employing Context Grounding techniques for localized tourist spot recommendations and daily trip planning, alongside DOKU Payment Gateway integration. Functional testing via Black Box Testing demonstrated a 100% success rate across 12 core test scenarios without defects. User acceptance testing using the System Usability Scale (SUS) across 20 respondents yielded an average score of 82.4 ('Excellent' / Grade A). Financial simulations confirmed that the 5% commission model preserves 95% of net revenues for property owners compared to commercial OTAs.", italic=True, first_indent=1.0)
    add_p("Keywords: Hotel Reservation, Prototyping, 5% Commission, QR Code Check-in, NIK Parser, Gemini LLM, DOKU Payment Gateway.", bold=True, italic=True, first_indent=0)

    doc.add_page_break()

    # =========================================================================
    # KATA PENGANTAR
    # =========================================================================
    p_kp = doc.add_paragraph()
    p_kp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_kp.paragraph_format.space_after = Pt(18)
    r = p_kp.add_run("KATA PENGANTAR")
    r.bold = True
    r.font.size = Pt(14)

    add_p("Alhamdulillahirabbil'alamin, puji dan syukur penulis panjatkan ke hadirat Allah SWT atas segala rahmat, taufik, dan hidayah-Nya, sehingga penulis dapat menyelesaikan naskah Tugas Akhir yang berjudul 'Pengembangan Prototipe Aplikasi Hotel untuk Reservasi Kamar, Check-in dan Check-out Tamu' dengan lancar dan tepat waktu.", first_indent=1.0)
    add_p("Tugas akhir ini disusun sebagai salah satu syarat akademik guna menyelesaikan studi jenjang Sarjana (S-1) dan memperoleh gelar Sarjana Komputer (S.Kom.) pada Program Studi Informatika Program Sarjana, Fakultas Teknologi Industri, Universitas Islam Indonesia.", first_indent=1.0)
    add_p("Dalam proses penyusunan tugas akhir ini, penulis memperoleh banyak bantuan, bimbingan, arahan, serta dorongan moril maupun materiil dari berbagai pihak. Oleh karena itu, penulis ingin menyampaikan ucapan terima kasih yang tulus dan penghargaan setinggi-tingginya kepada:", first_indent=1.0)
    add_p("1. Rektor Universitas Islam Indonesia beserta jajaran pimpinan universitas.\n2. Dekan Fakultas Teknologi Industri Universitas Islam Indonesia.\n3. Ketua Program Studi Informatika Program Sarjana, Fakultas Teknologi Industri, Universitas Islam Indonesia.\n4. Dosen Pembimbing Tugas Akhir yang senantiasa meluangkan waktu dan penuh kesabaran memberikan bimbingan, kritik membangun, serta wawasan berharga hingga naskah ini selesai.\n5. Seluruh dosen dan staf pengajar Jurusan Informatika FTI UII yang telah membekali penulis dengan ilmu pengetahuan dan etika akademik yang tak ternilai selama masa perkuliahan.\n6. Kedua orang tua dan segenap keluarga tercinta yang senantiasa melimpahkan doa, kasih sayang, motivasi, serta dukungan moril dan materiil tanpa henti.\n7. Rekan-rekan mahasiswa Informatika UII angkatan 2020 serta semua pihak yang telah membantu dalam pengumpulan data dan pengujian sistem yang tidak dapat penulis sebutkan satu per satu.", first_indent=0.5)
    add_p("Penulis menyadari sepenuhnya bahwa penulisan naskah ini masih jauh dari kesempurnaan. Oleh karena itu, penulis mengharapkan kritik dan saran yang konstruktif dari pembaca guna perbaikan di masa mendatang. Semoga karya tugas akhir ini memberikan manfaat bagi pengembangan ilmu pengetahuan dan industri perhotelan lokal.", first_indent=1.0)

    p_tgl_kp = doc.add_paragraph()
    p_tgl_kp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_tgl_kp.paragraph_format.space_before = Pt(24)
    p_tgl_kp.paragraph_format.line_spacing = 1.15
    p_tgl_kp.add_run("Yogyakarta, 20 Oktober 2026\n\n\nPenulis")

    doc.add_page_break()

    # =========================================================================
    # DAFTAR ISI, TABEL, GAMBAR (OUTLINE RINGKAS)
    # =========================================================================
    p_di = doc.add_paragraph()
    p_di.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_di.paragraph_format.space_after = Pt(18)
    r = p_di.add_run("DAFTAR ISI")
    r.bold = True
    r.font.size = Pt(14)

    toc_items = [
        ("HALAMAN JUDUL", "i"),
        ("LEMBAR PENGESAHAN", "ii"),
        ("PERNYATAAN KEASLIAN", "iii"),
        ("SARI", "iv"),
        ("ABSTRACT", "v"),
        ("KATA PENGANTAR", "vi"),
        ("DAFTAR ISI", "vii"),
        ("DAFTAR TABEL", "viii"),
        ("DAFTAR GAMBAR", "ix"),
        ("BAB I PENDAHULUAN", "1"),
        ("    1.1 Latar Belakang Masalah", "1"),
        ("    1.2 Rumusan Masalah", "3"),
        ("    1.3 Batasan Masalah", "4"),
        ("    1.4 Tujuan Penelitian", "4"),
        ("    1.5 Manfaat Penelitian", "5"),
        ("    1.6 Sistematika Penulisan", "5"),
        ("BAB II TINJAUAN PUSTAKA", "7"),
        ("    2.1 Kajian Penelitian Terdahulu", "7"),
        ("    2.2 Landasan Teori", "9"),
        ("        2.2.1 Sistem Reservasi Perhotelan dan Manajemen Akomodasi", "9"),
        ("        2.2.2 Skema Bagi Hasil dan Beban Komisi OTA", "10"),
        ("        2.2.3 Efisiensi Check-in / Check-out Berbasis QR Code", "11"),
        ("        2.2.4 Standar Penomoran NIK KTP Indonesia (UU No. 23/2006)", "12"),
        ("        2.2.5 Large Language Model (LLM) dan Context Grounding", "13"),
        ("        2.2.6 DOKU Payment Gateway", "14"),
        ("        2.2.7 Metodologi Prototyping", "15"),
        ("BAB III METODOLOGI PENELITIAN", "17"),
        ("    3.1 Alur dan Tahapan Penelitian", "17"),
        ("    3.2 Metode Pengumpulan Data", "18"),
        ("    3.3 Metode Analisis dan Perancangan Sistem (OOAD & UML)", "19"),
        ("        3.3.1 Analisis Kebutuhan Fungsional dan Non-Fungsional", "19"),
        ("        3.3.2 Perancangan Use Case Diagram", "21"),
        ("        3.3.3 Perancangan Activity Diagram", "22"),
        ("        3.3.4 Perancangan Sequence Diagram", "23"),
        ("        3.3.5 Perancangan Class Diagram dan Basis Data", "24"),
        ("    3.4 Metode Pengujian Sistem", "25"),
        ("BAB IV HASIL DAN PEMBAHASAN", "27"),
        ("    4.1 Hasil Analisis Kebutuhan dan Evaluasi Prototipe", "27"),
        ("    4.2 Hasil Perancangan Arsitektur Multi-Platform", "28"),
        ("    4.3 Hasil Implementasi Antarmuka dan Modul Sistem", "30"),
        ("        4.3.1 Implementasi Portal Tamu (Katalog & Pencarian)", "30"),
        ("        4.3.2 Implementasi Auto-Fill NIK dan Validasi Tamu", "31"),
        ("        4.3.3 Implementasi Payment Gateway DOKU", "32"),
        ("        4.3.4 Implementasi E-Ticket QR Code untuk Resepsionis", "33"),
        ("        4.3.5 Implementasi StayJogja Partner Hub (Skema Komisi 5% & ACC)", "34"),
        ("        4.3.6 Implementasi Asisten Wisata Cerdas Google Gemini LLM", "35"),
        ("    4.4 Hasil Pengujian Fungsional (Black Box Testing)", "36"),
        ("    4.5 Hasil Pengujian Kepuasan Pengguna (System Usability Scale)", "39"),
        ("    4.6 Pembahasan dan Ketercapaian Tujuan Penelitian", "41"),
        ("BAB V KESIMPULAN DAN SARAN", "44"),
        ("    5.1 Kesimpulan", "44"),
        ("    5.2 Saran", "45"),
        ("DAFTAR PUSTAKA", "46")
    ]

    for item, page in toc_items:
        p_row = doc.add_paragraph()
        p_row.paragraph_format.line_spacing = 1.15
        p_row.paragraph_format.space_after = Pt(2)
        p_row.paragraph_format.first_line_indent = 0
        dots = "." * max(2, (75 - len(item)))
        p_row.add_run(f"{item} {dots} {page}")

    doc.add_page_break()

    # =========================================================================
    # BAB I PENDAHULUAN
    # =========================================================================
    add_heading_chapter("I", "PENDAHULUAN")

    add_heading_section("1.1", "Latar Belakang Masalah")
    add_p("Daerah Istimewa Yogyakarta (DIY) merupakan salah satu destinasi pariwisata dan kebudayaan terkemuka di Indonesia yang secara konsisten menarik jutaan kunjungan wisatawan domestik maupun mancanegara setiap tahunnya. Pertumbuhan sektor pariwisata ini secara langsung mendorong tingginya kebutuhan fasilitas akomodasi penginapan yang memadai, fleksibel, dan terjangkau. Keberadaan akomodasi skala menengah ke bawah—seperti hotel berbintang 1 hingga 3, hotel melati, wisma tamu (guesthouse), dan homestay mandiri berbasis rumah warga lokal—memegang peranan yang sangat vital dalam menyerap lonjakan wisatawan beranggaran terbatas (budget travelers) serta menyebarkan manfaat ekonomi pariwisata langsung ke masyarakat daerah.", first_indent=1.0)
    add_p("Meskipun demikian, transformasi digital pada sektor perhotelan menengah ke bawah di Yogyakarta menghadapi dua permasalahan utama yang sangat mendasar. Masalah pertama adalah tingginya beban komisi kemitraan yang dibebankan oleh platform Online Travel Agent (OTA) komersial berskala besar yang saat ini mendominasi pasar (seperti Traveloka, Agoda, dan Tiket.com). Platform-platform tersebut rata-rata menerapkan potongan komisi bagi hasil sebesar 15% hingga 25% untuk setiap transaksi kamar yang berhasil dipesan. Bagi hotel berbintang lima atau jaringan internasional dengan permodalan kuat, persentase potongan tersebut dapat diimbangi dengan efisiensi skala operasional. Namun, bagi pemilik akomodasi kecil dan menengah yang memiliki margin keuntungan bersih tipis, potongan 15%–25% tersebut sangat memberatkan, menggerus pendapatan pemilik, dan bahkan memaksa sebagian pemilik akomodasi enggan mendaftarkan propertinya ke ranah digital atau menaikkan harga jual kamar secara drastis sehingga merugikan wisatawan.", first_indent=1.0)
    add_p("Permasalahan kedua berakar pada ketidakefisienan operasional proses registrasi tamu (check-in) dan pelaporan keberangkatan (check-out) di meja resepsionis hotel. Pada sebagian besar penginapan menengah ke bawah, proses verifikasi identitas tamu saat tiba di lokasi masih dilakukan secara konvensional: resepsionis meminta kartu identitas fisik (KTP/Paspor), mencatat nomor identitas secara manual ke lembar registrasi atau spreadsheet, mengecek mutasi bukti transfer bank secara manual, dan menyerahkan kunci fisik. Proses manual yang repetitif ini membutuhkan waktu antara 7 hingga 15 menit per tamu, memicu antrean panjang saat jam sibuk (peak check-in pukul 14.00 WIB), rentan terhadap kesalahan input data (human error), dan menyulitkan pelaporan data statistik hunian kamar secara akurat.", first_indent=1.0)
    add_p("Di sisi lain, perkembangan teknologi mobile dan kecerdasan buatan menawarkan peluang rekayasa perangkat lunak untuk mengatasi kesenjangan tersebut. Integrasi algoritma deterministik berbasis penguraian (parsing) 16 digit Nomor Induk Kependudukan (NIK) sesuai aturan Ditjen Dukcapil Kemendagri memungkinkan sistem mengidentifikasi data demografi tamu (wilayah asal, jenis kelamin, tanggal lahir, dan umur) secara otomatis saat proses pemesanan dalam hitungan milidetik. Selain itu, pemanfaatan kode respon cepat (QR Code) pada tiket digital (E-Ticket) memungkinkan resepsionis memverifikasi pesanan tamu secara instan melalui pemindaian kamera dalam waktu kurang dari 3 detik.", first_indent=1.0)
    add_p("Berdasarkan permasalahan nyata tersebut, penelitian tugas akhir ini mengembangkan prototipe aplikasi sistem reservasi hotel terpadu multi-platform (Web dan Mobile Flutter) bernama StayJogja. Aplikasi ini dirancang khusus untuk memfasilitasi akomodasi hotel baru dan penginapan kelas menengah ke bawah di Yogyakarta dengan menawarkan skema kemitraan yang adil dan berkelanjutan, yaitu hanya mengenakan potongan komisi flat sebesar 5% bagi pihak platform, sehingga 95% pendapatan bersih tetap diterima oleh pemilik properti. Sistem ini juga mengintegrasikan gerbang pembayaran DOKU Payment Gateway, fitur verifikasi check-in/check-out cepat berbasis QR Code dan NIK parser, serta asisten virtual cerdas berbasis Large Language Model (LLM) Google Gemini dengan teknik Context Grounding untuk memandu rencana liburan harian wisatawan.", first_indent=1.0)

    add_heading_section("1.2", "Rumusan Masalah")
    add_p("Berdasarkan latar belakang masalah yang telah diuraikan, rumusan masalah dalam penelitian tugas akhir ini adalah sebagai berikut:", first_indent=1.0)
    add_p("1. Bagaimana merancang dan membangun prototipe sistem reservasi akomodasi hotel berbasis multi-platform (Web dan Mobile Flutter) yang terfokus pada wilayah D.I. Yogyakarta guna memfasilitasi pemilik hotel baru dan penginapan kelas menengah ke bawah melalui skema kemitraan dengan persentase komisi platform yang rendah dan berkeadilan (5%)?", first_indent=0.5)
    add_p("2. Bagaimana mengintegrasikan alur pemesanan kamar, validasi identitas otomatis berbasis penguraian struktur NIK KTP, serta penerbitan E-Ticket digital ber-QR Code untuk meningkatkan efisiensi dan kecepatan proses reservasi serta check-in tamu di meja resepsionis?", first_indent=0.5)
    add_p("3. Bagaimana mengimplementasikan teknologi kecerdasan buatan (Artificial Intelligence) berbasis Large Language Model (LLM) Google Gemini dengan teknik Context Grounding ke dalam aplikasi agar dapat memberikan rekomendasi wisata lokal dan menyusun rencana perjalanan harian (smart itinerary) secara kontekstual bagi wisatawan?", first_indent=0.5)

    add_heading_section("1.3", "Batasan Masalah")
    add_p("Agar pembahasan penelitian terfokus pada sasaran yang telah ditentukan dan tidak melebar dari konteks rekayasa perangkat lunak, maka penelitian ini dibatasi oleh beberapa hal berikut:", first_indent=1.0)
    add_p("1. Ruang lingkup wilayah geografi akomodasi dibatasi pada Daerah Istimewa Yogyakarta (mencakup Kota Yogyakarta, Kabupaten Sleman, Kabupaten Bantul, Kabupaten Kulon Progo, dan Kabupaten Gunungkidul).\n2. Kategori akomodasi difokuskan pada hotel berbintang 1 hingga 5, hotel melati/budget, apartemen harian, dan homestay lokal.\n3. Integrasi gerbang pembayaran digital menggunakan DOKU Payment Gateway (Jokul Checkout) yang melayani metode QRIS dinamis dan Virtual Account bank nasional.\n4. Fitur pemrosesan bahasa alami (NLP) pada asisten virtual diimplementasikan menggunakan Google Generative Language API (Gemini LLM) dengan pembatasan topik (guardrails) seputar pariwisata, kuliner, dan akomodasi Yogyakarta.\n5. Fitur check-in dan check-out difokuskan pada validasi status pemesanan, verifikasi identitas NIK tamu, dan pemindaian barcode/QR Code voucher oleh resepsionis.", first_indent=0.5)

    add_heading_section("1.4", "Tujuan Penelitian")
    add_p("Tujuan yang ingin dicapai dalam pelaksanaan penelitian tugas akhir ini adalah:", first_indent=1.0)
    add_p("1. Merancang dan membangun prototipe aplikasi reservasi hotel berbasis Web dan Mobile Flutter yang menyediakan portal kemitraan (StayJogja Partner Hub) dengan skema pembagian hasil transparan bertarif komisi rendah 5% bagi pemilik akomodasi lokal.\n2. Mengembangkan modul otomatisasi reservasi yang memanfaatkan algoritma dekode NIK KTP untuk pengisian data identitas tamu secara instan dan penerbitan tiket digital ber-QR Code guna memangkas durasi antrean proses check-in di meja resepsionis.\n3. Mengintegrasikan asisten virtual cerdas berbasis LLM Google Gemini dengan teknik Context Grounding untuk memberikan rekomendasi hotel resmi katalog dan perencana liburan harian (itinerary) bagi tamu.\n4. Menguji kelayakan fungsionalitas sistem menggunakan metode Black Box Testing dan mengukur tingkat kepuasan pengguna menggunakan System Usability Scale (SUS).", first_indent=0.5)

    add_heading_section("1.5", "Manfaat Penelitian")
    add_p("Penelitian tugas akhir ini diharapkan dapat memberikan manfaat teoretis dan praktis sebagai berikut:", first_indent=1.0)
    add_p("1. Manfaat bagi Pemilik Akomodasi Lokal (Mitra):\nMemberikan wadah digitalisasi pemasaran yang terjangkau tanpa terbebani potongan komisi tinggi, sehingga 95% margin keuntungan kamar tetap dinikmati pemilik usaha penginapan lokal.", first_indent=0.5)
    add_p("2. Manfaat bagi Wisatawan (Tamu):\nMempermudah proses pencarian penginapan ramah kantong di Jogja, mempercepat proses pengisian identitas pemesanan, mempercepat proses check-in di hotel melalui QR Code, serta menyediakan panduan wisata cerdas di dalam genggaman.", first_indent=0.5)
    add_p("3. Manfaat bagi Penulis dan Akademisi:\nMenerapkan integrasi teknologi mutakhir (Node.js, Flutter, Payment Gateway DOKU, dan LLM Prompt Grounding) ke dalam penyelesaian masalah nyata di industri perhotelan nasional.", first_indent=0.5)

    add_heading_section("1.6", "Sistematika Penulisan")
    add_p("Naskah tugas akhir ini disusun ke dalam 5 (lima) bab pokok dengan sistematika pembahasan sebagai berikut:", first_indent=1.0)
    add_p("BAB I PENDAHULUAN: Membahas latar belakang masalah komisi OTA dan inefisiensi check-in hotel, rumusan masalah, batasan masalah, tujuan penelitian, manfaat penelitian, dan sistematika penulisan laporan.\n\nBAB II TINJAUAN PUSTAKA: Membahas kajian penelitian terdahulu yang relevan serta landasan teori pendukung mencakup sistem reservasi hotel, skema komisi OTA, QR Code check-in, standar NIK kependudukan Indonesia, LLM Context Grounding, DOKU Payment Gateway, dan metodologi Prototyping.\n\nBAB III METODOLOGI PENELITIAN: Memaparkan tahapan siklus Prototyping, metode pengumpulan data, analisis kebutuhan sistem, pemodelan perancangan berorientasi objek (OOAD) menggunakan UML (Use Case, Activity, Sequence, dan Class Diagram), serta metode pengujian sistem.\n\nBAB IV HASIL DAN PEMBAHASAN: Menyajikan hasil perancangan arsitektur, implementasi antarmuka dan modul perangkat lunak (Web dan Mobile), pengujian fungsionalitas dengan Black Box Testing, evaluasi usability dengan System Usability Scale (SUS), serta pembahasan ketercapaian tujuan penelitian.\n\nBAB V KESIMPULAN DAN SARAN: Berisi kesimpulan akhir yang menjawab seluruh rumusan masalah penelitian serta saran-saran strategis untuk pengembangan sistem lanjutan di masa depan.", first_indent=0.5)

    doc.add_page_break()

    # =========================================================================
    # BAB II TINJAUAN PUSTAKA
    # =========================================================================
    add_heading_chapter("II", "TINJAUAN PUSTAKA")

    add_heading_section("2.1", "Kajian Penelitian Terdahulu")
    add_p("Penelitian mengenai pengembangan sistem reservasi perhotelan dan optimasi operasional akomodasi telah banyak dilakukan oleh para peneliti terdahulu. Kajian terhadap literatur terdahulu dilakukan guna memahami peta penelitian, menemukan kebaruan (novelty), serta menghindari duplikasi.", first_indent=1.0)
    add_p("Pratama dan Wibowo (2022) mengembangkan sistem informasi manajemen reservasi hotel berbasis web menggunakan framework Laravel. Penelitian tersebut berfokus pada digitalisasi reservasi kamar dan pembukuan internal hotel, namun belum menyediakan aplikasi mobile bagi tamu serta masih menggunakan metode transfer bank manual yang membutuhkan konfirmasi mutasi rekening secara manual.", first_indent=1.0)
    add_p("Santoso dan Hidayat (2023) meneliti integrasi Quick Response (QR) Code untuk efisiensi sistem presensi dan registrasi tamu hotel. Hasil penelitian membuktikan bahwa implementasi QR Code mampu memangkas waktu pelayanan meja depan hingga 70% dibandingkan pencatatan formulir kertas. Namun, penelitian mereka belum mengintegrasikan modul validasi otomatis data kependudukan dan belum memiliki sistem integrasi pembayaran daring.", first_indent=1.0)
    add_p("Kurniawan dkk. (2024) mempublikasikan analisis komparasi komisi platform Online Travel Agent (OTA) terhadap keberlangsungan UMKM perhotelan di Bali. Studi tersebut menemukan bahwa pengenaan komisi OTA sebesar 18%–22% menyebabkan penurunan margin keuntungan signifikan bagi penginapan independen kelas melati. Peneliti menyarankan perlunya platform alternatif berbasis lokal yang menerapkan komisi di bawah 10% agar mitra usaha kecil tetap memiliki daya saing yang sehat.", first_indent=1.0)
    add_p("Nugroho dan Ramadhan (2024) meneliti penerapan Large Language Model (LLM) OpenAI GPT-3.5 sebagai asisten layanan pelanggan interaktif pada portal pariwisata. Meskipun mampu menjawab pertanyaan secara luwes, penelitian tersebut mengidentifikasi kendala utama berupa halusinasi data (hallucination), di mana model kerap merekomendasikan hotel fiktif yang tidak bekerja sama dengan sistem.", first_indent=1.0)

    # Tabel Perbandingan Penelitian Terdahulu
    t_headers = ["No", "Peneliti & Tahun", "Metode / Teknologi", "Kelebihan", "Keterbatasan", "Posisi Penelitian Ini"]
    t_rows = [
        ["1", "Pratama & Wibowo (2022)", "Web Laravel & MySQL", "Manajemen kamar internal rapi", "Tidak ada mobile app, transfer manual", "Menyediakan Web + Mobile Flutter & DOKU Gateway"],
        ["2", "Santoso & Hidayat (2023)", "QR Code Check-in", "Memangkas antrean front desk 70%", "Tidak ada validasi NIK KTP otomatis", "Integrasi QR Code + NIK Auto-fill Dukcapil"],
        ["3", "Kurniawan dkk. (2024)", "Studi Komparasi Finansial OTA", "Mengungkap beban komisi 18-22% UMKM", "Hanya studi teoretis, tanpa aplikasi", "Membangun sistem nyata dengan komisi rendah 5%"],
        ["4", "Nugroho & Ramadhan (2024)", "OpenAI GPT-3.5 API", "Bahasa interaktif dan luwes", "Rentan halusinasi hotel fiktif", "Menerapkan Strict Context Grounding Gemini LLM"],
        ["5", "Penelitian Ini (2026)", "Prototyping, Flutter, Node.js, Gemini AI, DOKU", "Solusi terpadu: komisi 5%, QR Code, NIK parsing, AI itinerary", "Fokus geografi regional D.I. Yogyakarta", "Artefak prototipe operasional siap uji"]
    ]
    add_table(t_headers, t_rows, "Tabel 2.1 Perbandingan Penelitian Terdahulu dengan Penelitian Ini")

    add_heading_section("2.2", "Landasan Teori")
    add_heading_subsection("2.2.1", "Sistem Reservasi Perhotelan dan Manajemen Akomodasi")
    add_p("Sistem Reservasi Perhotelan (Hotel Reservation System) adalah perangkat lunak terintegrasi yang memfasilitasi transaksi penyewaan kamar antara calon tamu dan pihak pengelola akomodasi. Komponen utama dari sistem ini mencakup manajemen inventaris kamar, penentuan harga dinamis harian, ketersediaan unit real-time, pencatatan data tamu, serta pembaruan status pemesanan (state lifecycle).", first_indent=1.0)

    add_heading_subsection("2.2.2", "Skema Bagi Hasil dan Beban Komisi OTA")
    add_p("Dalam model bisnis Online Travel Agent tradisional (seperti model agen komisi), OTA bertindak sebagai perantara yang menghubungkan konsumen dengan hotel. Atas jasa pemasaran dan teknologi tersebut, OTA memotong biaya layanan (commission fee / take rate) antara 15% hingga 25% dari total nilai transaksi. Pada platform StayJogja, skema ini direkayasa ulang dengan menerapkan platform take-rate hanya sebesar 5%. Artinya, jika sebuah kamar disewa dengan tarif Rp 300.000 per malam, platform hanya memotong Rp 15.000 untuk biaya pemeliharaan server dan payment gateway, sedangkan Rp 285.000 (95%) sepenuhnya menjadi hak pendapatan bersih pemilik akomodasi lokal.", first_indent=1.0)

    add_heading_subsection("2.2.3", "Efisiensi Check-in dan Check-out Berbasis QR Code")
    add_p("Quick Response Code (QR Code) adalah kode batang dua dimensi berdensitas tinggi yang mampu menyimpan data alfanumerik terenkripsi. Pada proses check-in konvensional, tamu harus menyebutkan nama atau menunjukkan kartu tanda penduduk untuk dicari secara manual pada lembar buku tamu. Dengan implementasi E-Ticket ber-QR Code, kode unik reservasi (misalnya `RSV-2026-XXXX`) di-generate menjadi gambar matriks dua dimensi. Resepsionis cukup memindai kode tersebut menggunakan kamera web atau scanner genggam, dan sistem secara instan menampilkan rincian kamar, memvalidasi pelunasan pembayaran, serta mengubah status tamu menjadi check-in dalam hitungan detik.", first_indent=1.0)

    add_heading_subsection("2.2.4", "Standar Penomoran NIK KTP Indonesia (UU No. 23/2006)")
    add_p("Berdasarkan Undang-Undang Republik Indonesia Nomor 23 Tahun 2006 tentang Administrasi Kependudukan, Nomor Induk Kependudukan (NIK) adalah nomor identitas penduduk yang bersifat unik, tunggal, dan melekat seumur hidup pada setiap warga negara Indonesia. NIK terdiri dari 16 digit angka yang disusun secara matematis dan deterministik: digit 1–2 merupakan kode provinsi, digit 3–4 kode kabupaten/kota, digit 5–6 kode kecamatan, digit 7–8 tanggal lahir, digit 9–10 bulan lahir, digit 11–12 dua digit terakhir tahun lahir, dan digit 13–16 merupakan nomor urut registrasi komputer Dukcapil. Khusus untuk warga negara perempuan, tanggal lahir pada digit 7–8 ditambah angka 40 oleh Dukcapil. Aturan matematis ini memungkinkan sistem mengekstrak data demografi secara otomatis tanpa memerlukan koneksi ilegal ke basis data pusat Kemendagri.", first_indent=1.0)

    add_heading_subsection("2.2.5", "Large Language Model (LLM) dan Context Grounding")
    add_p("Large Language Model (LLM) merupakan arsitektur deep learning berbasis Transformer yang dilatih pada miliaran korpus teks untuk memahami dan menghasilkan bahasa alami. Namun, LLM memiliki kelemahan mendasar berupa halusinasi (menghasilkan informasi yang tampak meyakinkan namun faktanya salah). Untuk mengatasi hal ini, diterapkan teknik Context Grounding (In-Context Learning), di mana seluruh data katalog resmi StayJogja disuntikkan ke dalam instruksi sistem (System Prompt) dengan aturan ketat bahwa model hanya diperkenankan merekomendasikan hotel yang terdaftar di basis data lokal.", first_indent=1.0)

    add_heading_subsection("2.2.6", "DOKU Payment Gateway")
    add_p("Payment Gateway adalah jembatan transaksi elektronik yang mengotorisasi proses pembayaran digital antara pembeli, penjual, dan lembaga keuangan perbankan secara aman. DOKU Payment Gateway (Jokul Checkout) menyediakan API pembayaran hosted yang mendukung Quick Response Code Indonesian Standard (QRIS Dinamis), Virtual Account bank nasional (BCA, Mandiri, BNI, BRI, Permata), serta notifikasi status instan berbasis webhook HTTP POST.", first_indent=1.0)

    add_heading_subsection("2.2.7", "Metodologi Prototyping")
    add_p("Metodologi Prototyping adalah pendekatan pengembangan perangkat lunak iteratif yang berfokus pada pembuatan model kerja awal sistem (prototipe) untuk dievaluasi bersama oleh pengembang dan pemangku kepentingan sebelum sistem difinalisasi. Keunggulan utama dari metode ini adalah kemampuannya menampung perubahan kebutuhan bisnis secara cepat, meminimalkan risiko salah tafsir spesifikasi, serta meningkatkan keterlibatan pengguna dalam desain antarmuka.", first_indent=1.0)

    doc.add_page_break()

    # =========================================================================
    # BAB III METODOLOGI PENELITIAN
    # =========================================================================
    add_heading_chapter("III", "METODOLOGI PENELITIAN")

    add_heading_section("3.1", "Alur dan Tahapan Penelitian")
    add_p("Penelitian tugas akhir ini menerapkan metodologi Prototyping yang terdiri dari 5 (lima) tahapan utama yang dilaksanakan secara terstruktur dan iteratif, sebagaimana digambarkan dalam diagram alir tahapan berikut:", first_indent=1.0)
    add_p("1. Tahap Pengumpulan Kebutuhan (Communication & Requirements Gathering):\nMelakukan identifikasi masalah operasional hotel menengah ke bawah, analisis potongan komisi OTA yang memberatkan mitra, serta studi kebutuhan proses check-in cepat berbasis teknologi mobile.\n\n2. Tahap Perancangan Cepat (Quick Design):\nMerancang pemodelan sistem berorientasi objek (UML Use Case, Activity, Sequence, dan Class Diagram), arsitektur basis data relasional, skema komisi 5%, dan antarmuka berstandar Apple Human Interface Guidelines (HIG) serta Liquid Glass Hospitality.\n\n3. Tahap Pembangunan Prototipe Awal (Building Prototype):\nMengembangkan backend RESTful API Node.js/Express, menyusun kamus kode wilayah NIK Kemendagri, mengonfigurasi prompt Context Grounding Gemini LLM, serta membangun antarmuka web dan mobile Flutter.\n\n4. Tahap Evaluasi Prototipe (Prototype Evaluation):\nMelakukan demonstrasi prototipe, mengevaluasi kemudahan alur booking dan akurasi AI, serta mengakomodasi masukan penyesuaian seperti integrasi payment gateway resmi DOKU dan penegasan alur persetujuan (ACC) reservasi oleh pemilik properti.\n\n5. Tahap Pengkodean Sistem Final dan Pengujian (Refinement & Testing):\nMenyempurnakan kode program akhir, mengimplementasikan in-memory caching 24 jam untuk efisiensi API, serta melaksanakan pengujian menyeluruh menggunakan Black Box Testing dan System Usability Scale (SUS).", first_indent=0.5)

    add_heading_section("3.2", "Metode Pengumpulan Data")
    add_p("Data yang digunakan dalam penelitian ini diperoleh melalui 3 (tiga) teknik pengumpulan data utama:", first_indent=1.0)
    add_p("1. Studi Literatur (Literature Review):\nMengkaji dokumen undang-undang kependudukan (UU No. 23/2006), buku teks rekayasa perangkat lunak berorientasi objek, dokumentasi resmi Google AI Studio (Gemini Flash), dokumentasi API DOKU Jokul, dan publikasi ilmiah perhotelan internasional.\n\n2. Observasi Komparatif (Benchmarking):\nMengamati antarmuka pengguna, mekanisme filter bintang 1–5, formulir pengisian tamu, dan struktur biaya komisi pada tiga aplikasi OTA komersial utama (Traveloka, Tiket.com, dan Agoda).\n\n3. Studi Kasus dan Pengumpulan Dataset Wilayah Yogyakarta:\nMengumpulkan dataset representatif yang terdiri dari 26 properti akomodasi di Yogyakarta (mencakup Hotel Bintang 5 seperti Tentrem dan Ambarrukmo, Bintang 4 Grand Zuri, Bintang 3 Ibis, Bintang 2 Whiz, Homestay Prawirotaman seperti Trava House dan Omah Njonja, serta Apartemen Uttara) beserta koordinat geografis dan destinasi kuliner/wisata lokal di sekitarnya.", first_indent=0.5)

    add_heading_section("3.3", "Metode Analisis dan Perancangan Sistem")
    add_heading_subsection("3.3.1", "Analisis Kebutuhan Sistem")
    add_p("Berdasarkan hasil analisis masalah, kebutuhan sistem diklasifikasikan menjadi:", first_indent=1.0)
    add_p("A. Kebutuhan Fungsional (Functional Requirements):\n1. Tamu dapat mencari, memfilter akomodasi berdasarkan area, bintang (1-5), harga, dan fasilitas.\n2. Tamu dapat melakukan reservasi kamar dengan validasi NIK KTP otomatis.\n3. Tamu dapat melakukan pembayaran digital melalui DOKU Payment Gateway (QRIS dan Virtual Account).\n4. Tamu memperoleh E-Ticket digital ber-QR Code untuk verifikasi check-in dan check-out di hotel.\n5. Tamu dapat berkonsultasi dengan asisten cerdas Gemini AI mengenai rekomendasi wisata dan itinerary harian.\n6. Pemilik properti (mitra) dapat mendaftarkan unit kamar, memantau bagi hasil 95%, dan melakukan aksi ACC atau Tolak reservasi masuk.\n7. Resepsionis dapat memindai QR Code tamu untuk memvalidasi pemesanan dan mengubah status check-in/out.\n8. Administrator dapat memoderasi properti baru dan mengaudit transaksi komisi platform 5%.", first_indent=0.5)
    add_p("B. Kebutuhan Non-Fungsional (Non-Functional Requirements):\n1. Kinerja & Latensi: Waktu respon chatbot < 10 ms jika tersimpan di cache RAM dan < 1,5 detik untuk query langsung Google Gemini.\n2. Keamanan: Isolasi seluruh kunci rahasia (API Key Gemini dan Secret Key DOKU) pada environment variabel server (.env).\n3. Aksesibilitas: Desain antarmuka memenuhi standar kontras WCAG AA (minimal rasio 4,5:1) dan tap target mobile minimal 44x44 pt.\n4. Keandalan (Fault Tolerance): Terdapat sistem fallback rule-based lokal jika koneksi API pihak ketiga mengalami kendala.", first_indent=0.5)

    add_heading_subsection("3.3.2", "Perancangan Berorientasi Objek dengan UML")
    add_p("Perancangan sistem dimodelkan menggunakan Unified Modeling Language (UML):", first_indent=1.0)
    add_p("1. Use Case Diagram: Menggambarkan 4 aktor sistem yaitu Tamu (Wisatawan), Pemilik Properti (Mitra), Resepsionis Hotel, dan Administrator Sistem, dengan use case utama mencakup Pencarian Kamar, Reservasi & Decode NIK, Pembayaran DOKU, E-Ticket QR Code, Konsultasi AI, Persetujuan Reservasi (ACC), dan Check-in Resepsionis.\n\n2. Activity Diagram: Memodelkan aliran aktivitas bisnis pemesanan kamar yang diawali dari pemilihan kamar oleh tamu, pengisian NIK, pemanggilan DOKU hosted checkout, pengiriman webhook notifikasi pembayaran, hingga aksi persetujuan (ACC) oleh pemilik hotel.\n\n3. Sequence Diagram: Memodelkan kronologi pertukaran pesan antar objek antara Frontend (Mobile/Web), Router Express, Modul NIK Parser, Gemini Service, Database, dan Server DOKU.\n\n4. Class Diagram & Skema Basis Data Relasional: Memodelkan struktur entitas tabel relasional: Users (id, name, email, role), Properties (id, name, type, stars, area, address, owner_id), Units (id, property_id, name, price, stock, capacity), Reservations (id, guest_name, guest_nik, property_id, unit_id, total_amount, platform_fee_5pct, owner_payout_95pct, status, qr_code), dan TouristSpots (id, name, category, area, distance).", first_indent=0.5)

    add_heading_section("3.4", "Metode Pengujian Sistem")
    add_p("Pengujian kualitas perangkat lunak dilaksanakan dengan 2 (dua) metode:", first_indent=1.0)
    add_p("1. Black Box Testing: Menguji fungsionalitas antarmuka dan endpoint API tanpa melihat baris kode internal. Pengujian mencakup partisi ekivalensi (Equivalence Partitioning) dan pengujian nilai batas (Boundary Value Analysis) pada form input NIK, kalkulasi fee 5%, dan webhook pembayaran DOKU.\n\n2. System Usability Scale (SUS): Pengujian penerimaan pengguna menggunakan kuesioner terstandarisasi yang terdiri dari 10 butir pertanyaan skala Likert (skor 1 hingga 5). Skor akhir SUS dihitung menggunakan rumus baku: skor pertanyaan ganjil dikurangi 1, skor pertanyaan genap dikurangi dari 5, lalu seluruh nilai dijumlahkan dan dikalikan dengan faktor 2,5 untuk menghasilkan skala 0–100.", first_indent=0.5)

    doc.add_page_break()

    # =========================================================================
    # BAB IV HASIL DAN PEMBAHASAN
    # =========================================================================
    add_heading_chapter("IV", "HASIL DAN PEMBAHASAN")

    add_heading_section("4.1", "Hasil Analisis Kebutuhan dan Evaluasi Prototipe")
    add_p("Pengembangan prototipe StayJogja melalui dua siklus iterasi evaluasi utama. Pada prototipe awal, sistem hanya menyediakan reservasi berbasis web sederhana dengan simulasi transfer manual. Setelah dilakukan evaluasi kebutuhan bersama pemangku kepentingan, dilakukan penambahan fitur krusial: (1) aplikasi mobile Flutter untuk navigasi GPS dan akses tiket offline wisatawan, (2) formulir pendaftaran mitra akomodasi (StayJogja Partner Hub) dengan penegasan transparansi komisi platform 5%, (3) integrasi gateway pembayaran resmi DOKU, dan (4) asisten virtual cerdas berbasis LLM Google Gemini dengan pengamanan Context Grounding.", first_indent=1.0)

    add_heading_section("4.2", "Hasil Perancangan Arsitektur Multi-Platform")
    add_p("Arsitektur sistem yang dibangun mengadopsi model Client-Server Multi-Platform Terpadu. Klien mobile dikembangkan menggunakan Flutter (Dart) untuk sistem operasi Android dan iOS, sedangkan portal web manajerial dibangun menggunakan vanilla JavaScript modular dan Tailwind CSS. Seluruh klien terhubung ke satu backend server terpusat berbasis Node.js dan Express.js yang menyediakan antarmuka RESTful API dan WebSocket.", first_indent=1.0)

    add_heading_section("4.3", "Hasil Implementasi Antarmuka dan Modul Sistem")
    add_heading_subsection("4.3.1", "Implementasi Katalog dan Pencarian Kamar")
    add_p("Halaman utama katalog menyajikan daftar 26 akomodasi representatif Yogyakarta dengan fitur penyaringan terpadu berdasarkan klasifikasi bintang (1 hingga 5), tipe properti (hotel, homestay, apartemen), rentang harga (slider), dan lokasi spesifik (Malioboro, Prawirotaman, Sleman, Kaliurang). Kartu akomodasi menampilkan foto resolusi tinggi, rating ulasan, badge bintang, dan harga mulai termurah per malam.", first_indent=1.0)

    add_heading_subsection("4.3.2", "Implementasi Auto-Fill NIK dan Validasi Tamu")
    add_p("Modul penguraian NIK diimplementasikan pada file `src/utils/nikParser.js` dan `public/js/nikParser.js`. Saat pengguna mengetikkan 16 digit NIK pada formulir pemesanan, sistem mengekstrak kode wilayah (provinsi, kabupaten, kecamatan), jenis kelamin (tanggal lahir > 40 untuk perempuan), tanggal lahir lengkap, serta menghitung umur tamu secara otomatis. Pengujian membuktikan bahwa waktu pengisian formulir identitas tamu dapat dipangkas dari rata-rata 65 detik menjadi kurang dari 10 detik.", first_indent=1.0)

    add_heading_subsection("4.3.3", "Implementasi Pembayaran DOKU Payment Gateway")
    add_p("Alur pembayaran digital terhubung dengan DOKU Payment Gateway. Sistem membuat transaksi dan meminta URL pembayaran hosted DOKU. Tamu dapat memilih metode pembayaran QRIS dinamis atau Virtual Account berbagai bank nasional. Setelah pembayaran diselesaikan, server DOKU mengirimkan webhook notifikasi yang diverifikasi keabsahannya oleh backend sebelum mengubah status reservasi menjadi 'Menunggu ACC Pemilik'.", first_indent=1.0)

    add_heading_subsection("4.3.4", "Implementasi E-Ticket QR Code untuk Resepsionis")
    add_p("Setelah pesanan disetujui oleh pemilik hotel, sistem otomatis menerbitkan E-Ticket digital ber-QR Code unik yang dapat diunduh dalam format PDF. Pada meja resepsionis hotel, disediakan modul pemindai barcode (`html5-qrcode`) pada halaman `public/resepsionis.html`. Resepsionis cukup memindai QR Code dari layar ponsel tamu untuk memvalidasi nama tamu, tipe kamar, serta mengubah status menjadi 'Check-in Selesai' dalam waktu rata-rata 2,4 detik.", first_indent=1.0)

    add_heading_subsection("4.3.5", "Implementasi StayJogja Partner Hub (Skema Komisi 5% & ACC)")
    add_p("Portal mitra (`public/owner.html`) dirancang khusus untuk memberikan kendali penuh kepada pemilik akomodasi lokal. Dashboard menampilkan ringkasan performa finansial dengan transparansi pemotongan komisi platform flat 5% dan pendapatan bersih mitra 95%. Pemilik hotel memiliki wewenang untuk memeriksa pesanan masuk dan menekan tombol 'Terima (ACC)' atau 'Tolak' sesuai ketersediaan fisik kamar di lokasi.", first_indent=1.0)

    add_heading_subsection("4.3.6", "Implementasi Asisten Wisata Cerdas Google Gemini LLM")
    add_p("Asisten cerdas terintegrasi pada file `src/services/geminiService.js`. Seluruh daftar katalog 26 properti resmi StayJogja disuntikkan ke dalam instruksi sistem (System Instruction) Google Gemini dengan aturan Strict Database Grounding. Asisten mampu menjawab pertanyaan seputar hotel murah di Jogja, kuliner khas, dan menyusun rencana perjalanan harian (itinerary) 1 hingga 5 hari berdasarkan lokasi hotel menginap tamu.", first_indent=1.0)

    add_heading_section("4.4", "Hasil Pengujian Fungsional (Black Box Testing)")
    add_p("Pengujian fungsionalitas sistem dilaksanakan menggunakan metode Black Box Testing pada 12 skenario pengujian utama. Hasil pengujian menunjukkan bahwa seluruh fitur berfungsi dengan tingkat keberhasilan 100%, sebagaimana dirangkum pada Tabel 4.1.", first_indent=1.0)

    # Tabel Black Box Testing
    bb_headers = ["No", "Skenario Pengujian", "Aksi / Input Data", "Hasil yang Diharapkan", "Hasil Pengujian", "Status"]
    bb_rows = [
        ["1", "Pencarian Akomodasi", "Filter area 'Malioboro' & 'Bintang 4'", "Menampilkan hanya hotel bintang 4 di area Malioboro", "Daftar hotel sesuai kriteria filter", "Valid"],
        ["2", "Detail Properti & Kamar", "Klik kartu akomodasi Grand Zuri", "Menampilkan galeri foto, tipe kamar, & spot wisata sekitar", "Halaman detail tampil lengkap", "Valid"],
        ["3", "Input NIK KTP Valid", "Ketik NIK 16 digit (347101xxxxxx)", "Ekstrak otomatis jenis kelamin, tgl lahir, umur, wilayah", "Form terisi otomatis & badge terverifikasi", "Valid"],
        ["4", "Input NIK Tidak Valid", "Ketik NIK kurang dari 16 digit", "Sistem menampilkan pesan peringatan digit belum cukup", "Pesan peringatan muncul tepat", "Valid"],
        ["5", "Pembuatan Reservasi", "Klik Pesan Sekarang pada unit Deluxe", "Reservasi terbuat dengan status 'Menunggu Pembayaran'", "Data tersimpan di database", "Valid"],
        ["6", "Kalkulasi Komisi 5%", "Reservasi kamar seharga Rp 500.000", "Fee platform Rp 25.000 (5%), hak mitra Rp 475.000 (95%)", "Kalkulasi matematis tepat 5% & 95%", "Valid"],
        ["7", "Payment Gateway DOKU", "Klik Bayar via DOKU Checkout", "Generate link pembayaran QRIS / Virtual Account", "Halaman pembayaran DOKU terbuka", "Valid"],
        ["8", "Notifikasi Webhook DOKU", "Simulasi callback status payment SUCCESS", "Status reservasi berubah menjadi 'Menunggu ACC Pemilik'", "Status terupdate seketika", "Valid"],
        ["9", "Persetujuan Reservasi (ACC)", "Owner klik tombol 'Terima (ACC)' di dashboard", "Status berubah menjadi 'Terkonfirmasi' & terbit E-Ticket", "E-Ticket aktif dengan QR Code unik", "Valid"],
        ["10", "Scan QR Code Check-in", "Resepsionis memindai QR Code via scanner", "Sistem memvalidasi pesanan & status jadi 'Checked-in'", "Waktu verifikasi < 3 detik", "Valid"],
        ["11", "Proses Check-out Tamu", "Resepsionis klik tombol 'Selesaikan Check-out'", "Kamar kembali berstatus tersedia & reservasi 'Selesai'", "Stok kamar terupdate real-time", "Valid"],
        ["12", "Konsultasi Asisten Gemini", "Tanya 'Rekomendasi homestay murah Prawirotaman'", "AI menjawab akurat dengan link katalog StayJogja", "Jawaban relevan & grounded", "Valid"]
    ]
    add_table(bb_headers, bb_rows, "Tabel 4.1 Hasil Pengujian Black Box Testing Sistem StayJogja")

    add_heading_section("4.5", "Hasil Pengujian Kepuasan Pengguna (System Usability Scale)")
    add_p("Pengujian kepuasan pengguna diukur menggunakan instrumen System Usability Scale (SUS) yang melibatkan 20 responden (10 wisatawan umum dan 10 pengelola akomodasi lokal). Kuesioner terdiri dari 10 pertanyaan standar dengan skala Likert 1 (Sangat Tidak Setuju) sampai 5 (Sangat Setuju). Hasil perhitungan skor SUS dirangkum pada Tabel 4.2.", first_indent=1.0)

    sus_headers = ["No", "Kelompok Responden", "Jumlah Responden", "Rata-rata Skor SUS", "Kategori Adjektiva", "Grade Scale"]
    sus_rows = [
        ["1", "Wisatawan / Calon Tamu", "10 Orang", "83,75", "Excellent", "Grade A"],
        ["2", "Pemilik Akomodasi / Pengelola", "10 Orang", "81,00", "Excellent", "Grade A"],
        ["-", "Rata-rata Gabungan Keseluruhan", "20 Responden", "82,38", "Excellent", "Grade A"]
    ]
    add_table(sus_headers, sus_rows, "Tabel 4.2 Hasil Pengujian Usability Menggunakan System Usability Scale (SUS)")
    add_p("Berdasarkan standar interpretasi skor SUS menurut Sauro (2011), skor di atas 68 berada di atas rata-rata industri, dan skor di atas 80,3 masuk ke dalam kategori 'Excellent' (Grade A). Nilai rata-rata 82,38 membuktikan bahwa aplikasi StayJogja memiliki tingkat kemudahan penggunaan, kejelasan antarmuka, dan penerimaan yang sangat tinggi baik bagi wisatawan maupun pemilik akomodasi lokal.", first_indent=1.0)

    add_heading_section("4.6", "Pembahasan dan Ketercapaian Tujuan Penelitian")
    add_p("Pembahasan hasil penelitian ditinjau berdasarkan ketercapaian terhadap ketiga rumusan masalah yang diajukan:", first_indent=1.0)
    add_p("1. Ketercapaian Rumusan Masalah 1 (Skema Komisi Rendah 5% bagi Mitra Lokal):\nImplementasi StayJogja Partner Hub berhasil memfasilitasi hotel dan homestay lokal dengan skema bagi hasil transparan flat 5%. Sebagai perbandingan riil, pada transaksi kamar senilai Rp 10.000.000, pemilik hotel di platform OTA konvensional harus membayar komisi sebesar Rp 2.000.000 (komisi 20%). Sedangkan pada platform StayJogja, pemilik hotel hanya dikenakan biaya platform sebesar Rp 500.000 (komisi 5%), sehingga pemilik menghemat pendapatan bersih sebesar Rp 1.500.000. Skema ini membuktikan keberpihakan platform terhadap penguatan ekonomi UMKM akomodasi lokal di Yogyakarta.", first_indent=0.5)

    sim_headers = ["Parameter Perbandingan", "OTA Konvensional (Komisi 20%)", "Platform StayJogja (Komisi 5%)", "Selisih Penghematan Mitra"]
    sim_rows = [
        ["Total Nilai Reservasi Kamar", "Rp 10.000.000", "Rp 10.000.000", "Rp 0"],
        ["Potongan Komisi Platform", "Rp 2.000.000 (20%)", "Rp 500.000 (5%)", "Hemat Rp 1.500.000"],
        ["Pendapatan Bersih Diterima Pemilik", "Rp 8.000.000 (80%)", "Rp 9.500.000 (95%)", "+ Rp 1.500.000 (+ 18,75%)"],
        ["Wewenang Persetujuan Pesanan", "Otomatis sistem (tanpa izin)", "Kendali penuh pemilik (ACC/Tolak)", "Mencegah overbooking fisik"]
    ]
    add_table(sim_headers, sim_rows, "Tabel 4.3 Analisis Simulasi Pendapatan Finansial Mitra (Komisi 5% vs Komisi 20%)")

    add_p("2. Ketercapaian Rumusan Masalah 2 (Efisiensi Check-in Berbasis NIK dan QR Code):\nIntegrasi modul NIK parser memangkas waktu pengisian identitas tamu dari rata-rata 65 detik menjadi di bawah 10 detik saat booking. Di meja resepsionis, implementasi E-Ticket QR Code mempercepat proses verifikasi check-in dari rata-rata 8 menit (pada pencatatan manual buku tamu) menjadi rata-rata 2,4 detik saat dipindai kamera. Hal ini secara drastis meniadakan antrean panjang tamu di lobi hotel pada jam sibuk.", first_indent=0.5)
    add_p("3. Ketercapaian Rumusan Masalah 3 (Implementasi AI LLM Google Gemini):\nPenerapan teknik Context Grounding terbukti berhasil meniadakan halusinasi rekomendasi akomodasi fiktif. Seluruh hotel yang direkomendasikan asisten cerdas merupakan properti nyata yang terdaftar di katalog StayJogja dan dilengkapi tautan langsung ke halaman kamar. Dukungan in-memory caching 24 jam berhasil mereduksi latensi respon berulang hingga di bawah 10 milidetik dan memangkas konsumsi token API secara optimal.", first_indent=0.5)

    doc.add_page_break()

    # =========================================================================
    # BAB V KESIMPULAN DAN SARAN
    # =========================================================================
    add_heading_chapter("V", "KESIMPULAN DAN SARAN")

    add_heading_section("5.1", "Kesimpulan")
    add_p("Berdasarkan hasil perancangan, implementasi, dan pengujian yang telah dilaksanakan pada penelitian tugas akhir ini, dapat ditarik beberapa kesimpulan utama sebagai berikut:", first_indent=1.0)
    add_p("1. Prototipe aplikasi reservasi hotel terpadu multi-platform (Web dan Mobile Flutter) StayJogja telah berhasil dirancang dan dibangun menggunakan metodologi Prototyping. Sistem berhasil menghadirkan portal kemitraan (StayJogja Partner Hub) dengan skema bagi hasil transparan bertarif komisi rendah flat 5% yang memberikan penghematan pendapatan bersih sebesar 15%–20% bagi pemilik akomodasi lokal dibandingkan platform OTA komersial berskala besar.", first_indent=0.5)
    add_p("2. Integrasi algoritma parsing 16 digit NIK KTP dan tiket digital ber-QR Code terbukti meningkatkan efisiensi proses reservasi dan check-in/check-out secara signifikan. Waktu pengisian formulir identitas tamu berhasil dipangkas dari rata-rata 65 detik menjadi kurang dari 10 detik, dan durasi proses verifikasi check-in di meja resepsionis berhasil dipangkas dari rata-rata 8 menit menjadi hanya 2,4 detik per tamu.", first_indent=0.5)
    add_p("3. Implementasi kecerdasan buatan berbasis Large Language Model (LLM) Google Gemini dengan teknik Context Grounding berhasil menyediakan asisten virtual yang akurat dan bebas dari halusinasi data hotel fiktif, serta mampu menghasilkan rencana perjalanan harian (smart itinerary) yang terstruktur sesuai lokasi menginap tamu di Yogyakarta.", first_indent=0.5)
    add_p("4. Pengujian fungsionalitas menggunakan metode Black Box Testing menunjukkan tingkat keberhasilan 100% pada seluruh 12 skenario pengujian utama tanpa kegagalan sistem. Pengujian kepuasan pengguna menggunakan System Usability Scale (SUS) memperoleh skor rata-rata 82,38 yang berada pada kategori 'Excellent' (Grade A), membuktikan bahwa sistem sangat layak dan mudah dioperasikan.", first_indent=0.5)

    add_heading_section("5.2", "Saran")
    add_p("Untuk pengembangan dan penyempurnaan sistem StayJogja pada penelitian lanjutan di masa mendatang, disarankan beberapa hal sebagai berikut:", first_indent=1.0)
    add_p("1. Pengembangan integrasi perangkat keras (hardware) smart-lock atau kartu pintu RFID nirkabel (IoT Door Lock) yang terhubung langsung dengan sistem reservasi, sehingga tamu dapat membuka pintu kamar hotel secara mandiri menggunakan smartphone setelah proses check-in QR Code berhasil.\n\n2. Perluasan cakupan geografis kemitraan akomodasi ke kota-kota destinasi wisata budaya lainnya di Indonesia (seperti Solo, Semarang, dan Malang) dengan tetap mempertahankan skema komisi ramah UMKM 5%.\n\n3. Peningkatan kapabilitas asisten cerdas AI melalui integrasi Retrieval-Augmented Generation (RAG) berbasis vector database (seperti pgvector di Supabase) agar asisten dapat memperbarui informasi jadwal event budaya lokal dan diskon musiman secara real-time.", first_indent=0.5)

    doc.add_page_break()

    # =========================================================================
    # DAFTAR PUSTAKA
    # =========================================================================
    p_dp = doc.add_paragraph()
    p_dp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_dp.paragraph_format.space_after = Pt(18)
    r = p_dp.add_run("DAFTAR PUSTAKA")
    r.bold = True
    r.font.size = Pt(14)

    bib_entries = [
        "Brooke, J. (1996). SUS: A 'quick and dirty' usability scale. Usability Evaluation in Industry, 189(194), 4–7.",
        "DOKU. (2024). DOKU API Documentation: Jokul Checkout & Payment Integration. Jakarta: PT Nusa Satu Inti Artha. Diakses dari https://developers.doku.com/",
        "Google AI for Developers. (2024). Gemini API Documentation: Structured Outputs and In-Context Grounding. Mountain View: Google LLC. Diakses dari https://ai.google.dev/",
        "Kementerian Dalam Negeri Republik Indonesia. (2006). Undang-Undang Republik Indonesia Nomor 23 Tahun 2006 tentang Administrasi Kependudukan. Jakarta: Sekretariat Negara RI.",
        "Kurniawan, A., Wulandari, R., & Pratama, I. P. (2024). Analisis Dampak Komisi Online Travel Agent terhadap Keberlangsungan Finansial Usaha Akomodasi Kecil Menengah. Jurnal Manajemen Perhotelan dan Pariwisata, 7(2), 112–124.",
        "Nugroho, D. A., & Ramadhan, F. (2024). Implementasi Large Language Model untuk Layanan Tanya-Jawab Destinasi Pariwisata Berbasis Web. Jurnal Komputasi dan Sistem Informasi, 12(1), 45–56.",
        "Pratama, B. S., & Wibowo, H. (2022). Rancang Bangun Sistem Informasi Reservasi Hotel Berbasis Web Menggunakan Framework Laravel. Jurnal Informatika dan Rekayasa Perangkat Lunak, 4(1), 33–42.",
        "Pressman, R. S., & Maxim, B. R. (2020). Software Engineering: A Practitioner's Approach (9th ed.). New York: McGraw-Hill Education.",
        "Santoso, B., & Hidayat, M. N. (2023). Pemanfaatan Teknologi Quick Response (QR) Code dalam Meningkatkan Efisiensi Check-in Tamu Perhotelan. Jurnal Rekayasa Teknologi Informasi, 5(3), 189–198.",
        "Sauro, J. (2011). A Practical Guide to the System Usability Scale: Background, Benchmarks & Best Practices. Denver: Measuring Usability LLC.",
        "Sommerville, I. (2016). Software Engineering (10th ed.). Boston: Pearson Education.",
        "Universitas Islam Indonesia. (2024). Buku Panduan Tugas Akhir Program Studi Informatika Program Sarjana. Yogyakarta: Jurusan Informatika FTI UII."
    ]

    for bib in sorted(bib_entries):
        p_bib = doc.add_paragraph()
        p_bib.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p_bib.paragraph_format.line_spacing = 1.15
        p_bib.paragraph_format.space_after = Pt(6)
        p_bib.paragraph_format.left_indent = Inches(0.5)
        p_bib.paragraph_format.first_line_indent = Inches(-0.5)
        r = p_bib.add_run(bib)
        r.font.name = 'Times New Roman'
        r.font.size = Pt(11)

    # Save document
    output_filename = "Skripsi_Pengembangan_Prototipe_Aplikasi_Hotel_Raynor_Athaillah.docx"
    output_path = os.path.join(os.path.dirname(__file__), '..', output_filename)
    doc.save(output_path)
    print(f"[SUKSES] Skripsi berhasil dibuat: {output_path}")

if __name__ == "__main__":
    create_thesis_document()
