const express = require('express');
const gasBookingLibrary = require('./bookGasLibrary');
const cors = require('cors');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const URI = 'mongodb+srv://lakshay2:lakshay@cluster0.jkhbko8.mongodb.net/?retryWrites=true&w=majority';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
});

const gasSchema = new mongoose.Schema({
  bookingDate: { type: String },
  email: { type: String },
  address: { type: String }
})

const GasBooking = mongoose.model('GasBooking', gasSchema);

const User = mongoose.model('User', userSchema);

const jwtSecret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InR1c2hhcnBoMUBnbWFpbC5jb20iLCJpYXQiOjE3MDAyMjc0MzYsImV4cCI6MTcwMDIzMTAzNn0.qF4QMSLi15LgXnlV8mfpVw_qYWfPhmG0Sv_2Ht3XKzo';


app.post('/book-gas', async (req, res) => {
  try {
    const userEmail = req.body.email;
    const address = req.body.address;

    // Assuming gasBookingLibrary.bookGas is modified to work with MongoDB
    const message = await gasBookingLibrary.bookGas(userEmail, address, GasBooking);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/user-bookings', async (req, res) => {

  try {
    const email = "tusharph1@gmail.com";

    const bookings = await gasBookingLibrary.viewAllBookings(email, GasBooking);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/cancel-recent-booking', async (req, res) => {
  try {
    const email = "tusharph1@gmail.com"
    const response = await gasBookingLibrary.cancelBooking(email, GasBooking)
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})


app.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, address, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists. Please choose a different email.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      firstName,
      lastName,
      address,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.json({ message: 'Customer signup successful!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      const token = jwt.sign({ email: user.email }, jwtSecret, { expiresIn: '1h' });
      res.json({ message: 'Login successful!', token });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

mongoose
  .connect(URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
