// ===================== INVENTORY.JS (FAST + STORAGE PHOTOS) =====================
function setupInventory() {
  document.getElementById('prodBarcode').onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); cariAtauTambahProduk(); } };
}

var currentBarcode = null, fotoDihapus = false;
var currentLabelBarcode = null;
var productPage = 1, productPageSize = 50, totalProducts = 0;

// ===================== LOCAL STORAGE CACHE =====================
function getLocalProducts() {
  try { var d = localStorage.getItem('cachedProducts'); if (d) return JSON.parse(d); } catch(e) {}
  return null;
}

function setLocalProducts(products) {
  try { localStorage.setItem('cachedProducts', JSON.stringify(products)); } catch(e) {}
}

var lastSyncTime = 0, SYNC_INTERVAL = 60000;

async function syncProductsIfNeeded() {
  var now = Date.now();
  if (now - lastSyncTime < SYNC_INTERVAL && getLocalProducts()) return getLocalProducts();
  try {
    var r = await supabaseClient.from('products').select('*').order('nama');
    if (r.data) { setLocalProducts(r.data); lastSyncTime = now; }
    return r.data || getLocalProducts() || [];
  } catch(e) { return getLocalProducts() || []; }
}

// ===================== FAST PRODUCT LIST =====================
async function refreshProductList() {
  productPage = 1; document.getElementById('productCount').textContent = '...';
  var cached = getLocalProducts();
  if (cached) { totalProducts = cached.length; renderProductTable(cached.slice(0, productPageSize)); }
  syncProductsIfNeeded().then(function(fresh) {
    if (fresh && (!cached || fresh.length !== cached.length)) {
      totalProducts = fresh.length; renderProductTable(fresh.slice(0, productPageSize));
    }
  });
  document.getElementById('invSearch').value = '';
}

async function loadProductPage() {
  var cached = getLocalProducts() || await syncProductsIfNeeded();
  totalProducts = cached.length;
  renderProductTable(cached.slice((productPage-1)*productPageSize, productPage*productPageSize));
}

function nextPage() { var tp = Math.ceil(totalProducts/productPageSize); if (productPage<tp) { productPage++; loadProductPage(); } }
function prevPage() { if (productPage>1) { productPage--; loadProductPage(); } }

// ===================== INSTANT SEARCH =====================
var filterTimer = null;
function filterProductList() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(function() {
    var q = (document.getElementById('invSearch')?.value || '').trim().toLowerCase();
    var cached = getLocalProducts();
    if (!cached) { refreshProductList(); return; }
    if (!q) { totalProducts = cached.length; renderProductTable(cached.slice(0, productPageSize)); return; }
    var filtered = cached.filter(function(p) {
      return (p.nama&&p.nama.toLowerCase().indexOf(q)!==-1) || (p.barcode&&p.barcode.toLowerCase().indexOf(q)!==-1) || (p.kategori&&p.kategori.toLowerCase().indexOf(q)!==-1);
    });
    totalProducts = filtered.length; renderProductTable(filtered.slice(0, 100));
  }, 100);
}

// ===================== OPTIMISTIC DELETE =====================
async function hapusProdukDariDaftar(b) {
  if (!currentUser || currentUser.role !== 'admin') return;
  if (!confirm('Hapus?')) return;
  var cached = getLocalProducts() || [];
  var product = cached.find(function(p) { return p.barcode === b; });
  cached = cached.filter(function(p) { return p.barcode !== b; });
  setLocalProducts(cached); totalProducts = cached.length; loadProductPage();
  try {
    await supabaseClient.from('products').delete().eq('barcode', b);
    // Delete photo from storage
    if (product && product.foto && product.foto.indexOf('supabase.co') !== -1) {
      var fileName = product.foto.split('/').pop();
      await supabaseClient.storage.from('product-photos').remove([fileName]);
    }
    lastSyncTime = 0;
  } catch(e) { localStorage.removeItem('cachedProducts'); refreshProductList(); }
}

function updateLocalProduct(product) {
  var cached = getLocalProducts() || [];
  var found = false;
  for (var i = 0; i < cached.length; i++) { if (cached[i].barcode === product.barcode) { cached[i] = product; found = true; break; } }
  if (!found) cached.push(product);
  setLocalProducts(cached); totalProducts = cached.length; lastSyncTime = 0;
}

// ===================== PRODUCT TABLE =====================
function renderProductTable(products) {
  var tbody = document.querySelector('#productListTable tbody'); tbody.innerHTML = '';
  document.getElementById('productCount').textContent = totalProducts;
  if (!products.length) { tbody.innerHTML = '<tr><td colspan="8">Tidak ada produk</td></tr>'; updatePagination(); return; }
  var isAdmin = currentUser && currentUser.role === 'admin', isGudang = currentUser && currentUser.role === 'gudang', canEdit = isAdmin || isGudang;
  document.getElementById('thAksi').style.display = canEdit ? '' : 'none';
  var html = '';
  for (var i = 0; i < products.length; i++) {
    var p = products[i];
    var minStok = p.min_stok || 10, isLowStock = (p.stok || 0) <= minStok;
    var rowBg = isLowStock ? 'background:#fff3e0;' : '';
    var stokStyle = isLowStock ? 'color:#e53935;font-weight:bold;' : 'color:#333;';
    var stokDisplay = (p.stok || 0) + (isLowStock ? ' ⚠️' : '');
    var grosirInfo = (p.diskon_persen > 0 && p.diskon_min_qty > 0) ? '<br><small style="color:#e53935;font-weight:bold;">🔥 Grosir ' + p.diskon_persen + '% min ' + p.diskon_min_qty + 'pcs</small>' : '';
    var fotoHtml = p.foto ? '<img src="' + p.foto + '" style="width:30px;height:30px;border-radius:4px;object-fit:cover;" loading="lazy" onerror="this.style.display=\'none\'">' : '<div style="width:30px;height:30px;background:#e0e0e0;border-radius:4px;display:flex;align-items:center;justify-content:center;">📦</div>';
    var editBtn = canEdit ? '<button class="btn-sm" onclick="editProdukDariDaftar(\'' + p.barcode + '\')">✏️</button> ' : '';
    var deleteBtn = isAdmin ? '<button class="btn-sm btn-danger" onclick="hapusProdukDariDaftar(\'' + p.barcode + '\')">🗑</button> ' : '';
    var aksi = editBtn + deleteBtn + '<button class="btn-sm" onclick="bukaLabelDialog(\'' + p.barcode + '\')">🏷️ Label</button>';
    html += '<tr style="' + rowBg + '"><td>' + (p.barcode||'') + '</td><td style="display:flex;align-items:center;gap:6px;">' + fotoHtml + '<div>' + (p.nama||'') + grosirInfo + '</div></td><td>' + (p.kategori||'-') + '</td><td>' + (p.keterangan||'-') + '</td><td>Rp' + (p.harga_jual||0).toLocaleString('id') + '</td><td style="' + stokStyle + '">' + stokDisplay + '</td><td>' + aksi + '</td></tr>';
  }
  tbody.innerHTML = html;
  updatePagination();
}

function updatePagination() {
  var tp = Math.ceil(totalProducts/productPageSize);
  var ex = document.getElementById('productPagination'); if (ex) ex.remove();
  var d = document.createElement('div'); d.id = 'productPagination';
  d.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:8px;justify-content:center;';
  d.innerHTML = '<button class="btn btn-sm" onclick="prevPage()" '+(productPage<=1?'disabled':'')+'>◀ Sebelumnya</button><span style="font-size:12px;">Hal '+productPage+' dari '+tp+' ('+totalProducts+' produk)</span><button class="btn btn-sm" onclick="nextPage()" '+(productPage>=tp?'disabled':'')+'>Selanjutnya ▶</button>';
  document.getElementById('productListTable').parentNode.insertBefore(d, document.getElementById('productListTable').nextSibling);
}

// ===================== PRODUCT SEARCH =====================
async function cariAtauTambahProduk() {
  if (!currentUser) return;
  var barcode = document.getElementById('prodBarcode').value.trim(); if (!barcode) return;
  currentBarcode = barcode; document.getElementById('productForm').style.display = 'block'; fotoDihapus = false;
  var cached = getLocalProducts(); var product = null;
  if (cached) { for (var i=0;i<cached.length;i++) { if (cached[i].barcode===barcode) { product=cached[i]; break; } } }
  if (!product) product = await getProductByBarcode(barcode);
  var isAdmin = currentUser.role === 'admin', isGudang = currentUser.role === 'gudang', canEdit = isAdmin || isGudang;
  if (product) { isiFormProduk(product, false, canEdit, isAdmin); if (product.foto) { document.getElementById('fotoPreview').src=product.foto; document.getElementById('fotoPreviewContainer').style.display='block'; } else document.getElementById('fotoPreviewContainer').style.display='none'; }
  else { if (!canEdit) { alert('Produk tidak ditemukan'); tutupFormProduk(); return; } isiFormProduk({barcode:barcode,nama:'',kategori:'',keterangan:'',harga_beli:0,harga_jual:0,min_stok:10,diskon_persen:0,diskon_min_qty:0,stok:0,foto:null},true,true,isAdmin); document.getElementById('fotoPreviewContainer').style.display='none'; }
  if (canEdit) document.getElementById('prodNama').focus();
  else { ['prodNama','prodKategori','prodKeterangan','prodHargaBeli','prodHargaJual','prodDiskonPersen','prodDiskonMinQty','prodMinStok','perubahanStok'].forEach(function(id){document.getElementById(id).readOnly=true;}); document.getElementById('btnSimpanProduk').style.display='none'; document.getElementById('btnHapusProduk').style.display='none'; document.getElementById('btnHapusFoto').style.display='none'; }
}

// ===================== PHOTO UPLOAD (30KB TARGET - Storage) =====================
function ambilFotoDariKamera() { document.getElementById('prodFotoCamera').click(); }
async function previewFotoDariKamera() { var f = document.getElementById('prodFotoCamera').files[0]; if (f) await compressAndPreview(f); }
async function previewFotoDariFile() { var f = document.getElementById('prodFotoFile').files[0]; if (f) await compressAndPreview(f); }

async function compressAndPreview(file) {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  try {
    var img = new Image(); var url = URL.createObjectURL(file);
    img.onload = async function() { URL.revokeObjectURL(url);
      var mw = 150, mh = 150, w = img.width, h = img.height;
      if (w > mw || h > mh) { if (w>h) { h=Math.round((h/w)*mw); w=mw; } else { w=Math.round((w/h)*mh); h=mh; } }
      var c = document.getElementById('compressCanvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      var q = 0.5, comp = c.toDataURL('image/jpeg', q);
      while (comp.length > 30000 && q > 0.1) { q -= 0.1; comp = c.toDataURL('image/jpeg', q); }
      var sizeKB = (comp.length/1024).toFixed(1); console.log('Photo: ' + sizeKB + ' KB');
      document.getElementById('fotoPreview').src = comp; document.getElementById('fotoPreviewContainer').style.display = 'block';
      fotoDihapus = false; window.tempCompressedPhoto = comp;
    }; img.src = url;
  } catch(e) { alert('Gagal: ' + e.message); }
}

async function uploadPhotoToStorage(base64) {
  try {
    var res = await fetch(base64); var blob = await res.blob();
    var fileName = Date.now() + '_' + Math.random().toString(36).substring(7) + '.jpg';
    var { data, error } = await supabaseClient.storage.from('product-photos').upload(fileName, blob, { cacheControl: '3600', upsert: true, contentType: 'image/jpeg' });
    if (error) throw error;
    var { data: urlData } = supabaseClient.storage.from('product-photos').getPublicUrl(fileName);
    return urlData.publicUrl;
  } catch(e) { console.error('Storage upload failed:', e); return null; }
}

function hapusFoto() {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  document.getElementById('fotoPreview').src = ''; document.getElementById('fotoPreviewContainer').style.display = 'none';
  document.getElementById('prodFotoFile').value = ''; document.getElementById('prodFotoCamera').value = ''; window.tempCompressedPhoto = null; fotoDihapus = true;
}

// ===================== PRODUCT FORM =====================
function isiFormProduk(produk, isNew, canEdit, isAdmin) {
  document.getElementById('formTitle').textContent = canEdit ? (isNew ? 'Tambah Baru' : 'Update') : 'Detail';
  document.getElementById('prodNama').value = produk.nama || ''; document.getElementById('prodKategori').value = produk.kategori || ''; document.getElementById('prodKeterangan').value = produk.keterangan || '';
  document.getElementById('prodHargaBeli').value = produk.harga_beli || 0; document.getElementById('prodHargaJual').value = produk.harga_jual || 0;
  document.getElementById('prodDiskonPersen').value = produk.diskon_persen || 0; document.getElementById('prodDiskonMinQty').value = produk.diskon_min_qty || 0;
  document.getElementById('prodMinStok').value = produk.min_stok || 10; document.getElementById('stokSaatIni').textContent = produk.stok || 0; document.getElementById('perubahanStok').value = 0; hitungStokAkhir();
  if (canEdit) {
    document.getElementById('btnHapusProduk').style.display = (isNew || !isAdmin) ? 'none' : 'inline-block'; document.getElementById('btnSimpanProduk').style.display = 'inline-block'; document.getElementById('btnHapusFoto').style.display = 'block';
    ['prodNama','prodKategori','prodKeterangan','prodHargaBeli','prodHargaJual','prodDiskonPersen','prodDiskonMinQty','prodMinStok','perubahanStok'].forEach(function(id){document.getElementById(id).readOnly=false;document.getElementById(id).disabled=false;});
    document.getElementById('btnSimpanProduk').onclick = async function() {
      if (!currentBarcode) return;
      var foto = produk.foto || null;
      if (fotoDihapus) {
        // Delete old photo from storage
        if (foto && foto.indexOf('supabase.co') !== -1) {
          try { var fn = foto.split('/').pop(); await supabaseClient.storage.from('product-photos').remove([fn]); } catch(e) {}
        }
        foto = null;
      } else if (window.tempCompressedPhoto) {
        // Upload to storage instead of base64
        var storageUrl = await uploadPhotoToStorage(window.tempCompressedPhoto);
        if (storageUrl) foto = storageUrl;
        else foto = window.tempCompressedPhoto; // fallback
        window.tempCompressedPhoto = null;
      }
      var data = { barcode: currentBarcode, nama: document.getElementById('prodNama').value.trim(), kategori: document.getElementById('prodKategori').value.trim(), keterangan: document.getElementById('prodKeterangan').value.trim(), harga_beli: parseFloat(document.getElementById('prodHargaBeli').value) || 0, harga_jual: parseFloat(document.getElementById('prodHargaJual').value) || 0, diskon_persen: parseFloat(document.getElementById('prodDiskonPersen').value) || 0, diskon_min_qty: parseInt(document.getElementById('prodDiskonMinQty').value) || 0, min_stok: parseInt(document.getElementById('prodMinStok').value) || 10, stok: (parseInt(document.getElementById('stokSaatIni').textContent) || 0) + (parseInt(document.getElementById('perubahanStok').value) || 0), foto: foto };
      try { await upsertProduct(data); updateLocalProduct(data); alert('Disimpan'); tutupFormProduk(); refreshProductList(); } catch (e) { alert('Gagal: ' + e.message); }
    };
    document.getElementById('btnHapusProduk').onclick = async function() { if (confirm('Hapus?')) { await deleteProduct(currentBarcode); hapusProdukDariDaftar(currentBarcode); alert('Dihapus'); tutupFormProduk(); } };
  }
}

function tutupFormProduk() { document.getElementById('productForm').style.display = 'none'; document.getElementById('prodBarcode').value = ''; document.getElementById('prodBarcode').focus(); currentBarcode = null; document.getElementById('fotoPreviewContainer').style.display = 'none'; document.getElementById('prodFotoFile').value = ''; document.getElementById('prodFotoCamera').value = ''; window.tempCompressedPhoto = null; fotoDihapus = false; ['prodNama','prodKategori','prodKeterangan','prodHargaBeli','prodHargaJual','prodDiskonPersen','prodDiskonMinQty','prodMinStok','perubahanStok'].forEach(function(id){document.getElementById(id).readOnly=false;document.getElementById(id).disabled=false;}); document.getElementById('btnSimpanProduk').style.display='inline-block'; document.getElementById('btnHapusProduk').style.display='none'; document.getElementById('btnHapusFoto').style.display='block'; }
function hitungStokAkhir() { var a = parseInt(document.getElementById('stokSaatIni').textContent) || 0, b = parseInt(document.getElementById('perubahanStok').value) || 0; document.getElementById('stokAkhir').textContent = a + b; }
async function editProdukDariDaftar(b) { if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return; document.getElementById('prodBarcode').value = b; cariAtauTambahProduk(); }
function generateBarcode() { var now = new Date(); document.getElementById('prodBarcode').value = now.getFullYear().toString().slice(-2) + ('0'+(now.getMonth()+1)).slice(-2) + ('0'+now.getDate()).slice(-2) + ('0'+now.getHours()).slice(-2) + ('0'+now.getMinutes()).slice(-2) + ('0'+now.getSeconds()).slice(-2); cariAtauTambahProduk(); }

// ===================== LABEL PRINT DIALOG =====================
function updateLabelDialogStatus() { var c = (typeof labelDevice !== 'undefined' && labelDevice && typeof labelCharacteristic !== 'undefined' && labelCharacteristic); var led = document.getElementById('labelStatusLed'), txt = document.getElementById('labelStatusText'); if (led) led.className = 'led ' + (c ? 'led-green' : 'led-red'); if (txt) txt.textContent = c ? 'Label printer terhubung' : 'Label printer tidak terhubung'; }

async function bukaLabelDialog(barcode) {
  currentLabelBarcode = barcode; var s = await getSettings();
  document.getElementById('labelWidthMM').value = s.label_width_mm || '33'; document.getElementById('labelHeightMM').value = s.label_height_mm || '15';
  document.getElementById('labelGapMM').value = s.label_gap_mm || '2'; document.getElementById('labelDirection').value = s.label_direction || '0';
  document.getElementById('labelOffsetX').value = s.label_offset_x || '20'; document.getElementById('labelOffsetY').value = s.label_offset_y || '0';
  document.getElementById('labelCols').value = s.label_cols || '2'; document.getElementById('labelQty').value = s.label_qty || '10';
  document.getElementById('labelPrinterModel').value = s.label_printer_model || 'AD240';
  document.getElementById('showNama').checked = true; document.getElementById('showHarga').checked = true; document.getElementById('showBarcode').checked = true; document.getElementById('showDate').checked = false;
  document.getElementById('presetName').value = ''; hitungJumlahCetak(); refreshPresetList(); updateLabelDialogStatus();
  document.getElementById('labelPrintModal').style.display = 'flex';
}

function hitungJumlahCetak() { var q = parseInt(document.getElementById('labelQty').value) || 0, c = parseInt(document.getElementById('labelCols').value) || 2; document.getElementById('labelPrintCount').value = (q > 0 && c > 0) ? Math.ceil(q / c) : 0; }

async function cetakLabelPDF() {
  var p = await getProductByBarcode(currentLabelBarcode); if (!p) return alert('Produk tidak ditemukan');
  var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: [33, 15] }); var img = new Image(); img.crossOrigin = 'Anonymous';
  img.onload = function() { doc.addImage(img, 'PNG', 2, 2, 9, 9); doc.setFontSize(5); doc.text(doc.splitTextToSize(p.nama || 'Produk', 23), 12, 3); doc.setFontSize(6); doc.setFont(undefined, 'bold'); doc.text('Rp ' + (p.harga_jual || 0).toLocaleString('id'), 12, 9); doc.setFontSize(3); doc.setFont(undefined, 'normal'); doc.text(currentLabelBarcode, 2, 12); doc.setFontSize(2); doc.text(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), 12, 12); window.open(URL.createObjectURL(doc.output('blob')), '_blank'); };
  img.onerror = function() { alert('Gagal memuat QR code.'); }; img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(currentLabelBarcode);
}

async function cetakLabelDariDialog() { if (!currentLabelBarcode) return alert('Pilih produk'); if (typeof labelDevice === 'undefined' || !labelDevice) { alert('⚠️ Label printer tidak terhubung!'); return; } await cetakLabelLangsung(currentLabelBarcode); }

function simpanLabelSettings() {
  var n = document.getElementById('presetName').value.trim(); if (!n) { alert('Beri nama template!'); return; }
  var s = { widthMM: document.getElementById('labelWidthMM').value, heightMM: document.getElementById('labelHeightMM').value, gapMM: document.getElementById('labelGapMM').value, direction: document.getElementById('labelDirection').value, offsetXMM: document.getElementById('labelOffsetX').value, offsetYMM: document.getElementById('labelOffsetY').value, cols: document.getElementById('labelCols').value, qty: document.getElementById('labelQty').value, model: document.getElementById('labelPrinterModel').value, showNama: document.getElementById('showNama').checked, showHarga: document.getElementById('showHarga').checked, showBarcode: document.getElementById('showBarcode').checked, showDate: document.getElementById('showDate').checked };
  var p = {}, sv = localStorage.getItem('labelPresets'); if (sv) { try { p = JSON.parse(sv); } catch(e) {} } p[n] = s; localStorage.setItem('labelPresets', JSON.stringify(p)); refreshPresetList();
  document.getElementById('presetName').value = ''; alert('Template "' + n + '" disimpan!');
}

function refreshPresetList() { var sel = document.getElementById('presetList'); sel.innerHTML = '<option value="">-- Pilih template --</option>'; var sv = localStorage.getItem('labelPresets'); if (sv) { try { var p = JSON.parse(sv); Object.keys(p).sort().forEach(function(n) { var o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); }); } catch(e) {} } }

function muatLabelPreset() {
  var n = document.getElementById('presetList').value; if (!n) { alert('Pilih template!'); return; } var sv = localStorage.getItem('labelPresets'); if (!sv) return;
  try { var p = JSON.parse(sv), s = p[n]; if (!s) return;
    document.getElementById('labelWidthMM').value = s.widthMM || '33'; document.getElementById('labelHeightMM').value = s.heightMM || '15';
    document.getElementById('labelGapMM').value = s.gapMM || '2'; document.getElementById('labelDirection').value = s.direction || '0';
    document.getElementById('labelOffsetX').value = s.offsetXMM || '20'; document.getElementById('labelOffsetY').value = s.offsetYMM || '0';
    if (s.cols !== undefined) document.getElementById('labelCols').value = s.cols; document.getElementById('labelQty').value = s.qty || '10';
    if (s.model) document.getElementById('labelPrinterModel').value = s.model;
    document.getElementById('showNama').checked = s.showNama !== false; document.getElementById('showHarga').checked = s.showHarga !== false;
    document.getElementById('showBarcode').checked = s.showBarcode !== false; document.getElementById('showDate').checked = s.showDate === true;
    hitungJumlahCetak(); alert('Template "' + n + '" dimuat!');
  } catch(e) {}
}

function hapusLabelPreset() { var n = document.getElementById('presetList').value; if (!n) return; if (!confirm('Hapus template?')) return; var sv = localStorage.getItem('labelPresets'); if (!sv) return; try { var p = JSON.parse(sv); delete p[n]; localStorage.setItem('labelPresets', JSON.stringify(p)); refreshPresetList(); alert('Template dihapus!'); } catch(e) {} }

function resetLabelSettings() {
  document.getElementById('labelWidthMM').value = '33'; document.getElementById('labelHeightMM').value = '15';
  document.getElementById('labelGapMM').value = '2'; document.getElementById('labelDirection').value = '0';
  document.getElementById('labelOffsetX').value = '20'; document.getElementById('labelOffsetY').value = '0';
  document.getElementById('labelCols').value = '2'; document.getElementById('labelQty').value = '10';
  document.getElementById('labelPrinterModel').value = 'AD240';
  document.getElementById('showNama').checked = true; document.getElementById('showHarga').checked = true;
  document.getElementById('showBarcode').checked = true; document.getElementById('showDate').checked = false;
  document.getElementById('presetName').value = ''; hitungJumlahCetak(); alert('Pengaturan label direset!');
}

async function cetakLabelQR(barcode) { bukaLabelDialog(barcode); }