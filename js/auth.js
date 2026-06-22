// ===================== AUTH.JS =====================
const ADMIN_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

async function hashPassword(pwd) {
  if (pwd === 'admin') return ADMIN_HASH;
  if (crypto.subtle) {
    const e = new TextEncoder(); const h = await crypto.subtle.digest('SHA-256', e.encode(pwd));
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 0; for (let i=0;i<pwd.length;i++) { h = ((h<<5)-h) + pwd.charCodeAt(i); h|=0; }
  return 'fallback_'+Math.abs(h).toString(16);
}

async function login() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value;
  if (!u||!p) return;

  if (typeof cart !== 'undefined') cart = [];
  if (typeof totalDiskonValue !== 'undefined') totalDiskonValue = 0;
  if (typeof bayarValue !== 'undefined') bayarValue = 0;
  if (typeof renderCart === 'function') renderCart();

  const { data: user, error } = await supabaseClient.from('users').select('*').eq('username', u).single();
  if (error) { document.getElementById('loginError').textContent = 'Error: '+error.message; return; }
  if (!user) { document.getElementById('loginError').textContent = 'User tidak ditemukan'; return; }
  if (user.password_hash !== await hashPassword(p)) { document.getElementById('loginError').textContent = 'Password salah'; return; }

  currentUser = user;
  saveSession();
  clearAllDisplayedData();

  document.getElementById('loginOverlay').style.display = 'none';
  
  applyRoleRestrictions();
  
  await muatProfilToko();
  tampilkanUserList();
  setupTransaksi();
  setupInventory();
  refreshProductList();
  setDefaultDateFilter();
  if (activeTab==='laporan') muatLaporan();
  aturHakAkses();

  setTimeout(function() { if (typeof checkAutoEmailReport === 'function') checkAutoEmailReport(); }, 2000);
  setTimeout(function() { if (typeof checkLowStockBanner === 'function') checkLowStockBanner(); }, 1500);
}

function logout() {
  clearSession();
  currentUser = null;

  if (typeof cart !== 'undefined') cart = [];
  if (typeof totalDiskonValue !== 'undefined') totalDiskonValue = 0;
  if (typeof bayarValue !== 'undefined') bayarValue = 0;
  if (typeof renderCart === 'function') renderCart();
  if (typeof tutupFormProduk === 'function') tutupFormProduk();

  var searchResults = document.getElementById('searchResults');
  if (searchResults) { searchResults.innerHTML = ''; searchResults.style.display = 'none'; }

  var cartTable = document.querySelector('#cartTable tbody');
  if (cartTable) cartTable.innerHTML = '';
  var reportTable = document.querySelector('#reportTable tbody');
  if (reportTable) reportTable.innerHTML = '';
  var productTable = document.querySelector('#productListTable tbody');
  if (productTable) productTable.innerHTML = '';

  var totalTransaksi = document.getElementById('totalTransaksi');
  var totalPendapatan = document.getElementById('totalPendapatan');
  if (totalTransaksi) totalTransaksi.textContent = '0';
  if (totalPendapatan) totalPendapatan.textContent = 'Rp 0';

  var productCount = document.getElementById('productCount');
  if (productCount) productCount.textContent = '0';

  if (typeof chartInstance !== 'undefined' && chartInstance) { chartInstance.destroy(); chartInstance = null; }
  if (typeof topProductsChart !== 'undefined' && topProductsChart) { topProductsChart.destroy(); topProductsChart = null; }

  var lowStockBanner = document.getElementById('lowStockBanner');
  if (lowStockBanner) lowStockBanner.style.display = 'none';
  var lowStockAlert = document.getElementById('lowStockAlert');
  if (lowStockAlert) lowStockAlert.style.display = 'none';

  ['scanInputTrans', 'custName', 'invSearch', 'searchProduct', 'prodBarcode', 'prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'perubahanStok', 'bayar', 'newUsername', 'newPassword'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });

  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
  if (typeof appSettings !== 'undefined') appSettings = {};
  if (typeof window.cachedSettings !== 'undefined') window.cachedSettings = null;

  localStorage.removeItem('lastReportSent');
  localStorage.removeItem('lastReportSchedule');

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
}

function saveSession() { if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); }
function clearSession() { localStorage.removeItem('currentUser'); }

function checkSession() {
  var saved = localStorage.getItem('currentUser');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      clearAllDisplayedData();

      document.getElementById('loginOverlay').style.display = 'none';
      
      applyRoleRestrictions();
      
      muatProfilToko();
      tampilkanUserList();
      setupTransaksi();
      setupInventory();
      refreshProductList();
      setDefaultDateFilter();
      if (activeTab==='laporan') muatLaporan();
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

// ===================== ROLE-BASED PAGE RESTRICTIONS =====================
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
  var cartTable = document.querySelector('#cartTable tbody');
  if (cartTable) cartTable.innerHTML = '';
  var reportTable = document.querySelector('#reportTable tbody');
  if (reportTable) reportTable.innerHTML = '';
  var productTable = document.querySelector('#productListTable tbody');
  if (productTable) productTable.innerHTML = '';
  var totalTransaksi = document.getElementById('totalTransaksi');
  var totalPendapatan = document.getElementById('totalPendapatan');
  if (totalTransaksi) totalTransaksi.textContent = '0';
  if (totalPendapatan) totalPendapatan.textContent = 'Rp 0';
  var productCount = document.getElementById('productCount');
  if (productCount) productCount.textContent = '0';
  if (typeof chartInstance !== 'undefined' && chartInstance) { chartInstance.destroy(); chartInstance = null; }
  if (typeof topProductsChart !== 'undefined' && topProductsChart) { topProductsChart.destroy(); topProductsChart = null; }
  var lowStockBanner = document.getElementById('lowStockBanner');
  if (lowStockBanner) lowStockBanner.style.display = 'none';
  var lowStockAlert = document.getElementById('lowStockAlert');
  if (lowStockAlert) lowStockAlert.style.display = 'none';
  ['scanInputTrans', 'custName', 'invSearch', 'searchProduct', 'prodBarcode', 'prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'perubahanStok', 'bayar'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
  var searchResults = document.getElementById('searchResults');
  if (searchResults) { searchResults.innerHTML = ''; searchResults.style.display = 'none'; }
  var productForm = document.getElementById('productForm');
  if (productForm) productForm.style.display = 'none';
  var fotoPreviewContainer = document.getElementById('fotoPreviewContainer');
  if (fotoPreviewContainer) fotoPreviewContainer.style.display = 'none';
  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
  if (typeof appSettings !== 'undefined') appSettings = {};
  if (typeof window.cachedSettings !== 'undefined') window.cachedSettings = null;
}

// ===================== USER MANAGEMENT =====================
async function tambahUser() {
  if (!currentUser || currentUser.role!=='admin') return;
  var u = document.getElementById('newUsername').value.trim();
  var p = document.getElementById('newPassword').value;
  var r = document.getElementById('newRole').value;
  if (!u||!p) return alert('Isi username dan password');
  await supabaseClient.from('users').upsert({ username: u, password_hash: await hashPassword(p), role: r });
  tampilkanUserList();
  document.getElementById('newUsername').value = '';
  document.getElementById('newPassword').value = '';
}

async function hapusUser(username) {
  if (!currentUser || currentUser.role!=='admin') return;
  if (username==='admin') return alert('Admin tidak bisa dihapus');
  if (!confirm('Hapus user ' + username + '?')) return;
  await supabaseClient.from('users').delete().eq('username', username);
  tampilkanUserList();
}

function editUser(username) {
  if (!currentUser || currentUser.role!=='admin') return;
  supabaseClient.from('users').select('*').eq('username', username).single().then(function(result) {
    var u = result.data;
    if (!u) return;
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
  if (!currentUser || currentUser.role!=='admin') {
    document.getElementById('userListBody').innerHTML = '<tr><td colspan="3">Admin only</td></tr>';
    return;
  }
  var result = await supabaseClient.from('users').select('*');
  var users = result.data;
  var tbody = document.getElementById('userListBody');
  tbody.innerHTML = '';
  if (!users || !users.length) {
    tbody.innerHTML = '<tr><td colspan="3">Belum ada</td></tr>';
    return;
  }
  users.forEach(function(u) {
    var row = tbody.insertRow();
    var editBtn = '<button class="btn-sm" onclick="editUser(\'' + u.username + '\')">✏️</button>';
    var deleteBtn = u.username !== 'admin' ? ' <button class="btn-sm btn-danger" onclick="hapusUser(\'' + u.username + '\')">🗑</button>' : '';
    row.innerHTML = '<td>' + u.username + '</td><td>' + u.role + '</td><td>' + editBtn + deleteBtn + '</td>';
  });
}