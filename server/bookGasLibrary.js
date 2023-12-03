// Function to retrieve user by email from DynamoDB
async function getUserByEmail(dynamoDB, email, usersTableName) {
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
async function saveUserToDynamoDB(dynamoDB, firstName, lastName, address, email, password, usersTableName) {
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
async function bookGas(dynamoDB, email, address, gasBookingTableName, IndexName) {
  try {
    // Check if the user has booked within the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const existingBooking = await getRecentBooking(dynamoDB, email, sevenDaysAgo.toISOString(), gasBookingTableName, IndexName);

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

    await saveGasBookingToDynamoDB(dynamoDB, booking, gasBookingTableName);

    return 'Gas booking created successfully!';
  } catch (error) {
    console.error('Error during gas booking:', error);
    throw new Error('Failed to book gas. ' + error.message);
  }
}

// Function to get the most recent booking
async function getRecentBooking(dynamoDB, email, startDate, gasBookingTableName, IndexName) {
  const params = {
    TableName: gasBookingTableName,
    IndexName: IndexName,
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
async function saveGasBookingToDynamoDB(dynamoDB, booking, gasBookingTableName) {
  const params = {
    TableName: gasBookingTableName,
    Item: booking,
  };

  await dynamoDB.put(params).promise();
}

// Function to view all user bookings
async function viewAllBookings(dynamoDB, email, gasBookingTableName, IndexName) {
  const params = {
    TableName: gasBookingTableName,
    IndexName: IndexName,
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
async function updateAddress(dynamoDB, email, newAddress, gasBookingTableName, IndexName) {
  try {
    console.log(newAddress);
    const latestBooking = await getRecentBooking(dynamoDB, email, '1970-01-01T00:00:00.000Z', gasBookingTableName, IndexName);

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
async function cancelBooking(dynamoDB, email, gasBookingTableName, IndexName) {
  try {
    const latestBooking = await getRecentBooking(dynamoDB, email, '1970-01-01T00:00:00.000Z', gasBookingTableName, IndexName);

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

module.exports = {
  getUserByEmail,
  saveUserToDynamoDB,
  bookGas,
  getRecentBooking,
  saveGasBookingToDynamoDB,
  viewAllBookings,
  updateAddress,
  cancelBooking
};
