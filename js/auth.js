// ===================== AUTH.JS =====================
var ADMIN_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

async function hashPassword(pwd) {
  if (pwd === 'admin') return ADMIN_HASH;
  if (crypto.subtle) {
    var e = new TextEncoder();
    var h = await crypto.subtle.digest('SHA-256', e.encode(pwd));
    return Array.from(new Uint8Array(h)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  var h = 0;
  for (var i = 0; i < pwd.length; i++) { h = ((h << 5) - h) + pwd.charCodeAt(i); h |= 0; }
  return 'fallback_' + Math.abs(h).toString(16);
}

async function login() {
  var u = document.getElementById('loginUser').value.trim();
  var p = document.getElementById('loginPass').value;
  if (!u || !p) return;

  // Clear error and cached data
  document.getElementById('loginError').textContent = '';
  localStorage.removeItem('cachedProducts');
  localStorage.removeItem('cachedSettings');
  if (typeof cart !== 'undefined') cart = [];
  if (typeof totalDiskonValue !== 'undefined') totalDiskonValue = 0;
  if (typeof bayarValue !== 'undefined') bayarValue = 0;
  if (typeof renderCart === 'function') renderCart();
  if (typeof lastSyncTime !== 'undefined') lastSyncTime = 0;
  if (typeof cacheTimestamp !== 'undefined') cacheTimestamp = null;
  if (typeof cachedProducts !== 'undefined') cachedProducts = null;

  var result = await supabaseClient.from('users').select('*').eq('username', u).single();
  var user = result.data;
  var error = result.error;

  if (error) { document.getElementById('loginError').textContent = 'Error: ' + error.message; return; }
  if (!user) { document.getElementById('loginError').textContent = 'User tidak ditemukan'; return; }
  if (user.password_hash !== await hashPassword(p)) { document.getElementById('loginError').textContent = 'Password salah'; return; }

  currentUser = user;
  saveSession();
  updateActiveUserDisplay();
  clearAllDisplayedData();

  document.getElementById('loginOverlay').style.display = 'none';
  applyRoleRestrictions();
  await muatProfilToko();
  tampilkanUserList();
  setupTransaksi();
  setupInventory();
  refreshProductList();
  setDefaultDateFilter();
  if (activeTab === 'laporan') muatLaporan();
  aturHakAkses();

  setTimeout(function() { if (typeof checkAutoEmailReport === 'function') checkAutoEmailReport(); }, 2000);
  setTimeout(function() { if (typeof checkLowStockBanner === 'function') checkLowStockBanner(); }, 1500);
}

function logout() {
  clearSession();
  currentUser = null;

  // Clear ALL caches
  localStorage.removeItem('cachedProducts');
  localStorage.removeItem('cachedSettings');
  localStorage.removeItem('lastReportSent');
  localStorage.removeItem('lastReportSchedule');
  if (typeof lastSyncTime !== 'undefined') lastSyncTime = 0;
  if (typeof cacheTimestamp !== 'undefined') cacheTimestamp = null;
  if (typeof cachedProducts !== 'undefined') cachedProducts = null;

  if (typeof cart !== 'undefined') cart = [];
  if (typeof totalDiskonValue !== 'undefined') totalDiskonValue = 0;
  if (typeof bayarValue !== 'undefined') bayarValue = 0;
  if (typeof renderCart === 'function') renderCart();
  if (typeof tutupFormProduk === 'function') tutupFormProduk();

  var el = document.getElementById('searchResults');
  if (el) { el.innerHTML = ''; el.style.display = 'none'; }

  el = document.querySelector('#cartTable tbody'); if (el) el.innerHTML = '';
  el = document.querySelector('#reportTable tbody'); if (el) el.innerHTML = '';
  el = document.querySelector('#productListTable tbody'); if (el) el.innerHTML = '';

  el = document.getElementById('totalTransaksi'); if (el) el.textContent = '0';
  el = document.getElementById('totalPendapatan'); if (el) el.textContent = 'Rp 0';
  el = document.getElementById('productCount'); if (el) el.textContent = '0';

  if (typeof chartInstance !== 'undefined' && chartInstance) { chartInstance.destroy(); chartInstance = null; }
  if (typeof topProductsChart !== 'undefined' && topProductsChart) { topProductsChart.destroy(); topProductsChart = null; }

  el = document.getElementById('lowStockBanner'); if (el) el.style.display = 'none';
  el = document.getElementById('lowStockAlert'); if (el) el.style.display = 'none';

  ['scanInputTrans', 'custName', 'invSearch', 'searchProduct', 'prodBarcode', 'prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'perubahanStok', 'bayar', 'newUsername', 'newPassword'].forEach(function(id) { var inp = document.getElementById(id); if (inp) inp.value = ''; });

  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
  if (typeof appSettings !== 'undefined') appSettings = {};
  if (typeof window.cachedSettings !== 'undefined') window.cachedSettings = null;

  var display = document.getElementById('activeUserDisplay'); if (display) display.textContent = '-';
  var roleDisplay = document.getElementById('activeUserRole'); if (roleDisplay) roleDisplay.textContent = '-';

  document.querySelectorAll('.tab-btn').forEach(function(b) { b.style.display = ''; });
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('page-transaksi').classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  var transTab = document.querySelector('.tab-btn[data-page="transaksi"]');
  if (transTab) transTab.classList.add('active');
  activeTab = 'transaksi';

  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('loginError').textContent = '';
}

function saveSession() { if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); }
function clearSession() { localStorage.removeItem('currentUser'); }

function checkSession() {
  var saved = localStorage.getItem('currentUser');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      updateActiveUserDisplay();

      // Clear product cache to force fresh data
      localStorage.removeItem('cachedProducts');
      if (typeof lastSyncTime !== 'undefined') lastSyncTime = 0;
      if (typeof cacheTimestamp !== 'undefined') cacheTimestamp = null;
      if (typeof cachedProducts !== 'undefined') cachedProducts = null;

      clearAllDisplayedData();
      document.getElementById('loginOverlay').style.display = 'none';
      applyRoleRestrictions();
      muatProfilToko();
      tampilkanUserList();
      setupTransaksi();
      setupInventory();
      refreshProductList();
      setDefaultDateFilter();
      if (activeTab === 'laporan') muatLaporan();
      aturHakAkses();

      setTimeout(function() { if (typeof checkAutoEmailReport === 'function') checkAutoEmailReport(); }, 2000);
      setTimeout(function() { if (typeof checkLowStockBanner === 'function') checkLowStockBanner(); }, 1500);

      return true;
    } catch(e) { clearSession(); }
  }
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  return false;
}

function applyRoleRestrictions() {
  var role = currentUser ? currentUser.role : '';
  var tabTransaksi = document.querySelector('.tab-btn[data-page="transaksi"]');
  var tabInventory = document.querySelector('.tab-btn[data-page="inventory"]');
  var tabLaporan = document.querySelector('.tab-btn[data-page="laporan"]');
  var tabSetting = document.querySelector('.tab-btn[data-page="setting"]');

  if (role === 'gudang') {
    if (tabTransaksi) tabTransaksi.style.display = 'none';
    if (tabInventory) tabInventory.style.display = '';
    if (tabLaporan) tabLaporan.style.display = 'none';
    if (tabSetting) tabSetting.style.display = 'none';
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    if (tabInventory) tabInventory.classList.add('active');
    var invPage = document.getElementById('page-inventory');
    if (invPage) invPage.classList.add('active');
    activeTab = 'inventory';
  } else if (role === 'staff') {
    if (tabTransaksi) tabTransaksi.style.display = '';
    if (tabInventory) tabInventory.style.display = 'none';
    if (tabLaporan) tabLaporan.style.display = 'none';
    if (tabSetting) tabSetting.style.display = 'none';
    document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    if (tabTransaksi) tabTransaksi.classList.add('active');
    var transPage = document.getElementById('page-transaksi');
    if (transPage) transPage.classList.add('active');
    activeTab = 'transaksi';
  } else if (role === 'kasir') {
    if (tabTransaksi) tabTransaksi.style.display = '';
    if (tabInventory) tabInventory.style.display = '';
    if (tabLaporan) tabLaporan.style.display = '';
    if (tabSetting) tabSetting.style.display = '';
  } else {
    if (tabTransaksi) tabTransaksi.style.display = '';
    if (tabInventory) tabInventory.style.display = '';
    if (tabLaporan) tabLaporan.style.display = '';
    if (tabSetting) tabSetting.style.display = '';
  }
}

function clearAllDisplayedData() {
  var el;
  el = document.querySelector('#cartTable tbody'); if (el) el.innerHTML = '';
  el = document.querySelector('#reportTable tbody'); if (el) el.innerHTML = '';
  el = document.querySelector('#productListTable tbody'); if (el) el.innerHTML = '';
  el = document.getElementById('totalTransaksi'); if (el) el.textContent = '0';
  el = document.getElementById('totalPendapatan'); if (el) el.textContent = 'Rp 0';
  el = document.getElementById('productCount'); if (el) el.textContent = '0';
  if (typeof chartInstance !== 'undefined' && chartInstance) { chartInstance.destroy(); chartInstance = null; }
  if (typeof topProductsChart !== 'undefined' && topProductsChart) { topProductsChart.destroy(); topProductsChart = null; }
  el = document.getElementById('lowStockBanner'); if (el) el.style.display = 'none';
  el = document.getElementById('lowStockAlert'); if (el) el.style.display = 'none';
  ['scanInputTrans', 'custName', 'invSearch', 'searchProduct', 'prodBarcode', 'prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'perubahanStok', 'bayar'].forEach(function(id) { var inp = document.getElementById(id); if (inp) inp.value = ''; });
  el = document.getElementById('searchResults'); if (el) { el.innerHTML = ''; el.style.display = 'none'; }
  el = document.getElementById('productForm'); if (el) el.style.display = 'none';
  el = document.getElementById('fotoPreviewContainer'); if (el) el.style.display = 'none';
  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
  if (typeof appSettings !== 'undefined') appSettings = {};
  if (typeof window.cachedSettings !== 'undefined') window.cachedSettings = null;
}

function updateActiveUserDisplay() {
  var display = document.getElementById('activeUserDisplay');
  var roleDisplay = document.getElementById('activeUserRole');
  if (display && currentUser) display.textContent = currentUser.username;
  if (roleDisplay && currentUser) {
    var roleName = currentUser.role;
    if (roleName === 'admin') roleName = 'Admin';
    else if (roleName === 'kasir') roleName = 'Kasir';
    else if (roleName === 'staff') roleName = 'User';
    else if (roleName === 'gudang') roleName = 'Gudang';
    roleDisplay.textContent = roleName;
  }
}

// Clear login error when user types
document.addEventListener('DOMContentLoaded', function() {
  var loginUser = document.getElementById('loginUser');
  var loginPass = document.getElementById('loginPass');
  if (loginUser) loginUser.addEventListener('input', function() { document.getElementById('loginError').textContent = ''; });
  if (loginPass) loginPass.addEventListener('input', function() { document.getElementById('loginError').textContent = ''; });
});

// ===================== USER MANAGEMENT =====================
async function tambahUser() {
  if (!currentUser || currentUser.role !== 'admin') return;
  var u = document.getElementById('newUsername').value.trim();
  var p = document.getElementById('newPassword').value;
  var r = document.getElementById('newRole').value;
  if (!u || !p) return alert('Isi username dan password');
  await supabaseClient.from('users').upsert({ username: u, password_hash: await hashPassword(p), role: r });
  tampilkanUserList();
  document.getElementById('newUsername').value = '';
  document.getElementById('newPassword').value = '';
}

async function hapusUser(username) {
  if (!currentUser || currentUser.role !== 'admin') return;
  if (username === 'admin') return alert('Admin tidak bisa dihapus');
  if (!confirm('Hapus user ' + username + '?')) return;
  await supabaseClient.from('users').delete().eq('username', username);
  tampilkanUserList();
}

function editUser(username) {
  if (!currentUser || currentUser.role !== 'admin') return;
  supabaseClient.from('users').select('*').eq('username', username).single().then(function(result) {
    var u = result.data; if (!u) return;
    document.getElementById('editUsername').value = u.username;
    document.getElementById('editUsernameDisplay').value = u.username;
    document.getElementById('editRole').value = u.role;
    document.getElementById('editPassword').value = '';
    document.getElementById('editUserModal').style.display = 'flex';
  });
}

async function simpanEditUser() {
  var u = document.getElementById('editUsername').value;
  var p = document.getElementById('editPassword').value;
  var r = document.getElementById('editRole').value;
  var update = { role: r };
  if (p) update.password_hash = await hashPassword(p);
  await supabaseClient.from('users').update(update).eq('username', u);
  document.getElementById('editUserModal').style.display = 'none';
  tampilkanUserList();
}

async function tampilkanUserList() {
  if (!currentUser || currentUser.role !== 'admin') {
    document.getElementById('userListBody').innerHTML = '<tr><td colspan="3">Admin only</td></tr>';
    return;
  }
  var result = await supabaseClient.from('users').select('*');
  var users = result.data;
  var tbody = document.getElementById('userListBody');
  tbody.innerHTML = '';
  if (!users || !users.length) { tbody.innerHTML = '<tr><td colspan="3">Belum ada</td></tr>'; return; }
  users.forEach(function(u) {
    var row = tbody.insertRow();
    var html = '<td>' + u.username + '</td><td>' + u.role + '</td><td>';
    html += '<button class="btn-sm" onclick="editUser(\'' + u.username + '\')">✏️</button>';
    if (u.username !== 'admin') html += ' <button class="btn-sm btn-danger" onclick="hapusUser(\'' + u.username + '\')">🗑</button>';
    html += '</td>'; row.innerHTML = html;
  });
}