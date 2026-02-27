// Stripe Checkout handling
// This file manages creating Stripe Checkout sessions

// Wait for DOM and Stripe to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if Stripe is loaded
  if (typeof Stripe === 'undefined') {
    console.error('Stripe SDK not loaded. Make sure stripe-config.js is included after Stripe CDN.');
    return;
  }

  // Check if Firebase Auth is available
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.error('Firebase Auth not loaded.');
    return;
  }

  // Initialize Stripe
  const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
  const auth = firebase.auth();

  // Create Checkout Session
  async function createCheckoutSession(productId, event) {
    const user = auth.currentUser;
    
    if (!user) {
      // User not logged in - show login modal
      const loginBtn = document.getElementById('auth-login-btn');
      if (loginBtn) {
        loginBtn.click();
      }
      return;
    }

    const buyBtn = event?.target;
    
    try {
      // Show loading state
      if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.textContent = 'Redirecting...';
      }

      // Create Checkout Session via your backend/API
      // IMPORTANT: You need a backend endpoint to create the session securely
      // The backend should use your Stripe Secret Key (never expose it in frontend)
      // 
      // Example backend endpoint: POST /api/create-checkout-session
      // It should create a Stripe Checkout Session with:
      // - line_items: [{ price: priceId, quantity: 1 }]
      // - mode: 'payment'
      // - success_url: 'http://127.0.0.1:5500/?success=true'
      // - cancel_url: 'http://127.0.0.1:5500/?canceled=true'
      // - metadata: { user_id: user.uid, product_id: productId }
      
      if (!STRIPE_SUBSCRIPTION_PRICE_ID) {
        throw new Error('Subscription price is not configured');
      }

      const response = await fetch(STRIPE_CHECKOUT_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: STRIPE_SUBSCRIPTION_PRICE_ID,
          productId: productId,
          userId: user.uid,
          userEmail: user.email,
          mode: 'subscription',
          billingModel: 'monthly_all_access',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create checkout session' }));
        throw new Error(errorData.message || 'Failed to create checkout session');
      }

      const responseData = await response.json();

      // Accept multiple n8n/Stripe response shapes:
      // - { sessionId: "cs_..." }
      // - { id: "cs_..." }
      // - { url: "https://checkout.stripe.com/..." }
      // - nested { json/body/data/... }
      const stack = [responseData];
      let sessionId = null;
      let checkoutUrl = null;

      while (stack.length) {
        const current = stack.pop();
        if (!current) continue;

        if (typeof current === 'string') {
          if (!sessionId && current.startsWith('cs_')) {
            sessionId = current;
          } else if (!checkoutUrl && current.includes('checkout.stripe.com')) {
            checkoutUrl = current;
          }
          continue;
        }

        if (Array.isArray(current)) {
          for (const item of current) stack.push(item);
          continue;
        }

        if (typeof current === 'object') {
          if (!sessionId && typeof current.sessionId === 'string') sessionId = current.sessionId;
          if (!sessionId && typeof current.id === 'string' && current.id.startsWith('cs_')) sessionId = current.id;
          if (!checkoutUrl && typeof current.url === 'string' && current.url.includes('checkout.stripe.com')) {
            checkoutUrl = current.url;
          }
          for (const value of Object.values(current)) stack.push(value);
        }
      }

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      if (!sessionId) {
        console.error('Invalid checkout session response:', responseData);
        throw new Error('No session ID returned from server');
      }

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({ sessionId });

      if (result.error) {
        console.error('Stripe Checkout error:', result.error);
        alert('Error: ' + result.error.message);
        if (buyBtn) {
          buyBtn.disabled = false;
          buyBtn.textContent = 'Subscribe';
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Error: ' + (error.message || 'Failed to create checkout. Please try again.'));
      if (buyBtn) {
        buyBtn.disabled = false;
        buyBtn.textContent = 'Subscribe';
      }
    }
  }

  // Handle buy button clicks
  document.addEventListener('click', (event) => {
    const buyBtn = event.target.closest('.buy-btn');
    if (!buyBtn) return;

    const card = buyBtn.closest('.card');
    if (!card) return;

    const productId = card.getAttribute('data-product-id');
    if (!productId) {
      console.error('Card missing data-product-id');
      return;
    }

    event.preventDefault();
    event.stopPropagation(); // Prevent card click
    createCheckoutSession(productId, event);
  });

  // Update buy buttons visibility based on auth state and owned products
  auth.onAuthStateChanged((user) => {
    updateBuyButtons(user);
  });

  // Track owned products
  let ownedProductIds = new Set();

  // Function to update owned products list
  window.updateOwnedProducts = (productIds) => {
    ownedProductIds = new Set(productIds);
    updateBuyButtons(auth.currentUser);
  };

  // Update buy buttons visibility
  function updateBuyButtons(user) {
    document.querySelectorAll('.card[data-product-id]').forEach((card) => {
      const productId = card.getAttribute('data-product-id');
      const buyBtn = card.querySelector('.buy-btn');
      
      if (!buyBtn) return;

      buyBtn.textContent = 'Subscribe';

      // Hide buy button if:
      // 1. User is not logged in
      // 2. User already owns this product
      if (!user || ownedProductIds.has(productId)) {
        buyBtn.style.display = 'none';
      } else {
        buyBtn.style.display = 'block';
      }
    });
  }
});
