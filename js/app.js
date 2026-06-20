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

// ===================== 4X BACK BUTTON TO EXIT =====================
let backPressCount = 0;
let backPressTimer = null;
let warningToast = null;

// Push initial state to prevent immediate back
history.pushState(null, null, location.href);

// Handle back button press
window.addEventListener('popstate', function(e) {
  // Always push state back to prevent navigation
  history.pushState(null, null, location.href);
  
  // Handle multi-tap logic
  handleBackPress();
});

function handleBackPress() {
  backPressCount++;
  
  // Clear previous timer
  if (backPressTimer) {
    clearTimeout(backPressTimer);
  }
  
  // Remove previous toast
  if (warningToast) {
    warningToast.remove();
    warningToast = null;
  }
  
  if (backPressCount >= 4) {
    // 4 presses reached - exit
    resetBackPress();
    history.back();
    history.back();
    return;
  }
  
  // Show warning
  showBackWarning();
  
  // Reset counter after 3 seconds of inactivity
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

function showBackWarning() {
  // Create warning toast
  warningToast = document.createElement('div');
  warningToast.id = 'backWarning';
  
  // Different message based on press count
  let message = '';
  let bgColor = '';
  let borderColor = '';
  
  if (backPressCount === 1) {
    message = 'Harap gunakan tombol <b>LOGOUT</b><br>untuk keluar dari aplikasi';
    bgColor = '#e3f2fd';
    borderColor = '#2196f3';
  } else if (backPressCount === 2) {
    message = '⚠️ Tombol BACK tidak disarankan!<br>Silakan tekan <b>LOGOUT</b> di pojok kanan atas';
    bgColor = '#fff3e0';
    borderColor = '#ff9800';
  } else if (backPressCount === 3) {
    message = '⛔ Aplikasi akan keluar paksa!<br>Gunakan <b>LOGOUT</b> untuk keluar dengan benar';
    bgColor = '#fce4ec';
    borderColor = '#f44336';
  }
  
  warningToast.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 10px;">
      <span style="font-size: 22px;">${backPressCount === 3 ? '⛔' : backPressCount === 2 ? '⚠️' : 'ℹ️'}</span>
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
}

// Reset when app goes to background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    resetBackPress();
  }
});