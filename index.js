
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes'); // ← This is your new email/SMS verify flow
const bookRoutes=require('./routes/bookRoutes');
dotenv.config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes

app.use('/auth', authRoutes); // ← New auth endpoints
app.use('/api',bookRoutes);


// Start MQTT connection


app.listen(port, () => {
  console.log(`🚀 NyeleZagu Backend running at http://localhost:${port}`);
});

