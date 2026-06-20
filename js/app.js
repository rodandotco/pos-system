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

// ===================== BACK BUTTON - WORKING APPROACH =====================
(function() {
  let backCount = 0;
  let backTimer = null;
  let allowExit = false;

  // Listen for beforeunload - this fires before the page unloads
  window.addEventListener('beforeunload', function(e) {
    if (!allowExit) {
      // Block exit
      e.preventDefault();
      e.returnValue = '';
      
      // Increment counter
      backCount++;
      
      // Clear old timer
      clearTimeout(backTimer);
      
      // Remove old toast
      const oldToast = document.getElementById('backToast');
      if (oldToast) oldToast.remove();
      
      if (backCount >= 4) {
        // Allow exit on 4th press
        allowExit = true;
        backCount = 0;
        
        // Remove any toast
        const toast = document.getElementById('backToast');
        if (toast) toast.remove();
        
        // Exit
        setTimeout(function() {
          window.close();
        }, 100);
        
        return;
      }
      
      // Show warning
      showToast(backCount);
      
      // Reset counter after 3 seconds
      backTimer = setTimeout(function() {
        backCount = 0;
        const toast = document.getElementById('backToast');
        if (toast) toast.remove();
      }, 3000);
      
      return '';
    }
  });

  function showToast(count) {
    // Remove existing toast
    const oldToast = document.getElementById('backToast');
    if (oldToast) oldToast.remove();
    
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
      message = '⚠️ Tombol BACK tidak disarankan!<br>Silakan tekan <b>LOGOUT</b> di pojok kanan atas';
      bgColor = '#fff3e0';
      borderColor = '#ff9800';
      icon = '⚠️';
    } else if (count === 3) {
      message = '⛔ Tekan BACK sekali lagi akan keluar paksa!<br>Gunakan <b>LOGOUT</b> untuk keluar dengan benar';
      bgColor = '#fce4ec';
      borderColor = '#f44336';
      icon = '⛔';
    }

    const toast = document.createElement('div');
    toast.id = 'backToast';
    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <span style="font-size: 22px;">${icon}</span>
        <div style="flex: 1; font-size: 13px; line-height: 1.5;">${message}</div>
      </div>
    `;
    toast.style.cssText = `
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
      max-width: 400px;
      margin: 0 auto;
      animation: slideUp 0.3s ease;
    `;

    document.body.appendChild(toast);
    
    // Auto remove after 2.5 seconds
    setTimeout(function() {
      const t = document.getElementById('backToast');
      if (t) {
        t.style.animation = 'slideDown 0.3s ease';
        setTimeout(function() {
          const t2 = document.getElementById('backToast');
          if (t2) t2.remove();
        }, 300);
      }
    }, 2500);
  }

  // Reset when app goes to background
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      backCount = 0;
      clearTimeout(backTimer);
      allowExit = false;
      const toast = document.getElementById('backToast');
      if (toast) toast.remove();
    }
  });
  
  // Reset allowExit when app comes back
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      allowExit = false;
    }
  });
})();