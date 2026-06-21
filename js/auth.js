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

  // Clear any existing data first
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

  // Clear all displayed data before loading new
  clearAllDisplayedData();

  document.getElementById('loginOverlay').style.display = 'none';
  await muatProfilToko();
  tampilkanUserList();
  setupTransaksi();
  setupInventory();
  refreshProductList();
  setDefaultDateFilter();
  if (activeTab==='laporan') muatLaporan();
  aturHakAkses();

  // Check auto email report after login
  setTimeout(() => {
    if (typeof checkAutoEmailReport === 'function') checkAutoEmailReport();
  }, 2000);
}

function logout() {
  // Clear all data
  clearSession();
  currentUser = null;

  // Clear cart
  if (typeof cart !== 'undefined') cart = [];
  if (typeof totalDiskonValue !== 'undefined') totalDiskonValue = 0;
  if (typeof bayarValue !== 'undefined') bayarValue = 0;
  if (typeof renderCart === 'function') renderCart();

  // Clear product form
  if (typeof tutupFormProduk === 'function') tutupFormProduk();

  // Clear search results
  const searchResults = document.getElementById('searchResults');
  if (searchResults) {
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
  }

  // Clear all tables
  const cartTable = document.querySelector('#cartTable tbody');
  if (cartTable) cartTable.innerHTML = '';

  const reportTable = document.querySelector('#reportTable tbody');
  if (reportTable) reportTable.innerHTML = '';

  const productTable = document.querySelector('#productListTable tbody');
  if (productTable) productTable.innerHTML = '';

  // Clear summary
  const totalTransaksi = document.getElementById('totalTransaksi');
  const totalPendapatan = document.getElementById('totalPendapatan');
  if (totalTransaksi) totalTransaksi.textContent = '0';
  if (totalPendapatan) totalPendapatan.textContent = 'Rp 0';

  // Clear product count
  const productCount = document.getElementById('productCount');
  if (productCount) productCount.textContent = '0';

  // Clear charts
  if (typeof chartInstance !== 'undefined' && chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (typeof topProductsChart !== 'undefined' && topProductsChart) {
    topProductsChart.destroy();
    topProductsChart = null;
  }

  // Clear all inputs
  const scanInput = document.getElementById('scanInputTrans');
  if (scanInput) scanInput.value = '';

  const custName = document.getElementById('custName');
  if (custName) custName.value = '';

  const invSearch = document.getElementById('invSearch');
  if (invSearch) invSearch.value = '';

  const searchProduct = document.getElementById('searchProduct');
  if (searchProduct) searchProduct.value = '';

  const prodBarcode = document.getElementById('prodBarcode');
  if (prodBarcode) prodBarcode.value = '';

  // Reset settings cache
  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
  if (typeof appSettings !== 'undefined') appSettings = {};
  if (typeof window.cachedSettings !== 'undefined') window.cachedSettings = null;

  // Clear local storage reports
  localStorage.removeItem('lastReportSent');
  localStorage.removeItem('lastReportSchedule');

  // Show login
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';

  // Reset tabs
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-transaksi').classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.tab-btn[data-page="transaksi"]').classList.add('active');
  activeTab = 'transaksi';
}

// Session
function saveSession() { if (currentUser) localStorage.setItem('currentUser', JSON.stringify(currentUser)); }
function clearSession() { localStorage.removeItem('currentUser'); }

function checkSession() {
  const saved = localStorage.getItem('currentUser');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);

      // Clear data before loading
      clearAllDisplayedData();

      document.getElementById('loginOverlay').style.display = 'none';
      muatProfilToko();
      tampilkanUserList();
      setupTransaksi();
      setupInventory();
      refreshProductList();
      setDefaultDateFilter();
      if (activeTab==='laporan') muatLaporan();
      aturHakAkses();

      // Check auto email report on session restore
      setTimeout(() => {
        if (typeof checkAutoEmailReport === 'function') checkAutoEmailReport();
      }, 2000);

      return true;
    } catch(e) {
      clearSession();
    }
  }
  // Jika tidak ada session, tampilkan form login
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  return false;
}

// ===================== CLEAR ALL DISPLAYED DATA =====================
function clearAllDisplayedData() {
  // Clear cart table
  const cartTable = document.querySelector('#cartTable tbody');
  if (cartTable) cartTable.innerHTML = '';

  // Clear report table
  const reportTable = document.querySelector('#reportTable tbody');
  if (reportTable) reportTable.innerHTML = '';

  // Clear product list table
  const productTable = document.querySelector('#productListTable tbody');
  if (productTable) productTable.innerHTML = '';

  // Clear summary numbers
  const totalTransaksi = document.getElementById('totalTransaksi');
  const totalPendapatan = document.getElementById('totalPendapatan');
  if (totalTransaksi) totalTransaksi.textContent = '0';
  if (totalPendapatan) totalPendapatan.textContent = 'Rp 0';

  // Clear product count
  const productCount = document.getElementById('productCount');
  if (productCount) productCount.textContent = '0';

  // Clear charts
  if (typeof chartInstance !== 'undefined' && chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (typeof topProductsChart !== 'undefined' && topProductsChart) {
    topProductsChart.destroy();
    topProductsChart = null;
  }

  // Clear all input fields
  const inputsToClear = [
    'scanInputTrans', 'custName', 'invSearch', 'searchProduct',
    'prodBarcode', 'prodNama', 'prodKategori', 'prodKeterangan',
    'prodHargaBeli', 'prodHargaJual', 'perubahanStok', 'bayar'
  ];

  inputsToClear.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  // Clear search results
  const searchResults = document.getElementById('searchResults');
  if (searchResults) {
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
  }

  // Hide product form
  const productForm = document.getElementById('productForm');
  if (productForm) productForm.style.display = 'none';

  // Clear foto preview
  const fotoPreviewContainer = document.getElementById('fotoPreviewContainer');
  if (fotoPreviewContainer) fotoPreviewContainer.style.display = 'none';

  // Reset settings cache
  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
  if (typeof appSettings !== 'undefined') appSettings = {};
  if (typeof window.cachedSettings !== 'undefined') window.cachedSettings = null;
}

// ===================== USER MANAGEMENT =====================
async function tambahUser() {
  if (!currentUser || currentUser.role!=='admin') return;
  const u = document.getElementById('newUsername').value.trim();
  const p = document.getElementById('newPassword').value;
  const r = document.getElementById('newRole').value;
  if (!u||!p) return alert('Isi username dan password');
  await supabaseClient.from('users').upsert({ username: u, password_hash: await hashPassword(p), role: r });
  tampilkanUserList();
  // Clear input
  document.getElementById('newUsername').value = '';
  document.getElementById('newPassword').value = '';
}

async function hapusUser(username) {
  if (!currentUser || currentUser.role!=='admin') return;
  if (username==='admin') return alert('Admin tidak bisa dihapus');
  if (!confirm(`Hapus user ${username}?`)) return;
  await supabaseClient.from('users').delete().eq('username', username);
  tampilkanUserList();
}

function editUser(username) {
  if (!currentUser || currentUser.role!=='admin') return;
  supabaseClient.from('users').select('*').eq('username', username).single().then(({data:u})=>{
    if (!u) return;
    document.getElementById('editUsername').value = u.username;
    document.getElementById('editUsernameDisplay').value = u.username;
    document.getElementById('editRole').value = u.role;
    document.getElementById('editPassword').value = '';
    document.getElementById('editUserModal').style.display = 'flex';
  });
}

async function simpanEditUser() {
  const u = document.getElementById('editUsername').value;
  const p = document.getElementById('editPassword').value;
  const r = document.getElementById('editRole').value;
  const update = { role: r };
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
  const { data: users } = await supabaseClient.from('users').select('*');
  const tbody = document.getElementById('userListBody');
  tbody.innerHTML = '';
  if (!users||!users.length) {
    tbody.innerHTML = '<tr><td colspan="3">Belum ada</td></tr>';
    return;
  }
  users.forEach(u => {
    const row = tbody.insertRow();
    row.innerHTML = `<td>${u.username}</td><td>${u.role}</td><td>
      <button class="btn-sm" onclick="editUser('${u.username}')">✏️</button>
      ${u.username!=='admin'?`<button class="btn-sm btn-danger" onclick="hapusUser('${u.username}')">🗑</button>`:''}
    </td>`;
  });
}