const {
  getUserByEmail,
  saveUserToDynamoDB,
  bookGas,
  getRecentBooking,
  saveGasBookingToDynamoDB,
  viewAllBookings,
  updateAddress,
  cancelBooking
} = require('./bookGasLibrary.js');


const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const bcrypt = require('bcrypt');
const path = require("path")

const app = express();
const port = process.env.PORT || 8080;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://test-env.eba-ryprfkss.us-east-1.elasticbeanstalk.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", express.static(path.join(__dirname, "..", "client")))

// Configure AWS DynamoDB
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'AKIA2GSKERJERU6GFI4Y',
  secretAccessKey: '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',
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const gasBookingTableName = 'GasBookings';
const usersTableName = 'Users';
const jwtSecret = 'your_jwt_secret';
const IndexName = 'email-bookingDate-index';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(403).json({ error: 'Token not provided' });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Failed to authenticate token' });
    }
    req.user = decoded;
    next();
  });
};

// Endpoint to get background image
app.get('/background-image', (req, res) => {
  const imageUrl = './bgImg.png';
  res.json({ imageUrl });
});

// Endpoint for user signup
app.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, address, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await getUserByEmail(dynamoDB, email, usersTableName);

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists. Please choose a different email.' });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 12);

    // Save the user to DynamoDB
    await saveUserToDynamoDB(dynamoDB, firstName, lastName, address, email, hashedPassword, usersTableName);

    res.json({ message: 'User signup successful!' });
  } catch (error) {
    console.error('Error during user signup:', error);
    res.status(500).json({ error: 'Failed to perform user signup.' });
  }
});

// Endpoint for user login
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Retrieve user from DynamoDB based on email
    const user = await getUserByEmail(dynamoDB, email, usersTableName);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Compare the provided password with the stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      const token = jwt.sign({ email: user.email }, jwtSecret, { expiresIn: '1h' });
      res.json({ message: 'User login successful!', token });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ error: 'Failed to perform user login.' });
  }
});

// Endpoint for gas booking
app.post('/book-gas', verifyToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const address = req.body.address;

    const message = await bookGas(dynamoDB, userEmail, address, gasBookingTableName, IndexName);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to view all user bookings
app.get('/user-bookings', verifyToken, async (req, res) => {
  try {
    const email = req.user.email;

    const bookings = await viewAllBookings(dynamoDB, email, gasBookingTableName, IndexName);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to update user address
app.put('/update-address', verifyToken, async (req, res) => {
  try {
    const email = req.user.email;
    const address = req.body.updatedAddress;

    const response = await updateAddress(dynamoDB, email, newAddress, gasBookingTableName, IndexName);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to cancel the most recent booking
app.delete('/cancel-recent-booking', verifyToken, async (req, res) => {
  try {
    const email = req.user.email;
    const response = await cancelBooking(dynamoDB, email, gasBookingTableName, IndexName);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.use("*", (_, res) => res.redirect("/login.html"))

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
