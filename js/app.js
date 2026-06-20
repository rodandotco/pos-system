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

// ===================== BACK BUTTON HANDLER =====================
(function() {
  let backCount = 0;
  let backTimer = null;
  let toastElement = null;

  // Add initial history entry
  if (window.history && window.history.pushState) {
    history.pushState({ page: 'app' }, document.title, location.href);
  }

  // Listen for back button
  window.addEventListener('popstate', function(event) {
    // Push state again to prevent navigation
    history.pushState({ page: 'app' }, document.title, location.href);
    
    // Increment counter
    backCount++;
    
    // Clear old timer and toast
    clearTimeout(backTimer);
    if (toastElement) {
      toastElement.remove();
      toastElement = null;
    }
    
    // Check if should exit (after 4 presses)
    if (backCount >= 4) {
      // Clean up
      backCount = 0;
      clearTimeout(backTimer);
      if (toastElement) {
        toastElement.remove();
        toastElement = null;
      }
      // Go back for real
      history.back();
      return;
    }
    
    // Show warning
    showBackToast(backCount);
    
    // Reset after 3 seconds of no activity
    backTimer = setTimeout(function() {
      backCount = 0;
      if (toastElement) {
        toastElement.remove();
        toastElement = null;
      }
    }, 3000);
  });

  function showBackToast(count) {
    let message = '';
    let bgColor = '';
    let borderColor = '';

    if (count === 1) {
      message = 'ℹ️ Harap gunakan tombol <b>LOGOUT</b> untuk keluar dari aplikasi';
      bgColor = '#e3f2fd';
      borderColor = '#2196f3';
    } else if (count === 2) {
      message = '⚠️ Tombol BACK tidak disarankan! Silakan tekan <b>LOGOUT</b> di pojok kanan atas';
      bgColor = '#fff3e0';
      borderColor = '#ff9800';
    } else if (count === 3) {
      message = '⛔ Aplikasi akan keluar paksa! Gunakan <b>LOGOUT</b> untuk keluar dengan benar';
      bgColor = '#fce4ec';
      borderColor = '#f44336';
    }

    toastElement = document.createElement('div');
    toastElement.innerHTML = message;
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
      font-size: 13px;
      line-height: 1.5;
      max-width: 400px;
      margin: 0 auto;
      animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toastElement);
    
    // Auto-remove toast after 2.5 seconds
    setTimeout(function() {
      if (toastElement && toastElement.parentNode) {
        toastElement.style.animation = 'slideDown 0.3s ease';
        setTimeout(function() {
          if (toastElement && toastElement.parentNode) {
            toastElement.remove();
            toastElement = null;
          }
        }, 300);
      }
    }, 2500);
  }

  // Reset when app goes to background
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