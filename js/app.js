// ===================== APP.JS =====================

// KILL OLD SERVICE WORKER
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    registrations.forEach(function(registration) {
      registration.unregister();
    });
  });
}

let activeTab = 'transaksi';

// Navigation
document.querySelectorAll('.tab-btn').forEach(b => {
  b.addEventListener('click', () => {
    if (!currentUser) return;
    if (!b.dataset.page) return;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
    document.getElementById('page-' + b.dataset.page).classList.add('active');
    b.classList.add('active');
    activeTab = b.dataset.page;
    if (activeTab === 'laporan') { setDefaultDateFilter(); muatLaporan(); }
    if (activeTab === 'setting') { muatProfilToko(); tampilkanUserList(); aturHakAkses(); }
    if (activeTab === 'inventory') refreshProductList();
    if (activeTab === 'transaksi') {
      document.getElementById('scanInputTrans').focus();
      setTimeout(() => { if (typeof checkLowStockBanner === 'function') checkLowStockBanner(); }, 500);
    }
  });
});

function initApp() {
  checkSession();
}
initApp();

// Back button
let backCount = 0;
let backTimer = null;

history.pushState(null, '', location.href);

window.addEventListener('popstate', function(event) {
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
    backCount = 0;
    clearTimeout(backTimer);
    history.back();
    return;
  }
  backTimer = setTimeout(function() { backCount = 0; }, 3000);
});

document.addEventListener('visibilitychange', function() {
  if (document.hidden) { backCount = 0; clearTimeout(backTimer); }
});
