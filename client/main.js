document.addEventListener('DOMContentLoaded', async function () {
    const backendBaseUrl = 'http://localhost:3000';

    function displayErrorMessage(message) {
        const errorMessageElement = document.getElementById('errorMessage');
        errorMessageElement.innerText = message;
    }

    function getAuthToken() {
        return localStorage.getItem('jwtToken');
    }

    function getAuthRequestOptions() {
        const authToken = getAuthToken();
        return {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authToken ? `${authToken}` : '',
            },
        };
    }

    function isLoggedIn() {
        return !!getAuthToken();
    }

    function redirectToLogin() {
        if (!isLoggedIn()) {
            window.location.href = 'login.html';
        }
    }

    function redirectToHome() {
        if (isLoggedIn()) {
            window.location.href = 'viewAllBooking.html';
        }
    }

    function redirectToBookGas() {
        if (isLoggedIn()) {
            window.location.href = 'bookGas.html'
        }
    }

    if (document.body.id === 'loginPage') {
        redirectToHome();
        document.getElementById('loginFormButton').addEventListener('click', submitLoginForm);
    }

    if (document.body.id === 'signupPage')
        document.getElementById('signupFormButton').addEventListener('click', submitSignupForm);

    if (document.body.id === 'bookGasPage') {
        redirectToLogin();
        document.getElementById('logout').addEventListener('click', logout);
        document.getElementById('bookGasFormButton').addEventListener('click', submitGasBookingForm);
    }

    if (document.body.id === 'viewBookings') {
        redirectToLogin();
        fetchAllBookings();
        document.getElementById('logout').addEventListener('click', logout);
        document.getElementById('cancelBookingBtn').addEventListener('click', cancelRecentBooking);
        document.getElementById('bookGasBtn').addEventListener('click', redirectToBookGas);
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
                localStorage.setItem('jwtToken', data.token);
                redirectToHome();
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
                redirectToLogin();
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

        await fetch(`${backendBaseUrl}/book-gas`, {
            method: 'POST',
            ...getAuthRequestOptions(), // Include authentication headers
            body: JSON.stringify({ address, email }),
        }).then(async res => await res.json()).then(res => {
            if (Object.keys(res).includes("error")) {
                displayErrorMessage(res.error)
                return
            }
            console.log(res)
        }).catch(err => {
            if (err.error) {
                displayErrorMessage(err.error)
            }
        })
    }


    async function cancelRecentBooking() {
        try {
            const response = await fetch(`${backendBaseUrl}/cancel-recent-booking`, {
                method: 'DELETE',
                ...getAuthRequestOptions(),
            });

            if (response.ok) {
                alert('Recent booking canceled!');
                window.location.reload();
            } else {
                alert('Error canceling recent booking. Please try again later! ' + 'Reason: ' + response.statusText);
                console.error('Error canceling recent booking:', response.status, response.statusText);
            }
        } catch (error) {
            alert('Error cancelling recent booking. Please try again later!')
            console.error('Error during cancelRecentBooking:', error);
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
                    document.getElementById('cancelBookingBtn').style.display = "none";
                    document.getElementById('noBookingsMessage').classList.remove('displayMessage');
                    document.getElementById('noBookingsMessage').style.color = 'red';
                }

                else {
                    allBookings.forEach(booking => {

                        document.getElementById('allBookingsList').style.color = 'black';
                        const listItem = document.createElement('li');
                        listItem.style.padding = '1%';
                        listItem.innerHTML = `
                        <p><strong>Address:</strong> <span class="address">${booking.address}</span></p>
                        <p><strong>Booking Date:</strong> <span class="booking-date">${new Date(booking.bookingDate).toLocaleString()}</span></p>
                        <hr>
                    `;
                        allBookingsList.appendChild(listItem);
                    });


                }

            } else {
                console.error('Error fetching all bookings:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('Error during fetchAllBookings:', error);
        }
    }
    function logout() {
        localStorage.removeItem('jwtToken');
        redirectToLogin();
    }
});
