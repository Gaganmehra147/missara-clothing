// Tab switching logic
function switchTab(tab) {
  // Update tabs
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  
  if (tabLogin) tabLogin.classList.remove('active');
  if (tabRegister) tabRegister.classList.remove('active');
  
  const targetTab = document.getElementById(`tab-${tab}`);
  if (targetTab) targetTab.classList.add('active');
  
  // Update forms
  document.getElementById('login-form').classList.remove('active');
  document.getElementById('register-form').classList.remove('active');
  if (document.getElementById('forgot-form')) document.getElementById('forgot-form').classList.remove('active');
  
  document.getElementById(`${tab}-form`).classList.add('active');
  
  // Clear errors and messages
  showError('');
  const msgDiv = document.getElementById('success-message');
  if (msgDiv) msgDiv.style.display = 'none';
}

function showError(msg) {
  const errDiv = document.getElementById('error-message');
  if (msg) {
    errDiv.textContent = msg;
    errDiv.style.display = 'block';
  } else {
    errDiv.style.display = 'none';
  }
}

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('missara_token');
  if (token) {
    // Already logged in, redirect to index or checkout
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect') || 'index.html';
    window.location.href = redirect;
  }
});

// Handle Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = e.target.querySelector('button');
  
  try {
    btn.textContent = 'Signing in...';
    btn.disabled = true;
    showError('');
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('missara_token', data.token);
      localStorage.setItem('missara_user', JSON.stringify(data.user));
      
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || 'index.html';
      window.location.href = redirect;
    } else {
      showError(data.message || 'Login failed');
      btn.textContent = 'Sign In';
      btn.disabled = false;
    }
  } catch (error) {
    showError('Network error. Please try again.');
    btn.textContent = 'Sign In';
    btn.disabled = false;
  }
});

// Handle Registration
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const password = document.getElementById('reg-password').value;
  const btn = e.target.querySelector('button');
  
  try {
    btn.textContent = 'Creating account...';
    btn.disabled = true;
    showError('');
    
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('missara_token', data.token);
      localStorage.setItem('missara_user', JSON.stringify(data.user));
      
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || 'index.html';
      window.location.href = redirect;
    } else {
      showError(data.message || 'Registration failed');
      btn.textContent = 'Create Account';
      btn.disabled = false;
    }
  } catch (error) {
    showError('Network error. Please try again.');
    btn.textContent = 'Create Account';
    btn.disabled = false;
  }
});

// Handle Forgot Password
const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('forgot-email').value;
    const btn = e.target.querySelector('button');
    
    try {
      btn.textContent = 'Sending...';
      btn.disabled = true;
      showError('');
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showError('');
        alert(data.message || 'Reset link sent if the email is registered.');
        switchTab('login');
      } else {
        showError(data.message || 'Failed to send reset link');
      }
    } catch (error) {
      showError('Network error. Please try again.');
    } finally {
      btn.textContent = 'Send Reset Link';
      btn.disabled = false;
      document.getElementById('forgot-email').value = '';
    }
  });
}
