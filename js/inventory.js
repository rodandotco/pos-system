// ===================== INVENTORY.JS (FAST) =====================
function setupInventory() {
  document.getElementById('prodBarcode').onkeydown = function(e) { if (e.key === 'Enter') { e.preventDefault(); cariAtauTambahProduk(); } };
}

var currentBarcode = null, fotoDihapus = false;
var currentLabelBarcode = null;

// ===================== PAGINATION =====================
var productPage = 1;
var productPageSize = 50;
var totalProducts = 0;

// ===================== PRODUCT CACHE =====================
var cachedProducts = null;
var cacheTimestamp = null;
var CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

function invalidateProductCache() {
  cachedProducts = null;
  cacheTimestamp = null;
}

async function getProductsCached() {
  var now = Date.now();
  if (cachedProducts && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
    return cachedProducts;
  }
  var result = await supabaseClient.from('products').select('*', { count: 'exact' }).order('nama');
  cachedProducts = result.data || [];
  totalProducts = result.count || cachedProducts.length;
  cacheTimestamp = now;
  return cachedProducts;
}

async function cariAtauTambahProduk() {
  if (!currentUser) return;
  var barcode = document.getElementById('prodBarcode').value.trim(); if (!barcode) return;
  currentBarcode = barcode; document.getElementById('productForm').style.display = 'block'; fotoDihapus = false;
  var product = await getProductByBarcode(barcode);
  var isAdmin = currentUser.role === 'admin', isGudang = currentUser.role === 'gudang', canEdit = isAdmin || isGudang;
  if (product) { isiFormProduk(product, false, canEdit, isAdmin); if (product.foto) { document.getElementById('fotoPreview').src = product.foto; document.getElementById('fotoPreviewContainer').style.display = 'block'; } else document.getElementById('fotoPreviewContainer').style.display = 'none'; }
  else { if (!canEdit) { alert('Produk tidak ditemukan'); tutupFormProduk(); return; } isiFormProduk({ barcode: barcode, nama: '', kategori: '', keterangan: '', harga_beli: 0, harga_jual: 0, min_stok: 10, diskon_persen: 0, diskon_min_qty: 0, stok: 0, foto: null }, true, true, isAdmin); document.getElementById('fotoPreviewContainer').style.display = 'none'; }
  if (canEdit) document.getElementById('prodNama').focus();
  else { ['prodNama','prodKategori','prodKeterangan','prodHargaBeli','prodHargaJual','prodDiskonPersen','prodDiskonMinQty','prodMinStok','perubahanStok'].forEach(function(id){document.getElementById(id).readOnly=true;}); document.getElementById('btnSimpanProduk').style.display='none'; document.getElementById('btnHapusProduk').style.display='none'; document.getElementById('btnHapusFoto').style.display='none'; }
}

// ===================== PHOTO UPLOAD =====================
function ambilFotoDariKamera() { document.getElementById('prodFotoCamera').click(); }
async function previewFotoDariKamera() { var f = document.getElementById('prodFotoCamera').files[0]; if (f) await compressAndPreview(f); }
async function previewFotoDariFile() { var f = document.getElementById('prodFotoFile').files[0]; if (f) await compressAndPreview(f); }

async function compressAndPreview(file) {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  try {
    var img = new Image(); var url = URL.createObjectURL(file);
    img.onload = async function() { URL.revokeObjectURL(url);
      var mw = 400, mh = 400, w = img.width, h = img.height;
      if (w > mw || h > mh) { if (w > h) { h = Math.round((h/w)*mw); w = mw; } else { w = Math.round((w/h)*mh); h = mh; } }
      var c = document.getElementById('compressCanvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      var q = 0.7, comp = c.toDataURL('image/jpeg', q);
      while (comp.length > 2000000 && q > 0.1) { q -= 0.1; comp = c.toDataURL('image/jpeg', q); }
      if (comp.length > 2000000) { alert('⚠️ Foto terlalu besar.'); return; }
      document.getElementById('fotoPreview').src = comp; document.getElementById('fotoPreviewContainer').style.display = 'block';
      fotoDihapus = false; window.tempCompressedPhoto = comp;
    }; img.src = url;
  } catch(e) { alert('Gagal: ' + e.message); }
}

function hapusFoto() { if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  document.getElementById('fotoPreview').src = ''; document.getElementById('fotoPreviewContainer').style.display = 'none';
  document.getElementById('prodFotoFile').value = ''; document.getElementById('prodFotoCamera').value = ''; window.tempCompressedPhoto = null; fotoDihapus = true; }

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
      if (!currentBarcode) return; var foto = produk.foto || null;
      if (fotoDihapus) foto = null; else if (window.tempCompressedPhoto) { foto = window.tempCompressedPhoto; window.tempCompressedPhoto = null; }
      var data = { barcode: currentBarcode, nama: document.getElementById('prodNama').value.trim(), kategori: document.getElementById('prodKategori').value.trim(), keterangan: document.getElementById('prodKeterangan').value.trim(), harga_beli: parseFloat(document.getElementById('prodHargaBeli').value) || 0, harga_jual: parseFloat(document.getElementById('prodHargaJual').value) || 0, diskon_persen: parseFloat(document.getElementById('prodDiskonPersen').value) || 0, diskon_min_qty: parseInt(document.getElementById('prodDiskonMinQty').value) || 0, min_stok: parseInt(document.getElementById('prodMinStok').value) || 10, stok: (parseInt(document.getElementById('stokSaatIni').textContent) || 0) + (parseInt(document.getElementById('perubahanStok').value) || 0), foto: foto };
      try { await upsertProduct(data); invalidateProductCache(); alert('Disimpan'); tutupFormProduk(); refreshProductList(); } catch (e) { alert('Gagal: ' + e.message); }
    };
    document.getElementById('btnHapusProduk').onclick = async function() { if (confirm('Hapus?')) { await deleteProduct(currentBarcode); invalidateProductCache(); alert('Dihapus'); tutupFormProduk(); refreshProductList(); } };
  }
}

function tutupFormProduk() { document.getElementById('productForm').style.display = 'none'; document.getElementById('prodBarcode').value = ''; document.getElementById('prodBarcode').focus(); currentBarcode = null; document.getElementById('fotoPreviewContainer').style.display = 'none'; document.getElementById('prodFotoFile').value = ''; document.getElementById('prodFotoCamera').value = ''; window.tempCompressedPhoto = null; fotoDihapus = false; ['prodNama','prodKategori','prodKeterangan','prodHargaBeli','prodHargaJual','prodDiskonPersen','prodDiskonMinQty','prodMinStok','perubahanStok'].forEach(function(id){document.getElementById(id).readOnly=false;document.getElementById(id).disabled=false;}); document.getElementById('btnSimpanProduk').style.display='inline-block'; document.getElementById('btnHapusProduk').style.display='none'; document.getElementById('btnHapusFoto').style.display='block'; }
function hitungStokAkhir() { var a = parseInt(document.getElementById('stokSaatIni').textContent) || 0, b = parseInt(document.getElementById('perubahanStok').value) || 0; document.getElementById('stokAkhir').textContent = a + b; }

// ===================== FAST PRODUCT TABLE =====================
function renderProductTable(products) {
  var tbody = document.querySelector('#productListTable tbody'); tbody.innerHTML = '';
  document.getElementById('productCount').textContent = totalProducts;
  if (!products.length) { tbody.innerHTML = '<tr><td colspan="8">Tidak ada produk</td></tr>'; return; }
  var isAdmin = currentUser && currentUser.role === 'admin', isGudang = currentUser && currentUser.role === 'gudang', canEdit = isAdmin || isGudang;
  document.getElementById('thAksi').style.display = canEdit ? '' : 'none';
  
  // Build all rows as HTML string (faster than insertRow)
  var html = '';
  products.forEach(function(p) {
    var minStok = p.min_stok || 10; var isLowStock = (p.stok || 0) <= minStok;
    var rowBg = isLowStock ? 'background:#fff3e0;' : '';
    var stokStyle = isLowStock ? 'color:#e53935;font-weight:bold;' : 'color:#333;';
    var stokDisplay = (p.stok || 0) + (isLowStock ? ' ⚠️' : '');
    var grosirInfo = (p.diskon_persen > 0 && p.diskon_min_qty > 0) ? '<br><small style="color:#e53935;font-weight:bold;">🔥 Grosir ' + p.diskon_persen + '% min ' + p.diskon_min_qty + 'pcs</small>' : '';
    var fotoHtml = p.foto ? '<img src="' + p.foto + '" style="width:30px;height:30px;border-radius:4px;object-fit:cover;" loading="lazy">' : '<div style="width:30px;height:30px;background:#e0e0e0;border-radius:4px;display:flex;align-items:center;justify-content:center;">📦</div>';
    var editBtn = canEdit ? '<button class="btn-sm" onclick="editProdukDariDaftar(\'' + p.barcode + '\')">✏️</button> ' : '';
    var deleteBtn = isAdmin ? '<button class="btn-sm btn-danger" onclick="hapusProdukDariDaftar(\'' + p.barcode + '\')">🗑</button> ' : '';
    var aksi = editBtn + deleteBtn + '<button class="btn-sm" onclick="bukaLabelDialog(\'' + p.barcode + '\')">🏷️ Label</button>';
    html += '<tr style="' + rowBg + '"><td>' + (p.barcode||'') + '</td><td style="display:flex;align-items:center;gap:6px;">' + fotoHtml + '<div>' + (p.nama||'') + grosirInfo + '</div></td><td>' + (p.kategori||'-') + '</td><td>' + (p.keterangan||'-') + '</td><td>Rp' + (p.harga_jual||0).toLocaleString('id') + '</td><td style="' + stokStyle + '">' + stokDisplay + '</td><td>' + aksi + '</td></tr>';
  });
  tbody.innerHTML = html;
  updatePagination();
}

function updatePagination() {
  var totalPages = Math.ceil(totalProducts / productPageSize);
  var existing = document.getElementById('productPagination'); if (existing) existing.remove();
  var div = document.createElement('div'); div.id = 'productPagination';
  div.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:8px;justify-content:center;';
  div.innerHTML = '<button class="btn btn-sm" onclick="prevPage()" ' + (productPage<=1?'disabled':'') + '>◀ Sebelumnya</button><span style="font-size:12px;">Hal ' + productPage + ' dari ' + totalPages + ' (' + totalProducts + ' produk)</span><button class="btn btn-sm" onclick="nextPage()" ' + (productPage>=totalPages?'disabled':'') + '>Selanjutnya ▶</button>';
  var table = document.getElementById('productListTable'); table.parentNode.insertBefore(div, table.nextSibling);
}

async function refreshProductList() {
  document.getElementById('productCount').textContent = '...';
  productPage = 1;
  invalidateProductCache();
  var all = await getProductsCached();
  var start = 0, end = Math.min(productPageSize, all.length);
  renderProductTable(all.slice(start, end));
  document.getElementById('invSearch').value = '';
}

async function loadProductPage() {
  var all = await getProductsCached();
  var start = (productPage - 1) * productPageSize;
  var end = Math.min(start + productPageSize, all.length);
  renderProductTable(all.slice(start, end));
}

function nextPage() { var tp = Math.ceil(totalProducts/productPageSize); if (productPage<tp) { productPage++; loadProductPage(); } }
function prevPage() { if (productPage>1) { productPage--; loadProductPage(); } }

var filterTimer = null;
function filterProductList() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(async function() {
    var query = document.getElementById('invSearch') ? document.getElementById('invSearch').value.trim() : '';
    if (!query) { productPage = 1; var all = await getProductsCached(); var s = 0, e = Math.min(productPageSize, all.length); renderProductTable(all.slice(s, e)); return; }
    try {
      var r = await supabaseClient.from('products').select('*', { count: 'exact' }).or('nama.ilike.%' + query + '%,barcode.ilike.%' + query + '%,kategori.ilike.%' + query + '%').order('nama').limit(100);
      if (r.error) throw r.error;
      totalProducts = r.count || (r.data ? r.data.length : 0);
      renderProductTable(r.data || []);
    } catch (e) { console.error(e); document.querySelector('#productListTable tbody').innerHTML = '<tr><td colspan="8">Gagal mencari</td></tr>'; }
  }, 300);
}

async function editProdukDariDaftar(b) { if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return; document.getElementById('prodBarcode').value = b; cariAtauTambahProduk(); }
async function hapusProdukDariDaftar(b) { if (!currentUser || currentUser.role !== 'admin') return; if (!confirm('Hapus?')) return; await deleteProduct(b); invalidateProductCache(); refreshProductList(); }
function generateBarcode() { var now = new Date(); document.getElementById('prodBarcode').value = now.getFullYear().toString().slice(-2) + ('0'+(now.getMonth()+1)).slice(-2) + ('0'+now.getDate()).slice(-2) + ('0'+now.getHours()).slice(-2) + ('0'+now.getMinutes()).slice(-2) + ('0'+now.getSeconds()).slice(-2); cariAtauTambahProduk(); }

// ===================== LABEL PRINT DIALOG =====================
function updateLabelDialogStatus() {
  var c = (typeof labelDevice !== 'undefined' && labelDevice && typeof labelCharacteristic !== 'undefined' && labelCharacteristic);
  var led = document.getElementById('labelStatusLed'), txt = document.getElementById('labelStatusText');
  if (led) led.className = 'led ' + (c ? 'led-green' : 'led-red');
  if (txt) txt.textContent = c ? 'Label printer terhubung' : 'Label printer tidak terhubung';
}

async function bukaLabelDialog(barcode) {
  currentLabelBarcode = barcode;
  var s = await getSettings();
  document.getElementById('labelWidthMM').value = s.label_width_mm || '33'; document.getElementById('labelHeightMM').value = s.label_height_mm || '15';
  document.getElementById('labelGapMM').value = s.label_gap_mm || '2'; document.getElementById('labelDirection').value = s.label_direction || '0';
  document.getElementById('labelOffsetX').value = s.label_offset_x || '20'; document.getElementById('labelOffsetY').value = s.label_offset_y || '0';
  document.getElementById('labelCols').value = s.label_cols || '2'; document.getElementById('labelQty').value = s.label_qty || '10';
  document.getElementById('labelPrinterModel').value = s.label_printer_model || 'AD240';
  document.getElementById('showNama').checked = true; document.getElementById('showHarga').checked = true; document.getElementById('showBarcode').checked = true; document.getElementById('showDate').checked = false;
  document.getElementById('presetName').value = '';
  hitungJumlahCetak(); refreshPresetList(); updateLabelDialogStatus();
  document.getElementById('labelPrintModal').style.display = 'flex';
}

function hitungJumlahCetak() { var q = parseInt(document.getElementById('labelQty').value) || 0, c = parseInt(document.getElementById('labelCols').value) || 2; document.getElementById('labelPrintCount').value = (q > 0 && c > 0) ? Math.ceil(q / c) : 0; }

async function cetakLabelPDF() {
  var p = await getProductByBarcode(currentLabelBarcode); if (!p) return alert('Produk tidak ditemukan');
  var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: [33, 15] });
  var img = new Image(); img.crossOrigin = 'Anonymous';
  img.onload = function() { doc.addImage(img, 'PNG', 2, 2, 9, 9); doc.setFontSize(5); doc.text(doc.splitTextToSize(p.nama || 'Produk', 23), 12, 3); doc.setFontSize(6); doc.setFont(undefined, 'bold'); doc.text('Rp ' + (p.harga_jual || 0).toLocaleString('id'), 12, 9); doc.setFontSize(3); doc.setFont(undefined, 'normal'); doc.text(currentLabelBarcode, 2, 12); doc.setFontSize(2); doc.text(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), 12, 12); window.open(URL.createObjectURL(doc.output('blob')), '_blank'); };
  img.onerror = function() { alert('Gagal memuat QR code.'); };
  img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(currentLabelBarcode);
}

async function cetakLabelDariDialog() { if (!currentLabelBarcode) return alert('Pilih produk'); if (typeof labelDevice === 'undefined' || !labelDevice) { alert('⚠️ Label printer tidak terhubung!'); return; } await cetakLabelLangsung(currentLabelBarcode); }

function simpanLabelSettings() {
  var n = document.getElementById('presetName').value.trim(); if (!n) { alert('Beri nama template!'); return; }
  var s = { widthMM: document.getElementById('labelWidthMM').value, heightMM: document.getElementById('labelHeightMM').value, gapMM: document.getElementById('labelGapMM').value, direction: document.getElementById('labelDirection').value, offsetXMM: document.getElementById('labelOffsetX').value, offsetYMM: document.getElementById('labelOffsetY').value, cols: document.getElementById('labelCols').value, qty: document.getElementById('labelQty').value, model: document.getElementById('labelPrinterModel').value, showNama: document.getElementById('showNama').checked, showHarga: document.getElementById('showHarga').checked, showBarcode: document.getElementById('showBarcode').checked, showDate: document.getElementById('showDate').checked };
  var p = {}, sv = localStorage.getItem('labelPresets'); if (sv) { try { p = JSON.parse(sv); } catch(e) {} }
  p[n] = s; localStorage.setItem('labelPresets', JSON.stringify(p)); refreshPresetList();
  document.getElementById('presetName').value = ''; alert('Template "' + n + '" disimpan!');
}

function refreshPresetList() {
  var sel = document.getElementById('presetList'); sel.innerHTML = '<option value="">-- Pilih template --</option>';
  var sv = localStorage.getItem('labelPresets'); if (sv) { try { var p = JSON.parse(sv); Object.keys(p).sort().forEach(function(n) { var o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o); }); } catch(e) {} }
}

function muatLabelPreset() {
  var n = document.getElementById('presetList').value; if (!n) { alert('Pilih template!'); return; }
  var sv = localStorage.getItem('labelPresets'); if (!sv) return;
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