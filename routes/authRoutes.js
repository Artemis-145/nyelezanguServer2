const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const {db,admin} = require('../services/firebaseAdmin'); 
const { sendSMS } = require('../services/africasTalking'); // <-- Use your custom SMS sender
const { sendVerificationEmail } = require('../services/emailService');
const { Timestamp } = require('firebase-admin/firestore');

router.post('/send-code', async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;

  if (!name || !email || !phone || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const message = `Hey there!!\nYour Nyele Zangu verification code is: ${code}`;

  try {
    // 🔐 Store verification in Firestore
    await db.collection('verifications').doc(email).set({
      name,
      email,
      phone,
      code,
      createdAt: Timestamp.now(),
    });

    // ✉️ Send email
    await sendVerificationEmail({
      to_name: name,
      to_email: email,
      code,
    });

    // 📱 Send SMS
    await sendSMS(phone, message);

    res.status(200).json({ success: true, message: 'Verification code sent to email and phone.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send verification code.' });
  }
});


// ========== 2. Verify Code and Register ==========
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  try {
    const docRef = db.collection('verifications').doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(400).json({ error: 'No verification request found.' });
    }

    const data = doc.data();

    if (data.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    // Optional: Check for expiry
    const now = Date.now();
    const createdAt = data.createdAt.toDate().getTime();
    if (now - createdAt > 15 * 60 * 1000) {
      return res.status(400).json({ error: 'Verification code expired.' });
    }

    // ✅ Create user
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: data.name,
      phoneNumber: data.phone,
    });

    // ✅ Save profile
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: data.name,
      email: data.email,
      phone: data.phone,
      type:"client",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ❌ Delete verification record
    await docRef.delete();

    res.status(200).json({ success: true, message: 'User verified and created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'User creation failed.' });
  }
});

router.post('/send-code-salon', async (req, res) => {
  const { name, email, phone, address, country, password, services, location } = req.body;

  if (!name || !email || !phone || !password || !address || !country) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await db.collection('verifications').doc(email).set({
      type: 'salon',
      contact: email, 
      code,
      meta: { name, email, phone, address, country, password, services, location },
      createdAt: Timestamp.now(),
    });

    await sendVerificationEmail({ to_name: name, to_email: email, code });
    await sendSMS(phone, `Your Nyele Zangu Salon verification code is ${code}`);

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-code-salon error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// routes/authSalonRoutes.js (continued)
router.post('/verify-code-salon', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ success: false, message: 'Missing email or code' });

  // const snap = await db.collection('verifications').doc(email.toLowerCase()).get();
  const snap = await db.collection('verifications').doc(email).get();
  console.log(snap.data());
  if (!snap.exists || snap.data().code !== code) { 
    return res.status(400).json({ success: false, message: 'Invalid or expired code' });
  }

  const { meta } = snap.data();
  await db.collection('salons').add({
    ...meta,
    email: email.toLowerCase(),
    approved: false,
    createdAt: Timestamp.now(),
  });
  // ✅ Create user
    const userRecord = await admin.auth().createUser({
      email: snap.data()?.meta?.email,
      password: snap.data()?.meta?.password,
      displayName: snap.data()?.meta?.name,
      phoneNumber: snap.data()?.meta?.phone,
    });

    // ✅ Save profile
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: snap.data()?.meta?.name,
      email: snap.data()?.meta?.email,
      phone: snap.data()?.meta?.phone,
      type:"saloon",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  await db.collection('verifications').doc(email.toLowerCase()).delete();
  res.json({ success: true });
});



module.exports = router;
