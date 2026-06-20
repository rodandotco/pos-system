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

// ===================== BACK BUTTON - INTERCEPT CLICKS =====================
(function() {
  let backCount = 0;
  let backTimer = null;
  let toastElement = null;
  let blockExit = true;

  // Method 1: Intercept popstate
  history.pushState({page: 'pos'}, '', location.href);
  
  window.addEventListener('popstate', function(e) {
    if (blockExit) {
      // Push state again to block navigation
      history.pushState({page: 'pos'}, '', location.href);
      
      handleBackPress();
    }
  });

  // Method 2: Also handle pagehide (some Android browsers)
  window.addEventListener('pagehide', function(e) {
    if (blockExit) {
      handleBackPress();
    }
  });

  function handleBackPress() {
    backCount++;
    
    clearTimeout(backTimer);
    
    // Remove old toast
    if (toastElement) {
      toastElement.remove();
      toastElement = null;
    }
    
    if (backCount >= 4) {
      // Allow exit
      blockExit = false;
      backCount = 0;
      clearTimeout(backTimer);
      if (toastElement) {
        toastElement.remove();
        toastElement = null;
      }
      
      // Remove the blocking states and go back
      history.back();
      return;
    }
    
    // Show colored toast based on count
    showToast(backCount);
    
    // Reset after 3 seconds
    backTimer = setTimeout(function() {
      backCount = 0;
      if (toastElement) {
        toastElement.remove();
        toastElement = null;
      }
    }, 3000);
  }

  function showToast(count) {
    let message = '';
    let bgColor = '';
    let borderColor = '';
    let icon = '';

    if (count === 1) {
      message = 'Harap gunakan tombol <b>LOGOUT</b> untuk keluar dari aplikasi';
      bgColor = '#e3f2fd';
      borderColor = '#2196f3';
      icon = 'ℹ️';
    } else if (count === 2) {
      message = '⚠️ Tombol BACK tidak disarankan! Silakan tekan <b>LOGOUT</b> di pojok kanan atas';
      bgColor = '#fff3e0';
      borderColor = '#ff9800';
      icon = '⚠️';
    } else if (count === 3) {
      message = '⛔ Tekan BACK sekali lagi akan keluar paksa! Gunakan <b>LOGOUT</b> untuk keluar dengan benar';
      bgColor = '#fce4ec';
      borderColor = '#f44336';
      icon = '⛔';
    }

    toastElement = document.createElement('div');
    toastElement.id = 'backToast';
    toastElement.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 22px;">${icon}</span>
        <div style="flex: 1; font-size: 13px; line-height: 1.5;">${message}</div>
      </div>
    `;
    toastElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 16px;
      right: 16px;
      background: ${bgColor};
      color: #263238;
      padding: 14px 18px;
      border-radius: 12px;
      z-index: 9999;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      border-left: 4px solid ${borderColor};
      max-width: 400px;
      margin: 0 auto;
      font-family: 'Segoe UI', system-ui, sans-serif;
      animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toastElement);
    
    // Auto dismiss after 2.5 seconds
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

  // Reset on visibility change
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      backCount = 0;
      clearTimeout(backTimer);
      blockExit = true;
      if (toastElement) {
        toastElement.remove();
        toastElement = null;
      }
    }
  });
})();