require('dotenv').config();

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
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists. Please choose a different email.' });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 12);

    // Save the user to DynamoDB
    await saveUserToDynamoDB(firstName, lastName, address, email, hashedPassword);

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
    const user = await getUserByEmail(email);

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

    const message = await bookGas(userEmail, address);
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to view all user bookings
app.get('/user-bookings', verifyToken, async (req, res) => {
  try {
    const email = req.user.email;

    const bookings = await viewAllBookings(email);
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

    const response = await updateAddress(email, address);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to cancel the most recent booking
app.delete('/cancel-recent-booking', verifyToken, async (req, res) => {
  try {
    const email = req.user.email;
    const response = await cancelBooking(email);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Function to retrieve user by email from DynamoDB
async function getUserByEmail(email) {
  const params = {
    TableName: usersTableName,
    Key: {
      email: email,
    },
  };

  const result = await dynamoDB.get(params).promise();

  return result.Item;
}

// Function to save user to DynamoDB
async function saveUserToDynamoDB(firstName, lastName, address, email, password) {
  const params = {
    TableName: usersTableName,
    Item: {
      firstName: firstName,
      lastName: lastName,
      address: address,
      email: email,
      password: password,
    },
  };

  await dynamoDB.put(params).promise();
}

// Function to book gas
async function bookGas(email, address) {
  try {
    // Check if the user has booked within the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const existingBooking = await getRecentBooking(email, sevenDaysAgo.toISOString());

    if (existingBooking) {
      throw new Error('Cannot book gas within 7 days of the previous booking.');
    }

    // Proceed with the booking
    const bookingDate = new Date().toISOString();
    const booking = {
      bookingDate: bookingDate,
      email: email,
      address: address,
    };

    await saveGasBookingToDynamoDB(booking);

    return 'Gas booking created successfully!';
  } catch (error) {
    console.error('Error during gas booking:', error);
    throw new Error('Failed to book gas. ' + error.message);
  }
}

// Function to get the most recent booking
async function getRecentBooking(email, startDate) {
  const params = {
    TableName: gasBookingTableName,
    IndexName: 'email-bookingDate-index',
    KeyConditionExpression: 'email = :email AND bookingDate >= :startDate',
    ExpressionAttributeValues: {
      ':email': email,
      ':startDate': startDate,
    },
    ScanIndexForward: false,
    Limit: 1,
  };

  const result = await dynamoDB.query(params).promise();

  return result.Items.length > 0 ? result.Items[0] : null;
}

// Function to save gas booking to DynamoDB
async function saveGasBookingToDynamoDB(booking) {
  const params = {
    TableName: gasBookingTableName,
    Item: booking,
  };

  await dynamoDB.put(params).promise();
}

// Function to view all user bookings
async function viewAllBookings(email) {
  const params = {
    TableName: gasBookingTableName,
    IndexName: 'email-bookingDate-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
    ScanIndexForward: false,
  };

  const result = await dynamoDB.query(params).promise();

  return result.Items;
}

// Function to update user address
async function updateAddress(email, newAddress) {
  try {
    console.log(newAddress);
    const latestBooking = await getRecentBooking(email, '1970-01-01T00:00:00.000Z');

    if (!latestBooking) {
      throw new Error('No booking found to edit Address.');
    }

    const currentDateTime = new Date();
    const bookingDateTime = new Date(latestBooking.bookingDate);
    const hoursDifference = Math.abs(currentDateTime - bookingDateTime) / 36e5;

    if (hoursDifference > 24) {
      throw new Error('Cannot edit booking address after 24 hours of booking date-time.');
    }

    console.log('Updating Address to:', newAddress);

    await dynamoDB.update({
      TableName: gasBookingTableName,
      Key: {
        email: email,
        bookingDate: latestBooking.bookingDate,
      },
      UpdateExpression: 'SET #address = :newAddress',
      ExpressionAttributeNames: {
        '#address': 'address',
      },
      ExpressionAttributeValues: {
        ':newAddress': newAddress,
      },
    }).promise();

    console.log('Address Updated successfully!');
    return 'Address Updated successfully!';
  } catch (error) {
    console.error('Error during updating address:', error);
    throw new Error('Failed to update address ' + error.message);
  }
}

// Function to cancel the most recent booking
async function cancelBooking(email) {
  try {
    const latestBooking = await getRecentBooking(email, '1970-01-01T00:00:00.000Z');

    if (!latestBooking) {
      throw new Error('No booking found to cancel.');
    }

    // Check if the booking is within the last 24 hours
    const currentDateTime = new Date();
    const bookingDateTime = new Date(latestBooking.bookingDate);
    const hoursDifference = Math.abs(currentDateTime - bookingDateTime) / 36e5;

    if (hoursDifference > 24) {
      throw new Error('Cannot cancel a booking after 24 hours of booking date-time.');
    }

    // Proceed with cancellation
    await dynamoDB.delete({
      TableName: gasBookingTableName,
      Key: {
        email: email,
        bookingDate: latestBooking.bookingDate,
      },
    }).promise();

    return 'Booking canceled successfully!';
  } catch (error) {
    console.error('Error during canceling booking:', error);
    throw new Error('Failed to cancel booking. ' + error.message);
  }
}

app.use("*", (_, res) => res.redirect("/login.html"))

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on port ${port}`);
});
