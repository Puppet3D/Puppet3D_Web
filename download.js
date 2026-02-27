// Download handler for bundle .rbz file with token injection
// This file manages downloading the unified bundle (all plugins) from n8n

// Wait for DOM and Firebase to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Check if Firebase Auth is available
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.error('Firebase Auth not loaded.');
    return;
  }

  const auth = firebase.auth();

  // Download bundle .rbz file with token
  async function downloadBundle(event) {
    const user = auth.currentUser;
    
    if (!user) {
      // User not logged in - show login modal
      const loginBtn = document.getElementById('auth-login-btn');
      if (loginBtn) {
        loginBtn.click();
      }
      return;
    }

    const downloadBtn = event?.target;
    
    if (!N8N_DOWNLOAD_WEBHOOK_URL) {
      console.error('Download webhook URL not configured');
      alert('Error: Download service not configured. Please contact support.');
      return;
    }

    try {
      // Show loading state
      if (downloadBtn) {
        downloadBtn.disabled = true;
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = 'Downloading...';
        
        // Call n8n webhook to generate personalized bundle
        const response = await fetch(N8N_DOWNLOAD_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.uid
            // No plugin_name needed - n8n will download bundle from Puppet3D_Bundle
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Failed to download file' }));
          throw new Error(errorData.message || 'Failed to download file');
        }

        // Prefer server-provided filename so frontend always matches latest bundle version.
        const contentDisposition = response.headers.get('content-disposition') || '';
        const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";\r\n]+)/i);
        const resolvedFilename = filenameMatch && filenameMatch[1]
          ? decodeURIComponent(filenameMatch[1].replace(/"/g, '').trim())
          : 'Puppet3D_Bundle_latest.rbz';

        // Get the .rbz file as blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resolvedFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Reset button state
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalText;
      }
    } catch (error) {
      console.error('Error downloading bundle:', error);
      alert('Error: ' + (error.message || 'Failed to download. Please try again.'));
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download Bundle';
      }
    }
  }

  // Handle bundle download button click
  document.addEventListener('click', (event) => {
    const bundleDownloadBtn = event.target.closest('.bundle-download-btn');
    if (!bundleDownloadBtn) return;

    event.preventDefault();
    downloadBundle(event);
  });

  // Update bundle download button visibility based on auth state and subscription
  auth.onAuthStateChanged((user) => {
    updateBundleDownloadButton(user);
  });

  // Function to update bundle download button visibility
  function updateBundleDownloadButton(user) {
    const bundleDownloadBtn = document.getElementById('bundle-download-btn');
    if (!bundleDownloadBtn) return;

    // Check if user has active subscription by checking if any card has 'is-owned' class
    // This class is set by auth.js when subscription_status === 'active'
    const hasActiveSubscription = user && 
      document.querySelectorAll('.card.is-owned').length > 0;

    if (hasActiveSubscription) {
      bundleDownloadBtn.style.display = 'block';
    } else {
      bundleDownloadBtn.style.display = 'none';
    }
  }

  // Expose function to update bundle download button from auth.js
  window.updateBundleDownloadButton = updateBundleDownloadButton;

  // Initial update
  updateBundleDownloadButton(auth.currentUser);
});
