const https = require('https');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'stayjogja-9b705';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

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

function fetchCollection(collectionName) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}/${collectionName}?pageSize=100`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const json = JSON.parse(data);
            const docs = json.documents || [];
            resolve(docs.map(parseFirestoreDoc));
          } else {
            console.warn(`[FirestoreClient] HTTP ${res.statusCode} for ${collectionName}`);
            resolve([]);
          }
        } catch (e) {
          console.warn(`[FirestoreClient] Parse error for ${collectionName}:`, e.message);
          resolve([]);
        }
      });
    }).on('error', (err) => {
      console.warn(`[FirestoreClient] Request error for ${collectionName}:`, err.message);
      resolve([]);
    });
  });
}

module.exports = {
  fetchCollection,
  PROJECT_ID
};
