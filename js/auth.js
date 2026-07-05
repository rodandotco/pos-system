// ===================== AUTH.JS - SECURE VERSION =====================

var SALT_PREFIX = 'RDNPS_';
var MAX_LOGIN_ATTEMPTS = 5;
var LOCKOUT_MINUTES = 15;
var ADMIN_HASH = null;

(async function() {
  ADMIN_HASH = await hashPassword('admin');
})();

async function hashPassword(password) {
  var salted = SALT_PREFIX + password + SALT_PREFIX.split('').reverse().join('');
  if (window.crypto && crypto.subtle) {
    var encoder = new TextEncoder();
    var hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(salted));
    var hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
  var hash = 0;
  for (var i = 0; i < salted.length; i++) { hash = ((hash << 5) - hash) + salted.charCodeAt(i); hash |= 0; }
  return 'fallback_' + Math.abs(hash).toString(16);
}

function getLoginAttempts() {
  try { return JSON.parse(localStorage.getItem('login_attempts') || '{"count":0,"lockedUntil":null}'); }
  catch(e) { return { count: 0, lockedUntil: null }; }
}

function recordFailedAttempt() {
  var attempts = getLoginAttempts();
  attempts.count++;
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + (LOCKOUT_MINUTES * 60 * 1000);
    localStorage.setItem('login_attempts', JSON.stringify(attempts));
    return { locked: true, remainingMinutes: LOCKOUT_MINUTES };
  }
  localStorage.setItem('login_attempts', JSON.stringify(attempts));
  return { locked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts.count };
}

function resetLoginAttempts() {
  localStorage.setItem('login_attempts', JSON.stringify({ count: 0, lockedUntil: null }));
}

function isAccountLocked() {
  var attempts = getLoginAttempts();
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    var remainingMs = attempts.lockedUntil - Date.now();
    return { locked: true, remainingMinutes: Math.ceil(remainingMs / 60000) };
  }
  if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
    resetLoginAttempts();
  }
  return { locked: false, remainingMinutes: 0 };
}

async function login() {
  var u = document.getElementById('loginUser').value.trim();
  var p = document.getElementById('loginPass').value;
  var errorEl = document.getElementById('loginError');
  
  if (!u || !p) { errorEl.textContent = 'Mohon isi username dan password'; return; }
  
  var lockStatus = isAccountLocked();
  if (lockStatus.locked) {
    errorEl.textContent = 'Akun terkunci. Tunggu ' + lockStatus.remainingMinutes + ' menit.';
    return;
  }
  
  errorEl.textContent = '';
  clearAllCaches();
  
  try {
    var result = await supabaseClient.from('users').select('*').eq('username', u).single();
    var user = result.data;
    var error = result.error;
    
    if (error || !user) {
      var ar = recordFailedAttempt();
      errorEl.textContent = ar.locked ? 'Akun terkunci selama ' + LOCKOUT_MINUTES + ' menit.' : 'Username atau password salah. Sisa: ' + ar.remainingAttempts;
      return;
    }
    
    var inputHash = await hashPassword(p);
    if (user.password_hash !== inputHash) {
      var ar2 = recordFailedAttempt();
      errorEl.textContent = ar2.locked ? 'Akun terkunci selama ' + LOCKOUT_MINUTES + ' menit.' : 'Username atau password salah. Sisa: ' + ar2.remainingAttempts;
      return;
    }
    
    resetLoginAttempts();
    
    await supabaseClient.from('users').update({ last_login: new Date().toISOString() }).eq('username', u);
    
    currentUser = { username: user.username, role: user.role, store_id: user.store_id, login_time: Date.now() };
    saveSession();
    updateActiveUserDisplay();
    
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    
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
    
    resetInactivityTimer();
  } catch(err) {
    errorEl.textContent = 'Error koneksi. Coba lagi.';
  }
}

function saveSession() {
  if (!currentUser) return;
  var session = {
    username: currentUser.username, role: currentUser.role,
    store_id: currentUser.store_id, login_time: currentUser.login_time,
    expires_at: Date.now() + (8 * 60 * 60 * 1000)
  };
  var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(session))));
  localStorage.setItem('rodanpos_session', encoded);
}

function clearSession() { localStorage.removeItem('rodanpos_session'); }

function getSession() {
  try {
    var encoded = localStorage.getItem('rodanpos_session');
    if (!encoded) return null;
    var decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (decoded.expires_at && Date.now() > decoded.expires_at) { clearSession(); return null; }
    return decoded;
  } catch(e) { clearSession(); return null; }
}

function checkSession() {
  var session = getSession();
  if (session) {
    currentUser = session;
    updateActiveUserDisplay();
    clearAllCaches();
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
    resetInactivityTimer();
    return true;
  }
  document.getElementById('loginOverlay').style.display = 'flex';
  document.getElementById('loginUser').value = '';
  document.getElementById('loginPass').value = '';
  return false;
}

var inactivityTimer = null;
function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(function() { logout(); alert('Logout otomatis karena tidak ada aktivitas.'); }, 4 * 60 * 60 * 1000);
}

document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('touchstart', resetInactivityTimer);

function logout() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  clearSession(); currentUser = null; clearAllCaches();
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
  ['scanInputTrans','custName','invSearch','searchProduct','prodBarcode','prodNama','prodKategori','prodKeterangan','prodHargaBeli','prodHargaJual','perubahanStok','bayar','newUsername','newPassword'].forEach(function(id){var i=document.getElementById(id);if(i)i.value='';});
  var d=document.getElementById('activeUserDisplay');if(d)d.textContent='-';
  var r=document.getElementById('activeUserRole');if(r)r.textContent='-';
  document.querySelectorAll('.tab-btn').forEach(function(b){b.style.display='';});
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});
  document.getElementById('page-transaksi').classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
  var tt=document.querySelector('.tab-btn[data-page="transaksi"]');if(tt)tt.classList.add('active');
  activeTab='transaksi';
  document.getElementById('loginOverlay').style.display='flex';
  document.getElementById('loginUser').value='';
  document.getElementById('loginPass').value='';
  document.getElementById('loginError').textContent='';
}

function clearAllCaches() {
  localStorage.removeItem('cachedProducts'); localStorage.removeItem('cachedSettings');
  localStorage.removeItem('lastReportSent'); localStorage.removeItem('lastReportSchedule');
  if (typeof lastSyncTime !== 'undefined') lastSyncTime = 0;
  if (typeof cacheTimestamp !== 'undefined') cacheTimestamp = null;
  if (typeof cachedProducts !== 'undefined') cachedProducts = null;
  if (typeof cart !== 'undefined') cart = [];
  if (typeof totalDiskonValue !== 'undefined') totalDiskonValue = 0;
  if (typeof bayarValue !== 'undefined') bayarValue = 0;
  if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache();
  if (typeof appSettings !== 'undefined') appSettings = {};
  if (typeof window.cachedSettings !== 'undefined') window.cachedSettings = null;
}

function updateActiveUserDisplay() {
  var d=document.getElementById('activeUserDisplay'),r=document.getElementById('activeUserRole');
  if(d&&currentUser)d.textContent=currentUser.username;
  if(r&&currentUser){var n={admin:'Admin',kasir:'Kasir',staff:'User',gudang:'Gudang'};r.textContent=n[currentUser.role]||currentUser.role;}
}

function clearAllDisplayedData() {
  var el;
  el=document.querySelector('#cartTable tbody');if(el)el.innerHTML='';
  el=document.querySelector('#reportTable tbody');if(el)el.innerHTML='';
  el=document.querySelector('#productListTable tbody');if(el)el.innerHTML='';
  el=document.getElementById('totalTransaksi');if(el)el.textContent='0';
  el=document.getElementById('totalPendapatan');if(el)el.textContent='Rp 0';
  el=document.getElementById('productCount');if(el)el.textContent='0';
  if(typeof chartInstance!=='undefined'&&chartInstance){chartInstance.destroy();chartInstance=null;}
  if(typeof topProductsChart!=='undefined'&&topProductsChart){topProductsChart.destroy();topProductsChart=null;}
  el=document.getElementById('lowStockBanner');if(el)el.style.display='none';
  el=document.getElementById('lowStockAlert');if(el)el.style.display='none';
  ['scanInputTrans','custName','invSearch','searchProduct','prodBarcode','prodNama','prodKategori','prodKeterangan','prodHargaBeli','prodHargaJual','perubahanStok','bayar'].forEach(function(id){var i=document.getElementById(id);if(i)i.value='';});
  el=document.getElementById('searchResults');if(el){el.innerHTML='';el.style.display='none';}
  el=document.getElementById('productForm');if(el)el.style.display='none';
  el=document.getElementById('fotoPreviewContainer');if(el)el.style.display='none';
  if(typeof invalidateSettingsCache==='function')invalidateSettingsCache();
  if(typeof appSettings!=='undefined')appSettings={};
  if(typeof window.cachedSettings!=='undefined')window.cachedSettings=null;
}

function applyRoleRestrictions() {
  var role=currentUser?currentUser.role:'';
  var tT=document.querySelector('.tab-btn[data-page="transaksi"]'),tI=document.querySelector('.tab-btn[data-page="inventory"]'),tL=document.querySelector('.tab-btn[data-page="laporan"]'),tS=document.querySelector('.tab-btn[data-page="setting"]');
  if(tT)tT.style.display='';if(tI)tI.style.display='';if(tL)tL.style.display='';if(tS)tS.style.display='';
  if(role==='gudang'){if(tT)tT.style.display='none';if(tL)tL.style.display='none';if(tS)tS.style.display='none';document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});if(tI)tI.classList.add('active');var iP=document.getElementById('page-inventory');if(iP)iP.classList.add('active');activeTab='inventory';}
  else if(role==='staff'){if(tI)tI.style.display='none';if(tL)tL.style.display='none';if(tS)tS.style.display='none';document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');});document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});if(tT)tT.classList.add('active');var tP=document.getElementById('page-transaksi');if(tP)tP.classList.add('active');activeTab='transaksi';}
}

document.addEventListener('DOMContentLoaded',function(){
  var lu=document.getElementById('loginUser'),lp=document.getElementById('loginPass');
  if(lu)lu.addEventListener('input',function(){document.getElementById('loginError').textContent='';});
  if(lp){lp.addEventListener('input',function(){document.getElementById('loginError').textContent='';});lp.addEventListener('keypress',function(e){if(e.key==='Enter')login();});}
});

// ---- USER MANAGEMENT ----
async function tambahUser() {
  if(!currentUser||currentUser.role!=='admin')return;
  var u=document.getElementById('newUsername').value.trim(),p=document.getElementById('newPassword').value,r=document.getElementById('newRole').value;
  if(!u||!p)return alert('Isi username dan password');
  await supabaseClient.from('users').upsert({username:u,password_hash:await hashPassword(p),role:r});
  tampilkanUserList();document.getElementById('newUsername').value='';document.getElementById('newPassword').value='';
}

async function hapusUser(username) {
  if(!currentUser||currentUser.role!=='admin')return;
  if(username==='admin')return alert('Admin tidak bisa dihapus');
  if(!confirm('Hapus user '+username+'?'))return;
  await supabaseClient.from('users').delete().eq('username',username);
  tampilkanUserList();
}

function editUser(username) {
  if(!currentUser||currentUser.role!=='admin')return;
  supabaseClient.from('users').select('*').eq('username',username).single().then(function(r){var u=r.data;if(!u)return;document.getElementById('editUsername').value=u.username;document.getElementById('editUsernameDisplay').value=u.username;document.getElementById('editRole').value=u.role;document.getElementById('editPassword').value='';document.getElementById('editUserModal').style.display='flex';});
}

async function simpanEditUser() {
  var u=document.getElementById('editUsername').value,p=document.getElementById('editPassword').value,r=document.getElementById('editRole').value;
  var upd={role:r};if(p)upd.password_hash=await hashPassword(p);
  await supabaseClient.from('users').update(upd).eq('username',u);
  document.getElementById('editUserModal').style.display='none';tampilkanUserList();
}

async function tampilkanUserList() {
  if(!currentUser||currentUser.role!=='admin'){document.getElementById('userListBody').innerHTML='<tr><td colspan="3">Admin only</td></tr>';return;}
  var r=await supabaseClient.from('users').select('*'),users=r.data,tbody=document.getElementById('userListBody');
  tbody.innerHTML='';
  if(!users||!users.length){tbody.innerHTML='<tr><td colspan="3">Belum ada</td></tr>';return;}
  users.forEach(function(u){var row=tbody.insertRow(),h='<td>'+u.username+'</td><td>'+u.role+'</td><td>';h+='<button class="btn-sm" onclick="editUser(\''+u.username+'\')">✏️</button>';if(u.username!=='admin')h+=' <button class="btn-sm btn-danger" onclick="hapusUser(\''+u.username+'\')">🗑</button>';h+='</td>';row.innerHTML=h;});
}