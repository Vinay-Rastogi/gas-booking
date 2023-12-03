document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/background-image");
    const data = await handleApiError(response);
    console.log("Data:", data);
    document.body.style.backgroundImage = `url(${data.imageUrl})`;
  } catch (error) {
    console.error("Error:", error.message);
  }

  async function handleApiError(response) {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  }

  function displayErrorMessage(message) {
    const errorMessageElement = document.getElementById("errorMessage");
    errorMessageElement.innerText = message;
  }

  function getAuthToken() {
    return localStorage.getItem("jwtToken");
  }

  function getAuthRequestOptions() {
    const authToken = getAuthToken();
    return {
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken ? `${authToken}` : "",
      },
    };
  }

  function isLoggedIn() {
    return !!getAuthToken();
  }

  function redirectToLogin() {
    if (!isLoggedIn()) {
      window.location.href = "login.html";
    }
  }

  function redirectToHome() {
    if (isLoggedIn()) {
      window.location.href = "viewAllBooking.html";
    }
  }

  function redirectToBookGas() {
    if (isLoggedIn()) {
      window.location.href = "bookGas.html";
    }
  }

  function redirectToEditAddress() {
    if (isLoggedIn()) {
      window.location.href = "editAddress.html";
    }
  }

  if (document.body.id === "loginPage") {
    redirectToHome();
    document
      .getElementById("loginFormButton")
      .addEventListener("click", submitLoginForm);
  }

  if (document.body.id === "signupPage") {
    document
      .getElementById("signupFormButton")
      .addEventListener("click", submitSignupForm);
  }

  if (document.body.id === "bookGasPage") {
    redirectToLogin();
    document.getElementById("viewAllBooking").addEventListener("click", () => {
      window.location.href = "viewAllBooking.html";
    });
    document.getElementById("logout").addEventListener("click", logout);
    document
      .getElementById("bookGasFormButton")
      .addEventListener("click", submitGasBookingForm);
  }

  if (document.body.id === "viewBookings") {
    redirectToLogin();
    fetchAllBookings();
    document.getElementById("logout").addEventListener("click", logout);
    document
      .getElementById("cancelBookingBtn")
      .addEventListener("click", cancelRecentBooking);
    document
      .getElementById("bookGasBtn")
      .addEventListener("click", redirectToBookGas);
    document
      .getElementById("editBookingAddressBtn")
      .addEventListener("click", redirectToEditAddress);
  }

  if (document.body.id === "editBookingAddress") {
    document
      .getElementById("editBookingAddressBtn")
      .addEventListener("click", editBookingAddress);
    document
      .getElementById("viewBookings")
      .addEventListener("click", redirectToHome);
    document.getElementById("logout").addEventListener("click", logout);
  }

  async function submitLoginForm() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
      displayErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      const response = await fetch(`/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        alert("Login successful!");
        localStorage.setItem("jwtToken", data.token);
        redirectToHome();
      } else {
        displayErrorMessage("Invalid email or password.");
      }
    } catch (error) {
      console.error("Error during login:", error);
      displayErrorMessage("An error occurred. Please try again later.");
    }
  }

  async function submitSignupForm() {
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const address = document.getElementById("address").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!firstName || !lastName || !email || !address || !password) {
      displayErrorMessage("Please fill out all fields.");
      return;
    }

    try {
      const response = await fetch(`/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName, address, email, password }),
      });

      if (response.ok) {
        alert("Signup successful!");
        redirectToLogin();
      } else {
        displayErrorMessage("Registration failed. Please try again later.");
      }
    } catch (error) {
      console.error("Error during signup:", error);
      displayErrorMessage("An error occurred. Please try again later.");
    }
  }

  async function submitGasBookingForm() {
    const address = document.getElementById("address").value;

    if (!address) {
      displayErrorMessage("Please enter the delivery address.");
      return;
    }

    try {
      const response = await fetch(`/book-gas`, {
        method: "POST",
        ...getAuthRequestOptions(),
        body: JSON.stringify({ address }),
      });

      if (response.ok) {
        const res = await response.json();
        if (res.message) {
          alert("Booking Successful!");
          redirectToHome();
        } else {
          displayErrorMessage("Unknown response format");
        }
      } else {
        const errorRes = await response.json();
        displayErrorMessage(
          errorRes.error + " Redirecting to booking page in 5 seconds" ||
            "An error occurred. Redirecting to booking page in 5 seconds"
        );
        setTimeout(redirectToHome, 5000);
      }
    } catch (error) {
      console.error("Error during gas booking:", error);
      displayErrorMessage("An error occurred. Please try again later.");
    }
  }

  async function cancelRecentBooking() {
    try {
      const response = await fetch(
        `/cancel-recent-booking`,
        {
          method: "DELETE",
          ...getAuthRequestOptions(),
        }
      );

      if (response.ok) {
        const res = await response.json();
        if (res === "Booking canceled successfully!") {
          alert("Last booking canceled!");
          window.location.reload();
        } else {
          displayErrorMessage("Unknown response format");
        }
      } else {
        const errorRes = await response.json();
        displayErrorMessage(
          errorRes.error || "Error canceling recent booking."
        );
      }
    } catch (error) {
      console.error("Error during cancelRecentBooking:", error);
      displayErrorMessage("An error occurred. Please try again later.");
    }
  }

  async function editBookingAddress() {
    const updatedAddress = document.getElementById("address").value;

    if (!updatedAddress) {
      displayErrorMessage("Please enter the delivery address.");
      return;
    }

    try {
      const response = await fetch(`/update-address`, {
        method: "PUT",
        ...getAuthRequestOptions(),
        body: JSON.stringify({ updatedAddress }),
      });

      if (response.ok) {
        const res = await response.json();
        if (res === "Address Updated successfully!") {
          alert("Address Updated successfully");
          redirectToHome();
        } else {
          displayErrorMessage("Unknown response format");
        }
      } else {
        const errorRes = await response.json();
        displayErrorMessage(errorRes.error || "Error Updating Address");
      }
    } catch (error) {
      console.log("Error during editBookingAddress:", error);
      displayErrorMessage("An error occurred. Please try again later.");
    }
  }

  async function fetchAllBookings() {
    try {
      const response = await fetch(`/user-bookings`, {
        method: "GET",
        ...getAuthRequestOptions(),
      });

      if (response.ok) {
        const allBookings = await response.json();
        const allBookingsList = document.getElementById("allBookingsList");
        console.log(allBookings);

        if (allBookings.length <= 0) {
          console.log("Does Not have any Booking");
          document.getElementById("cancelBookingBtn").style.display = "none";
          document
            .getElementById("noBookingsMessage")
            .classList.remove("displayMessage");
          document.getElementById("noBookingsMessage").style.color = "red";
        } else {
          allBookings.sort(
            (a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)
          );
          allBookings.forEach((booking, index) => {
            document.getElementById("allBookingsList").style.color = "black";
            const listItem = document.createElement("li");
            listItem.style.padding = "1%";
            listItem.innerHTML = `
                                <p><strong>Booking ID:</strong> <span class="address">${
                                  index + 1
                                }</span></p>
                                <p><strong>Address:</strong> <span class="address">${
                                  booking.address
                                }</span></p>
                                <p><strong>Booking Date:</strong> <span class="booking-date">${new Date(
                                  booking.bookingDate
                                ).toLocaleString()}</span></p>
                                <hr>
                            `;
            allBookingsList.appendChild(listItem);
          });
        }
      } else {
        console.error(
          "Error fetching all bookings:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Error during fetchAllBookings:", error);
    }
  }

  function logout() {
    localStorage.removeItem("jwtToken");
    redirectToLogin();
  }
});
