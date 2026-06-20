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

  // Push 4 states onto history so we have room to intercept
  for (let i = 0; i < 4; i++) {
    history.pushState({ pos: i }, '', location.href);
  }

  // Go back to the first state so we're at position 0
  history.go(-4);

  // Now push states again to build up
  history.pushState({ pos: 0 }, '', location.href);
  history.pushState({ pos: 1 }, '', location.href);
  history.pushState({ pos: 2 }, '', location.href);
  history.pushState({ pos: 3 }, '', location.href);

  window.addEventListener('popstate', function(event) {
    // Prevent actual navigation
    history.pushState({ pos: 3 }, '', location.href);
    
    // Increment back press count
    backCount++;
    
    // Clear existing timer and toast
    clearTimeout(backTimer);
    if (toastElement) {
      toastElement.remove();
      toastElement = null;
    }
    
    // Check if should exit
    if (backCount >= 4) {
      // Reset
      backCount = 0;
      if (toastElement) {
        toastElement.remove();
        toastElement = null;
      }
      // Try to close the app
      if (navigator.app && navigator.app.exitApp) {
        navigator.app.exitApp();
      } else if (navigator.device && navigator.device.exitApp) {
        navigator.device.exitApp();
      } else {
        window.close();
      }
      // Fallback: go back in history
      history.go(-5);
      return;
    }
    
    // Show warning message
    showBackToast(backCount);
    
    // Reset counter after 3 seconds of no back presses
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
  }

  // Reset counter when app goes to background
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