// Firebase Authentication handling
// This file manages login, logout, and auth state changes

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if Firebase is loaded
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Make sure firebase-config.js is included after Firebase CDN.');
    return;
  }

  // Get auth instance
  const auth = firebase.auth();

  // Get UI elements
  const loginBtn = document.getElementById('auth-login-btn');
  const accountBtn = document.getElementById('auth-account-btn');
  const logoutBtn = document.getElementById('auth-logout-btn');
  const userEmailSpan = document.getElementById('auth-user-email');
  const loginModal = document.getElementById('login-modal');
  const closeModalBtn = document.getElementById('close-login-modal');
  const googleLoginBtn = document.getElementById('google-login-btn');
  const emailForm = document.getElementById('email-login-form');
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const signupEmailInput = document.getElementById('signup-email-input');
  const signupPasswordInput = document.getElementById('signup-password-input');
  const emailSubmitBtn = document.getElementById('email-submit-btn');
  const signupSubmitBtn = document.getElementById('signup-submit-btn');
  const signupLink = document.getElementById('signup-link');
  const loginLink = document.getElementById('login-link');
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('auth-error-message');

  // Google Sign-In provider
  const googleProvider = new firebase.auth.GoogleAuthProvider();

  // Show/hide login modal
  function showLoginModal() {
    if (loginModal) {
      loginModal.classList.add('is-visible');
      document.body.style.overflow = 'hidden';
    }
  }

  function hideLoginModal() {
    if (loginModal) {
      loginModal.classList.remove('is-visible');
      document.body.style.overflow = '';
      if (errorMessage) errorMessage.textContent = '';
      if (emailForm) emailForm.reset();
    }
  }

  // Update UI based on auth state
  function updateAuthUI(user) {
    if (user) {
      // User is logged in
      if (loginBtn) loginBtn.style.display = 'none';
      if (accountBtn) {
        accountBtn.style.display = 'flex';
        if (userEmailSpan) {
          userEmailSpan.textContent = user.email || 'Account';
        }
      }
      if (logoutBtn) logoutBtn.style.display = 'block';
      
      // Load user's purchases and mark owned cards
      loadUserPurchases(user);
    } else {
      // User is logged out
      if (loginBtn) loginBtn.style.display = 'block';
      if (accountBtn) accountBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'none';
      
      // Remove owned class from all cards
      document.querySelectorAll('.card.is-owned').forEach(card => {
        card.classList.remove('is-owned');
      });

      // Hide bundle download button
      if (typeof window.updateBundleDownloadButton === 'function') {
        window.updateBundleDownloadButton(null);
      }
    }
  }

  // Load user's license from Firestore and check subscription status
  async function loadUserPurchases(user) {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      console.error('Firestore not initialized');
      return;
    }
    
    const db = firebase.firestore();

    try {
      // Get user's license document (user_id as document ID)
      const userLicenseRef = db.collection('user_licenses').doc(user.uid);
      const userLicenseDoc = await userLicenseRef.get();

      if (!userLicenseDoc.exists) {
        // No license document found - user has no subscription
        document.querySelectorAll('.card[data-product-id]').forEach(card => {
          card.classList.remove('is-owned');
        });
        
        // Update buy buttons visibility (if stripe-checkout.js is loaded)
        if (typeof window.updateOwnedProducts === 'function') {
          window.updateOwnedProducts([]);
        }
        
        // Update subscription status in UI (if function exists)
        if (typeof window.updateSubscriptionStatus === 'function') {
          window.updateSubscriptionStatus(null);
        }
        return;
      }

      const licenseData = userLicenseDoc.data();
      const hasActiveSubscription = licenseData.subscription_status === 'active';

      if (hasActiveSubscription) {
        // User has active subscription - mark all cards as owned (access to all scripts)
        document.querySelectorAll('.card[data-product-id]').forEach(card => {
          card.classList.add('is-owned');
        });

        // Update buy buttons visibility (if stripe-checkout.js is loaded)
        // With subscription model, all products are accessible, so no "Buy" buttons needed
        if (typeof window.updateOwnedProducts === 'function') {
          // Get all product IDs from cards
          const allProductIds = Array.from(document.querySelectorAll('.card[data-product-id]'))
            .map(card => card.getAttribute('data-product-id'));
          window.updateOwnedProducts(allProductIds);
        }
      } else {
        // Subscription inactive or canceled - no access
        document.querySelectorAll('.card[data-product-id]').forEach(card => {
          card.classList.remove('is-owned');
        });
        
        if (typeof window.updateOwnedProducts === 'function') {
          window.updateOwnedProducts([]);
        }
      }

      // Update subscription status in UI (if function exists)
      if (typeof window.updateSubscriptionStatus === 'function') {
        window.updateSubscriptionStatus({
          status: licenseData.subscription_status,
          current_period_end: licenseData.current_period_end,
          cancel_at_period_end: licenseData.cancel_at_period_end
        });
      }

      // Update bundle download button visibility (if function exists)
      if (typeof window.updateBundleDownloadButton === 'function') {
        window.updateBundleDownloadButton(user);
      }
    } catch (error) {
      console.error('Error loading user license:', error);
    }
  }

  // Google Sign-In
  async function signInWithGoogle() {
    try {
      await auth.signInWithPopup(googleProvider);
      hideLoginModal();
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (errorMessage) {
        errorMessage.textContent = error.message || 'Failed to sign in with Google';
      }
    }
  }

  // Email/Password Sign-In
  async function signInWithEmail(email, password) {
    try {
      await auth.signInWithEmailAndPassword(email, password);
      hideLoginModal();
    } catch (error) {
      console.error('Email sign-in error:', error);
      if (errorMessage) {
        errorMessage.textContent = error.message || 'Failed to sign in';
        errorMessage.classList.remove('is-success');
      }
    }
  }

  // Email/Password Sign-Up
  async function signUpWithEmail(email, password) {
    try {
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      // Send email verification
      await userCredential.user.sendEmailVerification();
      if (errorMessage) {
        errorMessage.textContent = 'Account created! Please check your email to verify your account.';
        errorMessage.classList.add('is-success');
      }
    } catch (error) {
      console.error('Email sign-up error:', error);
      if (errorMessage) {
        if (error.code === 'auth/email-already-in-use') {
          errorMessage.textContent = 'This email is already registered. Please sign in instead.';
        } else if (error.code === 'auth/weak-password') {
          errorMessage.textContent = 'Password is too weak. Please use at least 6 characters.';
        } else {
          errorMessage.textContent = error.message || 'Failed to create account';
        }
        errorMessage.classList.remove('is-success');
      }
    }
  }

  // Sign Out
  async function signOut() {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  }

  // Toggle between login and signup forms
  function showSignupForm() {
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
    if (loginLink) loginLink.style.display = 'inline';
    if (signupLink) signupLink.style.display = 'none';
    if (errorMessage) {
      errorMessage.textContent = '';
      errorMessage.classList.remove('is-success');
    }
  }

  function showLoginForm() {
    if (signupForm) signupForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (signupLink) signupLink.style.display = 'inline';
    if (loginLink) loginLink.style.display = 'none';
    if (errorMessage) {
      errorMessage.textContent = '';
      errorMessage.classList.remove('is-success');
    }
  }

  // Event listeners
  if (loginBtn) {
    loginBtn.addEventListener('click', showLoginModal);
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideLoginModal);
  }

  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        hideLoginModal();
      }
    });
  }

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', signInWithGoogle);
  }

  // Login form submit
  if (loginForm && emailInput && passwordInput) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      
      if (!email || !password) {
        if (errorMessage) {
          errorMessage.textContent = 'Please fill in all fields';
          errorMessage.classList.remove('is-success');
        }
        return;
      }

      signInWithEmail(email, password);
    });
  }

  // Signup form submit
  if (signupForm && signupEmailInput && signupPasswordInput) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = signupEmailInput.value.trim();
      const password = signupPasswordInput.value;
      
      if (!email || !password) {
        if (errorMessage) {
          errorMessage.textContent = 'Please fill in all fields';
          errorMessage.classList.remove('is-success');
        }
        return;
      }

      if (password.length < 6) {
        if (errorMessage) {
          errorMessage.textContent = 'Password must be at least 6 characters';
          errorMessage.classList.remove('is-success');
        }
        return;
      }

      signUpWithEmail(email, password);
    });
  }

  if (signupLink) {
    signupLink.addEventListener('click', (e) => {
      e.preventDefault();
      showSignupForm();
    });
  }

  if (loginLink) {
    loginLink.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginForm();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', signOut);
  }

  // Listen to auth state changes
  auth.onAuthStateChanged((user) => {
    updateAuthUI(user);
  });
});
