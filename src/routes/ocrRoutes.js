const express = require('express');
const router = express.Router();
const { extractKtpWithVision } = require('../services/geminiService');

// POST /api/ocr/scan-ktp
// Memindai foto fisik KTP / SIM langsung dengan Gemini Multimodal Vision
router.post('/scan-ktp', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Foto KTP / SIM tidak boleh kosong' });
    }

    const data = await extractKtpWithVision(image);
    if (data && (data.nik || data.nama)) {
      return res.json({
        success: true,
        source: 'gemini_vision',
        data
      });
    }

    return res.status(422).json({
      success: false,
      message: 'Gagal mengekstrak data dari foto KTP/SIM secara otomatis'
    });
  } catch (err) {
    console.error('[OCR Route] Error scanning KTP:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
