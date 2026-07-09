console.log('=== offline.js START ===');

var isOnline = true;
var syncInProgress = false;
var offlineDB = null;
var connectionTimer = null;

// Test that we can write to console
try {
  console.log('offline.js vars set, isOnline=' + isOnline);
} catch(e) {
  alert('offline.js error: ' + e.message);
}

// DB
function openDB() {
  return new Promise(function(ok, fail) {
    var r = indexedDB.open('PosDB', 1);
    r.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('tx')) db.createObjectStore('tx', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('pr')) db.createObjectStore('pr', { keyPath: 'barcode' });
    };
    r.onsuccess = function(e) { offlineDB = e.target.result; console.log('DB ready'); ok(); };
    r.onerror = function(e) { console.error('DB error', e); fail(e); };
  });
}

function saveLocal(store, data) {
  return new Promise(function(ok, fail) {
    if (!offlineDB) { ok(); return; }
    var t = offlineDB.transaction(store, 'readwrite');
    var s = t.objectStore(store);
    if (Array.isArray(data)) { data.forEach(function(d) { s.put(d); }); }
    else { s.put(data); }
    t.oncomplete = ok;
    t.onerror = fail;
  });
}

function getLocal(store) {
  return new Promise(function(ok) {
    if (!offlineDB) { ok([]); return; }
    var t = offlineDB.transaction(store, 'readonly');
    var r = t.objectStore(store).getAll();
    r.onsuccess = function() { ok(r.result || []); };
  });
}

function delLocal(store, id) {
  return new Promise(function(ok) {
    if (!offlineDB) { ok(); return; }
    var t = offlineDB.transaction(store, 'readwrite');
    t.objectStore(store).delete(id);
    t.oncomplete = ok;
  });
}

// Connection
function checkNet() {
  return new Promise(function(ok) {
    var x = new XMLHttpRequest();
    var t = setTimeout(function() { x.abort(); ok(false); }, 5000);
    x.onload = function() { clearTimeout(t); ok(x.status === 200); };
    x.onerror = function() { clearTimeout(t); ok(false); };
    x.open('GET', SUPABASE_URL + '/rest/v1/settings?select=id&limit=1');
    x.setRequestHeader('apikey', SUPABASE_ANON_KEY);
    x.setRequestHeader('Authorization', 'Bearer ' + SUPABASE_ANON_KEY);
    x.send();
  });
}

async function updateNet() {
  var was = isOnline;
  isOnline = await checkNet();
  console.log('Net: ' + (isOnline ? 'ONLINE' : 'OFFLINE'));
  if (was && !isOnline) showOffBanner();
  if (!was && isOnline) { hideOffBanner(); syncTx(); }
}

function showOffBanner() {
  if (document.getElementById('offBanner')) return;
  var b = document.createElement('div');
  b.id = 'offBanner';
  b.style.cssText = 'background:#e65100;color:#fff;text-align:center;padding:10px;font-weight:bold;font-size:14px;';
  b.textContent = '🔴 OFFLINE - Transaksi disimpan di HP';
  var app = document.getElementById('app');
  if (app) app.insertBefore(b, app.firstChild);
}

function hideOffBanner() {
  var b = document.getElementById('offBanner');
  if (b) b.remove();
  var s = document.getElementById('syncBanner');
  if (s) s.remove();
}

// Cache products
async function cacheProducts() {
  if (!isOnline) return;
  try {
    var r = await supabaseClient.from('products').select('*');
    if (r.data) {
      var t = offlineDB.transaction('pr', 'readwrite');
      var s = t.objectStore('pr');
      s.clear();
      r.data.forEach(function(p) { s.put(p); });
      console.log('Cached ' + r.data.length + ' products');
    }
  } catch(e) {}
}

// Queue offline tx
async function queueTx(tx) {
  await saveLocal('tx', {
    customer: tx.customer || '',
    items: tx.items,
    total: tx.total,
    bayar: tx.bayar,
    kembali: tx.kembali,
    created_by: tx.created_by || '',
    synced: false,
    createdAt: Date.now()
  });
  console.log('Tx saved offline');
}

// Sync
async function syncTx() {
  if (syncInProgress || !isOnline) return;
  var all = await getLocal('tx');
  var pending = all.filter(function(t) { return !t.synced; });
  if (!pending.length) return;
  
  syncInProgress = true;
  console.log('Syncing ' + pending.length + ' tx...');
  
  for (var i = 0; i < pending.length; i++) {
    var tx = pending[i];
    try {
      var n = new Date();
      var no = 'INV-' + n.toISOString().slice(0,10).replace(/-/g,'') + '-' + n.toTimeString().slice(0,8).replace(/:/g,'');
      await supabaseClient.from('transactions').insert({
        no_invoice: no, tanggal: new Date(tx.createdAt).toISOString(),
        customer: tx.customer, items: tx.items, total: tx.total,
        bayar: tx.bayar, kembali: tx.kembali, created_by: tx.created_by
      });
      await delLocal('tx', tx.id);
      console.log('Synced: ' + no);
    } catch(e) { console.error('Sync err:', e); }
  }
  syncInProgress = false;
}

// Init
async function initOfflineMode() {
  console.log('Init offline...');
  await openDB();
  await updateNet();
  if (isOnline) await cacheProducts();
  
  setInterval(async function() {
    await updateNet();
    if (isOnline) await syncTx();
  }, 20000);
  
  window.addEventListener('online', function() { setTimeout(updateNet, 2000); });
  window.addEventListener('offline', function() { isOnline = false; showOffBanner(); });
  console.log('Offline ready');
}

console.log('=== offline.js END ===');