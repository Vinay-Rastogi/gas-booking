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

mongoose.connect(URI, { useNewUrlParser: true, useUnifiedTopology: true });

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

const User = mongoose.model('User', userSchema);

const jwtSecret = 'your_jwt_secret';
gasBookingLibrary.jwtSecret = jwtSecret;

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied. Token is missing.' });

  try {
    const decoded = jwt.verify(token, gasBookingLibrary.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

app.post('/book-gas', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const address = req.body.address;

    // Assuming gasBookingLibrary.bookGas is modified to work with MongoDB
    const message = await gasBookingLibrary.bookGas(userEmail, address, User, 'GasBookings');
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/get-recent-booking', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const recentBooking = await gasBookingLibrary.getRecentBooking(userEmail, User, 'GasBookings');
    res.json({ recentBooking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/get-all-bookings', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;

    const bookings = await gasBookingLibrary.getAllBookings(userEmail, User, 'GasBookings');
    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/cancel-booking/:bookingId', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const bookingId = req.params.bookingId;

    const message = await gasBookingLibrary.cancelBooking(userEmail, bookingId, User, 'GasBookings');
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
      const token = jwt.sign({ email: user.email }, gasBookingLibrary.jwtSecret, { expiresIn: '1h' });
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
