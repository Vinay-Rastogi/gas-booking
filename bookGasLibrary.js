const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

async function bookGas(userEmail, address, User, tableName) {
  try {
    const recentBooking = await getRecentBooking(userEmail, User, tableName);

    if (recentBooking) {
      const lastBookingDate = new Date(recentBooking.BookingDate);
      console.log("here")
      const currentDate = new Date();
      const sevenDaysAgo = new Date(currentDate);
      sevenDaysAgo.setDate(currentDate.getDate() - 7);

      if (lastBookingDate > sevenDaysAgo) {
        throw new Error('You can only book gas once every 7 days.');
      }
    }

    const booking = {
      BookingID: 'unique_booking_id_' + Date.now(),
      CustomerEmail: userEmail,
      Address: address,
      BookingDate: new Date().toISOString(),
    };

    await User.updateOne({ email: userEmail }, { $push: { [tableName]: booking } });

    return 'Gas booking created successfully!';
  } catch (error) {
    console.error(error);
    throw new Error('Failed to book gas. ' + error.message);
  }
}

async function getRecentBooking(userEmail, User, tableName) {
  try {
    const user = await User.findOne({ email: userEmail });
    if (user && user[tableName] && user[tableName].length > 0) {
      const bookings = user[tableName].sort((a, b) => new Date(b.BookingDate) - new Date(a.BookingDate));
      return bookings[0];
    }
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getAllBookings(userEmail, User, tableName) {
  try {
    const user = await User.findOne({ email: userEmail });
    return user && user[tableName] ? user[tableName] : [];
  } catch (error) {
    console.error(error);
    throw new Error('Failed to get gas bookings. ' + error.message);
  }
}

async function cancelBooking(userEmail, bookingId, User, tableName) {
  try {
    const user = await User.findOne({ email: userEmail });
    if (user && user[tableName]) {
      const booking = user[tableName].find((b) => b.BookingID === bookingId);

      if (!booking) {
        throw new Error('Booking not found.');
      }

      const bookingDate = new Date(booking.BookingDate);
      const currentDate = new Date();

      const timeDifference = currentDate - bookingDate;
      const hoursDifference = Math.floor(timeDifference / (1000 * 60 * 60));

      if (hoursDifference <= 24) {
        await User.updateOne({ email: userEmail }, { $pull: { [tableName]: { BookingID: bookingId } } });
        return 'Booking canceled successfully!';
      } else {
        throw new Error('Cannot cancel the booking after 24 hours.');
      }
    } else {
      throw new Error('User or bookings not found.');
    }
  } catch (error) {
    console.error(error);
    throw new Error('Failed to cancel booking. ' + error.message);
  }
}

function initJWTSecret(secret) {
  return secret;
}

// Export the functions
module.exports = {
  initJWTSecret,
  bookGas,
  getRecentBooking,
  cancelBooking,
  getAllBookings,
};
