const https = require('https');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'stayjogja-9b705';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ─── Helpers: Konversi JS Object ↔ Firestore Value format ─────────────────
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: val.toString() };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function parseFirestoreField(fieldObj) {
  if (!fieldObj) return null;
  if ('stringValue' in fieldObj) return fieldObj.stringValue;
  if ('integerValue' in fieldObj) return parseInt(fieldObj.integerValue, 10);
  if ('doubleValue' in fieldObj) return parseFloat(fieldObj.doubleValue);
  if ('booleanValue' in fieldObj) return fieldObj.booleanValue;
  if ('nullValue' in fieldObj) return null;
  if ('arrayValue' in fieldObj) {
    const vals = fieldObj.arrayValue.values || [];
    return vals.map(parseFirestoreField);
  }
  if ('mapValue' in fieldObj) {
    const res = {};
    const flds = fieldObj.mapValue.fields || {};
    for (const [k, v] of Object.entries(flds)) {
      res[k] = parseFirestoreField(v);
    }
    return res;
  }
  return null;
}

function parseFirestoreDoc(doc) {
  const fields = doc.fields || {};
  const res = { id: doc.name.split('/').pop() };
  for (const [k, v] of Object.entries(fields)) {
    res[k] = parseFirestoreField(v);
  }
  return res;
}

// ─── HTTP Promise Helpers ──────────────────────────────────────────────────
function httpRequest(url, options = {}, payload = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: json });
          } else {
            resolve({ statusCode: res.statusCode, error: json, data: null });
          }
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
    req.end();
  });
}

// ─── CRUD Operations ───────────────────────────────────────────────────────
async function fetchCollection(collectionName, pageSize = 100) {
  try {
    const url = `${BASE_URL}/${collectionName}?pageSize=${pageSize}`;
    const res = await httpRequest(url, { method: 'GET' });
    if (res.data && res.data.documents) {
      return res.data.documents.map(parseFirestoreDoc);
    }
    return [];
  } catch (err) {
    console.warn(`[FirestoreClient] fetchCollection ${collectionName} error:`, err.message);
    return [];
  }
}

async function fetchDocument(collectionName, docId) {
  try {
    const url = `${BASE_URL}/${collectionName}/${docId}`;
    const res = await httpRequest(url, { method: 'GET' });
    if (res.data && res.data.fields) {
      return parseFirestoreDoc(res.data);
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function setDocument(collectionName, docId, data) {
  try {
    const url = `${BASE_URL}/${collectionName}/${docId}`;
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
      if (k !== 'id') fields[k] = toFirestoreValue(v);
    }
    const payload = JSON.stringify({ fields });
    const res = await httpRequest(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, payload);
    return res.statusCode >= 200 && res.statusCode < 300;
  } catch (err) {
    console.warn(`[FirestoreClient] setDocument ${collectionName}/${docId} error:`, err.message);
    return false;
  }
}

async function deleteDocument(collectionName, docId) {
  try {
    const url = `${BASE_URL}/${collectionName}/${docId}`;
    const res = await httpRequest(url, { method: 'DELETE' });
    return res.statusCode >= 200 && res.statusCode < 300;
  } catch (err) {
    console.warn(`[FirestoreClient] deleteDocument ${collectionName}/${docId} error:`, err.message);
    return false;
  }
}

module.exports = {
  fetchCollection,
  fetchDocument,
  setDocument,
  deleteDocument,
  PROJECT_ID
};
