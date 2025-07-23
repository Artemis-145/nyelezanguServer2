const express = require('express');
const router = express.Router();
const { sendSMS } = require('../services/africasTalking');
const { sendEmail } = require('../services/emailService');
const { db } = require('../services/firebaseAdmin');

// POST /api/book
router.post('/book', async (req, res) => {
  console.log(req.url);

  try {
    const { uid, name, phone, email, salonId } = req.body;

    if (!uid || !name || !phone || !email || !salonId) {
      return res.status(400).json({ message: 'Missing required booking info' });
    }

    const salonRef = db.collection('salons').doc(salonId);
    const salonSnap = await salonRef.get();

    if (!salonSnap.exists) {
      return res.status(404).json({ message: 'Salon not found' });
    }

    const salon = salonSnap.data();

    // Notify user
    const userMsg = `Hi ${name}, your booking at ${salon.name} has been received. They will get back to you soon.\nThank you for using Nyele Zangu`;
    await sendSMS(phone, userMsg);
    await sendEmail(email, `Booking Confirmed at ${salon.name}`, userMsg);

    // Notify salon
    const salonMsg = `Hello ${salon.name}, you have a new booking from ${name} (Phone: ${phone}, Email: ${email}).\nThank you for using Nyele Zangu`;
    await sendSMS(salon.phone, salonMsg);
    await sendEmail(salon.email, 'New Booking Received', salonMsg);

    res.status(200).json({ message: 'Notifications sent successfully' });

  } catch (error) {
    console.error('Booking notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.post('/book-response', async (req, res) => {

  try {
    const { userId, status,name, email, phone, salonName } = req.body;

  if (!userId || !status || !email || !phone || !name) {
    return res.status(400).json({ error: 'Missing required data' });
  }



    // Notify user
    const userMsg = `Hi ${name}, Your booking at ${salonName} has been ${status}. Check your application for more information.\nThank you for using Nyele Zangu`;
    await sendSMS(phone, userMsg);
    await sendEmail(email, `Booking Status at ${salonName}`, userMsg);
    res.status(200).json({ message: 'Notifications sent successfully' });

  } catch (error) {
    console.error('Approval notification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
