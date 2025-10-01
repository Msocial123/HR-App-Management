// // const employees = {
// //   "emp001": {
// //     name: "Rishabh Mishra",
// //     password: "rish123",
// //     leaveBalance: { CL: 10, SL: 8, PL: 12 },
// //     leaveHistory: [
// //       { from: "2025-01-10", to: "2025-01-12", reason: "Vacation", status: "Approved" },
// //       { from: "2025-02-05", to: "2025-02-06", reason: "Sick", status: "Rejected" }
// //     ],
// //     attendance: [],
// //     onboardingInfo: "Completed initial paperwork and training.",
// //     hiringFeedback: []
// //   },
// //   "emp002": {
// //     name: "Shikhar Sharma",
// //     password: "pass123",
// //     leaveBalance: { CL: 5, SL: 10, PL: 15 },
// //     leaveHistory: [],
// //     attendance: [],
// //     onboardingInfo: "Pending documentation submission.",
// //     hiringFeedback: []
// //   },
// //   "emp003": {
// //     name: "Mr Murli",
// //     password: "murli123",
// //     leaveBalance: { CL: 10, SL: 8, PL: 12 },
// //     leaveHistory: [
// //       { from: "2025-01-10", to: "2025-01-12", reason: "Vacation", status: "Approved" },
// //       { from: "2025-02-05", to: "2025-02-06", reason: "Sick", status: "Rejected" }
// //     ],
// //     attendance: [],
// //     onboardingInfo: "As a Supportive Trainer .",
// //     hiringFeedback: []
// //   }
// // };

let currentUserId = null;

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname.split("/").pop();

  if (path === "login.html") {
    setupLoginPage();
  } else if (path === "signup.html") {
    setupSignupPage();
  } else if (path === "dashboard.html") {
    if (!checkAuth()) return;
    setupDashboard();
  } else if (path === "attendance.html") {
    if (!checkAuth()) return;
    setupAttendance();
  } else if (path === "apply_leave.html") {
    if (!checkAuth()) return;
    setupApplyLeave();
  } else if (path === "leave_balance.html") {
    if (!checkAuth()) return;
    setupLeaveBalance();
  } else if (path === "onboarding.html") {
    if (!checkAuth()) return;
    setupOnboarding();
  } else if (path === "hiring_process.html") {
    if (!checkAuth()) return;
    setupHiringProcess();
  }
});

// Signup Page Handler (calls backend API)
function setupSignupPage() {
  const form = document.getElementById("signupForm");
  const err = document.getElementById("signupError");

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const fullName = form.fullName.value.trim();
    const empId = form.empId.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (!fullName || !empId || !email || !password || !confirmPassword) {
      err.textContent = "All fields are required.";
      return;
    }

    if (password !== confirmPassword) {
      err.textContent = "Passwords do not match.";
      return;
    }

    // Basic email validation
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      err.textContent = "Please enter a valid email address.";
      return;
    }

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, empId, email, password })
      });
      const data = await res.json();
      if (res.ok) {
        err.style.color = "green";
        err.textContent = "Signup successful! Redirecting to login...";
        setTimeout(() => window.location.href = "login.html", 1500);
      } else {
        err.textContent = data.message || "Signup failed.";
      }
    } catch {
      err.textContent = "Server error. Please try again.";
    }
  });
}

// Login Page Handler (calls backend API)
function setupLoginPage() {
  const form = document.getElementById("loginForm");
  const err = document.getElementById("loginError");

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const empId = form.empId.value.trim();
    const password = form.password.value;

    if (!empId || !password) {
      err.textContent = "Please enter Employee ID and password.";
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empId, password })
      });
      const data = await res.json();
      if (res.ok) {
        sessionStorage.setItem("empId", empId);
        window.location.href = "dashboard.html";
      } else {
        err.textContent = data.message || "Login failed.";
      }
    } catch {
      err.textContent = "Server error. Please try again.";
    }
  });
}

// Check authentication for protected pages
function checkAuth() {
  const id = sessionStorage.getItem("empId");
  if (!id) {
    window.location.href = "login.html";
    return false;
  }
  currentUserId = id;
  return true;
}

// Dashboard (you may want to fetch user info from backend)
function setupDashboard() {
  const nameSpan = document.getElementById("empName");
  nameSpan.textContent = currentUserId;
  document.getElementById("logoutBtn").onclick = logout;
  setupChatbot();
}

// Setup Chatbot functionality
function setupChatbot() {
  const chatbotMessages = document.getElementById('chatbotMessages');
  const chatbotInput = document.getElementById('chatbotInput');
  const chatbotSendBtn = document.getElementById('chatbotSendBtn');
  
  if (!chatbotMessages || !chatbotInput || !chatbotSendBtn) return;
  
  // Add welcome message
  addChatMessage('bot', 'Hello! I\'m your HR Assistant. I can help you with leave policies, attendance, holidays, grievances, and more. What would you like to know?');
  
  // Send message function
  async function sendMessage() {
    const query = chatbotInput.value.trim();
    if (!query) return;
    
    // Add user message
    addChatMessage('user', query);
    chatbotInput.value = '';
    
    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query, 
          empId: sessionStorage.getItem('empId') 
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        addChatMessage('bot', data.response);
      } else {
        addChatMessage('bot', 'Sorry, I encountered an error. Please try again.');
      }
    } catch (error) {
      addChatMessage('bot', 'Sorry, I\'m having trouble connecting. Please try again later.');
    }
    
    // Scroll to bottom
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }
  
  // Add message to chat
  function addChatMessage(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.textContent = message;
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }
  
  // Event listeners
  chatbotSendBtn.addEventListener('click', sendMessage);
  chatbotInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

// Attendance functionality using backend API
function setupAttendance() {
  document.getElementById("logoutBtn").onclick = logout;
  const checkInBtn = document.getElementById("checkInBtn");
  const checkOutBtn = document.getElementById("checkOutBtn");
  const status = document.getElementById("attendanceStatus");
  const empId = sessionStorage.getItem("empId");

  // Fetch today's attendance status on load
  fetch('/api/attendance/today', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.checkedIn && !data.checkedOut) {
        checkInBtn.disabled = true;
        checkOutBtn.disabled = false;
        status.textContent = 'Checked in at ' + data.checkInTime;
      } else if (data.checkedIn && data.checkedOut) {
        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;
        status.textContent = 'Checked out at ' + data.checkOutTime;
      } else {
        checkInBtn.disabled = false;
        checkOutBtn.disabled = true;
        status.textContent = '';
      }
    });

  checkInBtn.addEventListener("click", () => {
    fetch('/api/attendance/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.time) {
          checkInBtn.disabled = true;
          checkOutBtn.disabled = false;
          status.textContent = 'Checked in at ' + data.time;
        } else {
          status.textContent = data.message || 'Check-in failed.';
        }
      });
  });

  checkOutBtn.addEventListener("click", () => {
    fetch('/api/attendance/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.time) {
          checkInBtn.disabled = false;
          checkOutBtn.disabled = true;
          status.textContent = 'Checked out at ' + data.time;
        } else {
          status.textContent = data.message || 'Check-out failed.';
        }
      });
  });
}

// ...existing code...

function setupDashboard() {
  const nameSpan = document.getElementById("empName");
  nameSpan.textContent = currentUserId;
  document.getElementById("logoutBtn").onclick = logout;
  setupChatbot();
  setupGrievance(); // Add this line
}

function setupGrievance() {
  const form = document.getElementById("grievanceForm");
  if (!form) return;
  const status = document.getElementById("grievanceStatus");

  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    const grievanceText = document.getElementById("grievanceText").value.trim();
    status.textContent = "";
    status.style.color = "";

    if (!grievanceText) {
      status.textContent = "Please enter your grievance before submitting.";
      return;
    }

    const empId = sessionStorage.getItem("empId");

    try {
      const res = await fetch("/api/grievance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empId, grievanceText })
      });
      const data = await res.json();
      if (res.ok) {
        status.textContent = "Grievance submitted. Thank you!";
        status.style.color = "green";
        form.reset();
      } else {
        status.textContent = data.message || "Failed to submit grievance.";
      }
    } catch {
      status.textContent = "Server error. Please try again.";
    }
  });
}

// ...existing code...

// The rest of your setup functions (setupApplyLeave, setupLeaveBalance, etc.)
// should also be updated to use backend APIs for real data.
// For now, you can keep the logout function as is:

function logout() {
  sessionStorage.removeItem("empId");
  window.location.href = "login.html";
}

// ...keep your other functions (setupApplyLeave, setupLeaveBalance, etc.) as needed...