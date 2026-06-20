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

// ===================== PREVENT ACCIDENTAL BACK EXIT =====================
let backPressCount = 0;
let backPressTimer = null;
let warningToast = null;

// Override the back button behavior
window.addEventListener('beforeunload', function(e) {
  // This won't prevent exit but can show a message
});

// Main back button handler
window.addEventListener('popstate', function(event) {
  // Prevent the actual back navigation
  event.preventDefault();
  event.stopPropagation();
  
  // Push a new state immediately
  history.pushState(null, document.title, location.href);
  
  // Handle the back press
  handleBackPress();
  
  return false;
});

// Push initial state
if (window.history && history.pushState) {
  history.pushState(null, document.title, location.href);
}

function handleBackPress() {
  // Increment counter
  backPressCount++;
  
  console.log('Back pressed:', backPressCount);
  
  // Clear previous timer
  if (backPressTimer) {
    clearTimeout(backPressTimer);
    backPressTimer = null;
  }
  
  // Remove previous toast
  if (warningToast) {
    warningToast.remove();
    warningToast = null;
  }
  
  if (backPressCount === 1) {
    showToast('ℹ️ Harap gunakan tombol LOGOUT untuk keluar dari aplikasi', '#e3f2fd', '#2196f3');
  } else if (backPressCount === 2) {
    showToast('⚠️ Tombol BACK tidak disarankan! Silakan tekan LOGOUT di pojok kanan atas', '#fff3e0', '#ff9800');
  } else if (backPressCount === 3) {
    showToast('⛔ Aplikasi akan keluar paksa! Gunakan LOGOUT untuk keluar dengan benar', '#fce4ec', '#f44336');
  } else if (backPressCount >= 4) {
    // Exit the app
    resetBackPress();
    // Try multiple methods to close
    if (navigator.app && navigator.app.exitApp) {
      navigator.app.exitApp();
    } else if (navigator.device && navigator.device.exitApp) {
      navigator.device.exitApp();
    } else {
      window.close();
      // Fallback
      history.go(-(backPressCount + 1));
    }
    return;
  }
  
  // Reset counter after 3 seconds
  backPressTimer = setTimeout(() => {
    resetBackPress();
  }, 3000);
}

function resetBackPress() {
  backPressCount = 0;
  if (backPressTimer) {
    clearTimeout(backPressTimer);
    backPressTimer = null;
  }
  if (warningToast) {
    warningToast.remove();
    warningToast = null;
  }
}

function showToast(message, bgColor, borderColor) {
  // Remove existing toast
  if (warningToast) {
    warningToast.remove();
  }
  
  // Create toast element
  warningToast = document.createElement('div');
  warningToast.id = 'backWarning';
  warningToast.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      <div style="flex: 1;">
        <div style="font-size: 13px; line-height: 1.5;">${message}</div>
      </div>
    </div>
  `;
  
  warningToast.style.cssText = `
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
    animation: slideUp 0.3s ease;
    max-width: 400px;
    margin: 0 auto;
  `;
  
  document.body.appendChild(warningToast);
  
  // Auto remove after 2.5 seconds
  setTimeout(() => {
    if (warningToast === document.getElementById('backWarning')) {
      warningToast.remove();
      warningToast = null;
    }
  }, 2500);
}

// Reset when app goes to background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    resetBackPress();
  }
});

// Additional: Prevent swipe back on iOS
document.addEventListener('touchmove', function(e) {
  if (e.target === document.body && e.touches[0].clientX < 30) {
    e.preventDefault();
  }
}, { passive: false });