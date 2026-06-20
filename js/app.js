// ===================== APP.JS (SIMPLE VERSION) =====================
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

// ===================== BACK BUTTON - SIMPLE =====================
let backCount = 0;
let backTimer = null;

// Block back button by pushing state
history.pushState(null, '', location.href);

window.onpopstate = function() {
  // Push state again immediately
  history.pushState(null, '', location.href);
  
  backCount++;
  
  clearTimeout(backTimer);
  
  if (backCount === 1) {
    alert('ℹ️ Harap gunakan tombol LOGOUT untuk keluar dari aplikasi');
  } else if (backCount === 2) {
    alert('⚠️ Tombol BACK tidak disarankan! Gunakan tombol LOGOUT');
  } else if (backCount === 3) {
    alert('⛔ Satu kali lagi aplikasi akan keluar!');
  } else if (backCount >= 4) {
    // Exit
    history.go(-2);
  }
  
  backTimer = setTimeout(function() {
    backCount = 0;
  }, 3000);
};