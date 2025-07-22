require('dotenv').config(); // Must be first

const admin = require('firebase-admin');

if (!process.env.FIREBASE_NYELEZANGU) {
  console.error('❌ FIREBASE_NYELEZANGU is not defined');
  process.exit(1);
}

let firebaseConfig;
try {
  firebaseConfig = JSON.parse(process.env.FIREBASE_NYELEZANGU);
} catch (err) {
  console.error('❌ Invalid JSON in FIREBASE_NYELEZANGU:', err);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});

const db = admin.firestore();
module.exports = { db, admin };
