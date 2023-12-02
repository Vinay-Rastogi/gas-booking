const connectToDynamoDB = async () => {
  try {
    console.log('Connected to DynamoDB');
  } catch (err) {
    console.error('Error connecting to DynamoDB:', err);
  }
};

async function bookGas(email, address, dynamoDB, tableName) {
  try {
    // Check if the user has booked within the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const existingBooking = await dynamoDB
      .scan({
        TableName: tableName,
        FilterExpression: 'email = :email AND bookingDate >= :sevenDaysAgo',
        ExpressionAttributeValues: {
          ':email': email,
          ':sevenDaysAgo': sevenDaysAgo.toISOString(),
        },
      })
      .promise();

    if (existingBooking.Items.length > 0) {
      throw new Error('Cannot book gas within 7 days of the previous booking.');
    }

    // Proceed with the booking
    const bookingDate = new Date().toISOString();
    const bookingParams = {
      TableName: tableName,
      Item: {
        bookingDate,
        email,
        address,
      },
    };

    await dynamoDB.put(bookingParams).promise();

    return 'Gas booking created successfully!';
  } catch (error) {
    console.error(error);
    throw new Error('Failed to book gas. ' + error.message);
  }
}

async function viewAllBookings(email, dynamoDB, tableName) {
  try {
    const userBookings = await dynamoDB
      .query({
        TableName: tableName,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': email,
        },
      })
      .promise();

    return userBookings.Items;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to retrieve user bookings. ' + error.message);
  }
}

async function updateAddress(email, dynamoDB, tableName, newAddress) {
  try {
    console.log(newAddress);
    const userBookingParams = {
      TableName: tableName,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
      ScanIndexForward: false, // Sort in descending order by booking date
      Limit: 1, // Retrieve only the latest booking
    };

    const latestBooking = await dynamoDB.query(userBookingParams).promise();

    console.log('Latest Booking:', latestBooking);

    if (!latestBooking.Items || latestBooking.Items.length === 0) {
      throw new Error('No booking found to edit Address.');
    }

    const currentDateTime = new Date();
    const bookingDateTime = new Date(latestBooking.Items[0].bookingDate);
    const hoursDifference = Math.abs(currentDateTime - bookingDateTime) / 36e5;

    if (hoursDifference > 24) {
      throw new Error('Cannot edit booking address after 24 hours of booking date-time.');
    }

    console.log('Updating Address to:', newAddress);

    await dynamoDB
      .update({
        TableName: tableName,
        Key: {
          email: email,
          bookingDate: latestBooking.Items[0].bookingDate,
        },
        UpdateExpression: 'SET #a = :address',
        ExpressionAttributeNames: {
          '#a': 'address',
        },
        ExpressionAttributeValues: {
          ':address': newAddress,
        },
      })
      .promise();

    console.log('Address Updated successfully!');
    return 'Address Updated successfully!';
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed to edit address ' + error.message);
  }
}

async function cancelBooking(email, dynamoDB, tableName) {
  try {
    // Find the latest booking for the specified email
    const userBookingParams = {
      TableName: tableName,
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
      ScanIndexForward: false, // Sort in descending order by booking date
      Limit: 1, // Retrieve only the latest booking
    };

    const latestBooking = await dynamoDB.query(userBookingParams).promise();

    // Check if there is a booking to cancel
    if (!latestBooking.Items || latestBooking.Items.length === 0) {
      throw new Error('No booking found to cancel.');
    }

    // Check if the booking is within the last 24 hours
    const currentDateTime = new Date();
    const bookingDateTime = new Date(latestBooking.Items[0].bookingDate);
    const hoursDifference = Math.abs(currentDateTime - bookingDateTime) / 36e5;

    if (hoursDifference > 24) {
      throw new Error('Cannot cancel a booking after 24 hours of booking date-time.');
    }

    // Proceed with cancellation
    await dynamoDB
      .delete({
        TableName: tableName,
        Key: {
          email: email,
          bookingDate: latestBooking.Items[0].bookingDate,
        },
      })
      .promise();

    return 'Booking canceled successfully!';
  } catch (error) {
    console.error(error);
    throw new Error('Failed to cancel booking. ' + error.message);
  }
}

module.exports = {
  connectToDynamoDB,
  bookGas,
  viewAllBookings,
  updateAddress,
  cancelBooking,
};
