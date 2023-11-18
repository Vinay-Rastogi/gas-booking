document.addEventListener('DOMContentLoaded', async function () {
    const backendBaseUrl = 'http://localhost:3000'; // Replace with your actual backend URL

    function displayErrorMessage(message) {
        const errorMessageElement = document.getElementById('errorMessage');
        errorMessageElement.innerText = message;
    }

    // Function to get the JWT token from localStorage
    function getAuthToken() {
        return localStorage.getItem('jwtToken');
    }

    // Function to fetch options for authenticated requests
    function getAuthRequestOptions() {
        const authToken = getAuthToken();
        return {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `${authToken}` : '',
            },
        };
    }

    // Function to check if the user is logged in
    function isLoggedIn() {
        return !!getAuthToken();
    }

    // Function to redirect the user to the login page if not logged in
    function redirectToLogin() {
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
        }
    }

    // Function to redirect the user to the home page if already logged in
    function redirectToHome() {
        if (isLoggedIn()) {
            window.location.href = 'viewAllBooking.html';
        }
    }

    // Auto-redirect to home if already logged in
    // redirectToHome();

    // Attach event listeners to form submission buttons
    if (document.body.id === 'loginPage')
        document.getElementById('loginFormButton').addEventListener('click', submitLoginForm);
    if (document.body.id === 'signupPage')
        document.getElementById('signupFormButton').addEventListener('click', submitSignupForm);
    if (document.body.id === 'bookGasPage')
        document.getElementById('bookGasFormButton').addEventListener('click', submitGasBookingForm);
    if (document.body.id === 'viewBookings')
        fetchAllBookings();
    if(document.body.id === 'viewBookings')
     document.getElementById('cancelBookingBtn').addEventListener('click',cancelRecentBooking);

    // Fetch recent booking details when the page loads (update as needed)
    if (document.body.id === 'recentBookingPage') {
        // Redirect to login if not logged in
        redirectToLogin();
        fetchRecentBookingDetails();
    }

    // Fetch all bookings when the page loads (update as needed)
    if (document.body.id === 'allBookingsPage') {
        redirectToLogin();
        fetchAllBookings();
    }

    async function submitLoginForm() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            displayErrorMessage('Please enter both email and password.');
            return;
        }

        try {
            const response = await fetch(`${backendBaseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (response.ok) {
                const data = await response.json();
                alert('Login successful!');
                localStorage.setItem('jwtToken', data.token); // Save the JWT token
                redirectToHome();
                // Redirect to the desired page or update UI
            } else {
                displayErrorMessage('Invalid email or password.');
            }
        } catch (error) {
            console.error('Error during login:', error);
            displayErrorMessage('An error occurred. Please try again later.');
        }
    }

    async function submitSignupForm() {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const address = document.getElementById('address').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!firstName || !lastName || !email || !address || !password) {
            displayErrorMessage('Please fill out all fields.');
            return;
        }

        try {
            const response = await fetch(`${backendBaseUrl}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ firstName, lastName, address, email, password }),
            });

            if (response.ok) {
                alert('Signup successful!');
                // Redirect to the desired page or update UI
            } else {
                displayErrorMessage('Registration failed. Please try again later.');
            }
        } catch (error) {
            console.error('Error during signup:', error);
            displayErrorMessage('An error occurred. Please try again later.');
        }
    }

    async function submitGasBookingForm() {
        const address = document.getElementById('address').value;
        const email = document.getElementById('email').value;

        if (!address) {
            displayErrorMessage('Please enter the delivery address.');
            return;
        }

        try {
            const response = await fetch(`${backendBaseUrl}/book-gas`, {
                method: 'POST',
                ...getAuthRequestOptions(), // Include authentication headers
                // headers: {
                //     'Content-Type': 'application/json',
                // },
                body: JSON.stringify({ address, email }),
            });

            if (response.ok) {
                alert('Gas booking successful!');
                // Redirect to the desired page or update UI
            } else {
                const errorMessage = await response.text();
                displayErrorMessage(`Failed to book gas. ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error during gas booking:', error);
            displayErrorMessage('An error occurred. Please try again later.');
        }
    }


    async function fetchRecentBookingDetails() {
        try {
            const response = await fetch(`${backendBaseUrl}/recent-booking`, {
                method: 'GET',
                ...getAuthRequestOptions(), // Include authentication headers
            });

            if (response.ok) {
                const recentBooking = await response.json();
                const bookingIdElement = document.getElementById('bookingId');
                const addressElement = document.getElementById('address');
                const bookingDateElement = document.getElementById('bookingDate');

                bookingIdElement.innerText = recentBooking.bookingId;
                addressElement.innerText = recentBooking.address;
                bookingDateElement.innerText = new Date(recentBooking.bookingDate).toLocaleString();
            } else {
                console.error('Error fetching recent booking details:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error during fetchRecentBookingDetails:', error);
            // Display a generic error message
        }
    }

    async function cancelRecentBooking() {
        try {
            const response = await fetch(`${backendBaseUrl}/cancel-recent-booking`, {
                method: 'DELETE',
                ...getAuthRequestOptions(), // Include authentication headers
            });

            if (response.ok) {
                alert('Recent booking canceled!');
                // Redirect to the desired page or update UI
            } else {
                console.error('Error canceling recent booking:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error during cancelRecentBooking:', error);
            // Display a generic error message
        }
    }

    async function fetchAllBookings() {
        try {
            const response = await fetch(`${backendBaseUrl}/user-bookings`, {
                method: 'GET',
                ...getAuthRequestOptions(), // Include authentication headers
            });

            if (response.ok) {

                const allBookings = await response.json();
                const allBookingsList = document.getElementById('allBookingsList');
                console.log(allBookings);

                if (allBookings.length <= 0) {
                    console.log("Does Not have any Booking");

                }

                else {
                    allBookings.forEach(booking => {

                        const listItem = document.createElement('li');
                        listItem.innerHTML = `
                        <p><strong>Address:</strong> <span class="address">${booking.address}</span></p>
                        <p><strong>Booking Date:</strong> <span class="booking-date">${new Date(booking.bookingDate).toLocaleString()}</span></p>
                    `;
                        allBookingsList.appendChild(listItem);
                    });
                }

            } else {
                console.error('Error fetching all bookings:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error during fetchAllBookings:', error);
            // Display a generic error message
        }
    }

    // Logout function
    function logout() {
        localStorage.removeItem('jwtToken');
        // Redirect to the login page or update UI
    }
});
