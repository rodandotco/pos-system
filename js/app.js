// ===================== APP.JS =====================
let activeTab = 'transaksi';

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('data:application/javascript;base64,self.addEventListener("fetch", e => { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))) })').catch(() => {});
  });
}

// Navigation
document.querySelectorAll('.tab-btn').forEach(b => {
  b.addEventListener('click', () => {
    if (!currentUser) return;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
    document.getElementById('page-' + b.dataset.page).classList.add('active');
    b.classList.add('active');
    activeTab = b.dataset.page;
    if (activeTab === 'laporan') { setDefaultDateFilter(); muatLaporan(); }
    if (activeTab === 'setting') { muatProfilToko(); tampilkanUserList(); aturHakAkses(); }
    if (activeTab === 'inventory') refreshProductList();
    if (activeTab === 'transaksi') document.getElementById('scanInputTrans').focus();
  });
});

// Check session on load
function initApp() {
  checkSession();
}
initApp();

// ===================== BACK BUTTON - HASH APPROACH =====================
(function() {
  let backCount = 0;
  let backTimer = null;
  let toastElement = null;
  let isHandling = false;

  // Use hash to track state
  if (!location.hash) {
    location.hash = '#app';
  }

  // Listen for hash changes (back button changes hash)
  window.addEventListener('hashchange', function() {
    if (isHandling) return;
    isHandling = true;
    
    // If hash was removed (back button)
    if (!location.hash || location.hash === '') {
      // Put it back
      location.hash = '#app';
      
      // Increment counter
      backCount++;
      
      // Clear old timer and toast
      clearTimeout(backTimer);
      if (toastElement) {
        toastElement.remove();
        toastElement = null;
      }
      
      // Check exit condition
      if (backCount >= 4) {
        backCount = 0;
        clearTimeout(backTimer);
        if (toastElement) {
          toastElement.remove();
          toastElement = null;
        }
        // Remove hash and go back
        location.hash = '';
        history.go(-2);
        return;
      }
      
      // Show warning
      showBackToast(backCount);
      
      // Reset after 3 seconds
      backTimer = setTimeout(function() {
        backCount = 0;
        if (toastElement) {
          toastElement.remove();
          toastElement = null;
        }
      }, 3000);
    }
    
    setTimeout(function() {
      isHandling = false;
    }, 100);
  });

  function showBackToast(count) {
    let message = '';
    let bgColor = '';
    let borderColor = '';

    if (count === 1) {
      message = 'ℹ️ Harap gunakan tombol LOGOUT untuk keluar';
      bgColor = '#e3f2fd';
      borderColor = '#2196f3';
    } else if (count === 2) {
      message = '⚠️ Tombol BACK tidak disarankan! Gunakan LOGOUT';
      bgColor = '#fff3e0';
      borderColor = '#ff9800';
    } else if (count === 3) {
      message = '⛔ Satu kali lagi aplikasi akan keluar!';
      bgColor = '#fce4ec';
      borderColor = '#f44336';
    }

    toastElement = document.createElement('div');
    toastElement.textContent = message;
    toastElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 16px;
      right: 16px;
      background: ${bgColor};
      color: #333;
      padding: 14px 18px;
      border-radius: 12px;
      z-index: 9999;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      border-left: 4px solid ${borderColor};
      font-size: 14px;
      font-weight: 500;
      max-width: 400px;
      margin: 0 auto;
      animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toastElement);
    
    setTimeout(function() {
      if (toastElement && toastElement.parentNode) {
        toastElement.remove();
        toastElement = null;
      }
    }, 2500);
  }

  // Reset on visibility change
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      backCount = 0;
      clearTimeout(backTimer);
      if (toastElement) {
        toastElement.remove();
        toastElement = null;
      }
    }
  });
})();