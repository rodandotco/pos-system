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

// ===================== DOUBLE TAP BACK BUTTON =====================
let backPressedTime = 0;
let warningToast = null;

// Push initial state to prevent immediate back
history.pushState(null, null, location.href);

// Handle back button press
window.addEventListener('popstate', function(e) {
  // Always push state back to prevent navigation
  history.pushState(null, null, location.href);
  
  // Handle double tap logic
  handleBackPress();
});

function handleBackPress() {
  const currentTime = new Date().getTime();
  
  if (currentTime - backPressedTime < 2000) {
    // Double tap detected - allow exit
    if (warningToast) {
      warningToast.remove();
      warningToast = null;
    }
    // Go back twice to exit
    history.back();
    history.back();
    return;
  }
  
  // First tap - show warning
  backPressedTime = currentTime;
  showBackWarning();
  
  // Reset after 2 seconds
  setTimeout(() => {
    backPressedTime = 0;
    if (warningToast) {
      warningToast.remove();
      warningToast = null;
    }
  }, 2000);
}

function showBackWarning() {
  // Remove existing warning
  if (warningToast) {
    warningToast.remove();
  }
  
  // Create warning toast
  warningToast = document.createElement('div');
  warningToast.id = 'backWarning';
  warningToast.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
    ">
      <span style="font-size: 24px;">⚠️</span>
      <div>
        <div style="font-weight: bold; margin-bottom: 2px;">Konfirmasi Keluar</div>
        <div style="font-size: 13px; opacity: 0.9;">Tekan BACK sekali lagi untuk keluar dari aplikasi</div>
      </div>
    </div>
  `;
  warningToast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: #fff3e0;
    color: #e65100;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    border-left: 4px solid #ff9800;
    animation: slideUp 0.3s ease;
    max-width: 400px;
    margin: 0 auto;
  `;
  
  document.body.appendChild(warningToast);
  
  // Auto remove after 2 seconds
  setTimeout(() => {
    if (warningToast) {
      warningToast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => {
        if (warningToast) {
          warningToast.remove();
          warningToast = null;
        }
      }, 300);
    }
  }, 2000);
}

// Handle page visibility (when app goes to background)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // App went to background - reset back timer
    backPressedTime = 0;
    if (warningToast) {
      warningToast.remove();
      warningToast = null;
    }
  }
});