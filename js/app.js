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

// ===================== BACK BUTTON - SIMPLE ALERT =====================
let backCount = 0;
let backTimer = null;

// Push initial state
history.pushState(null, '', location.href);

window.addEventListener('popstate', function(event) {
  // Push state back immediately
  history.pushState(null, '', location.href);
  
  backCount++;
  clearTimeout(backTimer);
  
  if (backCount === 1) {
    alert('ℹ️ Harap gunakan tombol LOGOUT\nuntuk keluar dari aplikasi');
  } else if (backCount === 2) {
    alert('⚠️ Tombol BACK tidak disarankan!\nSilakan tekan LOGOUT di pojok kanan atas');
  } else if (backCount === 3) {
    alert('⛔ Satu kali lagi aplikasi akan keluar paksa!\nGunakan LOGOUT untuk keluar dengan benar');
  } else if (backCount >= 4) {
    // Allow exit
    backCount = 0;
    clearTimeout(backTimer);
    history.back();
    return;
  }
  
  // Reset after 3 seconds
  backTimer = setTimeout(function() {
    backCount = 0;
  }, 3000);
});

// Reset when app goes to background
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    backCount = 0;
    clearTimeout(backTimer);
  }
});