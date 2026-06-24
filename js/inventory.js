// ===================== INVENTORY.JS =====================
function setupInventory() {
  document.getElementById('prodBarcode').onkeydown = function(e) {
    if (e.key === 'Enter') { e.preventDefault(); cariAtauTambahProduk(); }
  };
}

var currentBarcode = null, fotoDihapus = false;
var currentLabelBarcode = null;

async function cariAtauTambahProduk() {
  if (!currentUser) return;
  var barcode = document.getElementById('prodBarcode').value.trim(); if (!barcode) return;
  currentBarcode = barcode; document.getElementById('productForm').style.display = 'block'; fotoDihapus = false;
  var product = await getProductByBarcode(barcode);
  var isAdmin = currentUser.role === 'admin';
  var isGudang = currentUser.role === 'gudang';
  var canEdit = isAdmin || isGudang;
  if (product) {
    isiFormProduk(product, false, canEdit, isAdmin);
    if (product.foto) { document.getElementById('fotoPreview').src = product.foto; document.getElementById('fotoPreviewContainer').style.display = 'block'; }
    else document.getElementById('fotoPreviewContainer').style.display = 'none';
  } else {
    if (!canEdit) { alert('Produk tidak ditemukan'); tutupFormProduk(); return; }
    isiFormProduk({ barcode: barcode, nama: '', kategori: '', keterangan: '', harga_beli: 0, harga_jual: 0, min_stok: 10, diskon_persen: 0, diskon_min_qty: 0, stok: 0, foto: null }, true, true, isAdmin);
    document.getElementById('fotoPreviewContainer').style.display = 'none';
  }
  if (canEdit) document.getElementById('prodNama').focus();
  else {
    ['prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'prodDiskonPersen', 'prodDiskonMinQty', 'prodMinStok', 'perubahanStok'].forEach(function(id) { document.getElementById(id).readOnly = true; });
    document.getElementById('btnSimpanProduk').style.display = 'none';
    document.getElementById('btnHapusProduk').style.display = 'none';
    document.getElementById('btnHapusFoto').style.display = 'none';
    document.getElementById('prodFoto').disabled = true;
  }
}

function previewFoto() {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  var f = document.getElementById('prodFoto').files[0];
  if (f) { var reader = new FileReader(); reader.onload = function(e) { document.getElementById('fotoPreview').src = e.target.result; document.getElementById('fotoPreviewContainer').style.display = 'block'; }; reader.readAsDataURL(f); fotoDihapus = false; }
}

function hapusFoto() {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  document.getElementById('fotoPreview').src = ''; document.getElementById('fotoPreviewContainer').style.display = 'none'; document.getElementById('prodFoto').value = ''; fotoDihapus = true;
}

function isiFormProduk(produk, isNew, canEdit, isAdmin) {
  document.getElementById('formTitle').textContent = canEdit ? (isNew ? 'Tambah Baru' : 'Update') : 'Detail';
  document.getElementById('prodNama').value = produk.nama || '';
  document.getElementById('prodKategori').value = produk.kategori || '';
  document.getElementById('prodKeterangan').value = produk.keterangan || '';
  document.getElementById('prodHargaBeli').value = produk.harga_beli || 0;
  document.getElementById('prodHargaJual').value = produk.harga_jual || 0;
  document.getElementById('prodDiskonPersen').value = produk.diskon_persen || 0;
  document.getElementById('prodDiskonMinQty').value = produk.diskon_min_qty || 0;
  document.getElementById('prodMinStok').value = produk.min_stok || 10;
  document.getElementById('stokSaatIni').textContent = produk.stok || 0;
  document.getElementById('perubahanStok').value = 0; hitungStokAkhir();
  if (canEdit) {
    document.getElementById('btnHapusProduk').style.display = (isNew || !isAdmin) ? 'none' : 'inline-block';
    document.getElementById('btnSimpanProduk').style.display = 'inline-block';
    document.getElementById('btnHapusFoto').style.display = 'block';
    ['prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'prodDiskonPersen', 'prodDiskonMinQty', 'prodMinStok', 'perubahanStok', 'prodFoto'].forEach(function(id) { document.getElementById(id).readOnly = false; document.getElementById(id).disabled = false; });
    document.getElementById('btnSimpanProduk').onclick = async function() {
      if (!currentBarcode) return;
      var foto = produk.foto || null;
      if (fotoDihapus) foto = null;
      else { var fi = document.getElementById('prodFoto'); if (fi.files[0]) foto = await toBase64(fi.files[0]); }
      var data = { barcode: currentBarcode, nama: document.getElementById('prodNama').value.trim(), kategori: document.getElementById('prodKategori').value.trim(), keterangan: document.getElementById('prodKeterangan').value.trim(), harga_beli: parseFloat(document.getElementById('prodHargaBeli').value) || 0, harga_jual: parseFloat(document.getElementById('prodHargaJual').value) || 0, diskon_persen: parseFloat(document.getElementById('prodDiskonPersen').value) || 0, diskon_min_qty: parseInt(document.getElementById('prodDiskonMinQty').value) || 0, min_stok: parseInt(document.getElementById('prodMinStok').value) || 10, stok: (parseInt(document.getElementById('stokSaatIni').textContent) || 0) + (parseInt(document.getElementById('perubahanStok').value) || 0), foto: foto };
      try { await upsertProduct(data); alert('Disimpan'); tutupFormProduk(); refreshProductList(); } catch (e) { alert('Gagal: ' + e.message); }
    };
    document.getElementById('btnHapusProduk').onclick = async function() { if (confirm('Hapus?')) { await deleteProduct(currentBarcode); alert('Dihapus'); tutupFormProduk(); refreshProductList(); } };
  }
}

function tutupFormProduk() {
  document.getElementById('productForm').style.display = 'none'; document.getElementById('prodBarcode').value = ''; document.getElementById('prodBarcode').focus(); currentBarcode = null;
  document.getElementById('fotoPreviewContainer').style.display = 'none'; document.getElementById('prodFoto').value = ''; fotoDihapus = false;
  ['prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'prodDiskonPersen', 'prodDiskonMinQty', 'prodMinStok', 'perubahanStok', 'prodFoto'].forEach(function(id) { document.getElementById(id).readOnly = false; document.getElementById(id).disabled = false; });
  document.getElementById('btnSimpanProduk').style.display = 'inline-block'; document.getElementById('btnHapusProduk').style.display = 'none'; document.getElementById('btnHapusFoto').style.display = 'block';
}

function hitungStokAkhir() { var a = parseInt(document.getElementById('stokSaatIni').textContent) || 0, b = parseInt(document.getElementById('perubahanStok').value) || 0; document.getElementById('stokAkhir').textContent = a + b; }

function renderProductTable(products) {
  var tbody = document.querySelector('#productListTable tbody');
  tbody.innerHTML = '';
  document.getElementById('productCount').textContent = products.length;
  if (!products.length) { tbody.innerHTML = '<tr><td colspan="8">Tidak ada produk</td></tr>'; return; }
  var isAdmin = currentUser && currentUser.role === 'admin';
  var isGudang = currentUser && currentUser.role === 'gudang';
  var canEdit = isAdmin || isGudang;
  document.getElementById('thAksi').style.display = canEdit ? '' : 'none';
  products.forEach(function(p) {
    var row = tbody.insertRow();
    var minStok = p.min_stok || 10;
    var isLowStock = (p.stok || 0) <= minStok;
    if (isLowStock) row.style.background = '#fff3e0';
    var stokStyle = isLowStock ? 'color:#e53935; font-weight:bold;' : 'color:#333;';
    var stokDisplay = (p.stok || 0) + (isLowStock ? ' ⚠️' : '');
    var grosirInfo = (p.diskon_persen > 0 && p.diskon_min_qty > 0) ? '<br><small style="color:#e53935; font-weight:bold;">🔥 Grosir ' + p.diskon_persen + '% min ' + p.diskon_min_qty + 'pcs</small>' : '';
    var namaCell = '<td style="display:flex;align-items:center;gap:6px;">' + (p.foto ? '<img src="' + p.foto + '" style="width:30px;height:30px;border-radius:4px;object-fit:cover;">' : '<div style="width:30px;height:30px;background:#e0e0e0;border-radius:4px;display:flex;align-items:center;justify-content:center;">📦</div>') + '<div>' + (p.nama || '') + grosirInfo + '</div></td>';
    var editBtn = canEdit ? '<button class="btn-sm" onclick="editProdukDariDaftar(\'' + p.barcode + '\')">✏️</button> ' : '';
    var deleteBtn = isAdmin ? '<button class="btn-sm btn-danger" onclick="hapusProdukDariDaftar(\'' + p.barcode + '\')">🗑</button> ' : '';
    var aksi = editBtn + deleteBtn + '<button class="btn-sm" onclick="bukaLabelDialog(\'' + p.barcode + '\')">🏷️ Label</button>';
    row.innerHTML = '<td>' + (p.barcode || '') + '</td>' + namaCell + '<td>' + (p.kategori || '-') + '</td><td>' + (p.keterangan || '-') + '</td><td>Rp' + (p.harga_jual || 0).toLocaleString('id') + '</td><td style="' + stokStyle + '">' + stokDisplay + '</td><td>' + aksi + '</td>';
  });
}

async function refreshProductList() {
  try { var all = await getAllProducts(); renderProductTable(all); document.getElementById('invSearch').value = ''; }
  catch (e) { console.error(e); document.querySelector('#productListTable tbody').innerHTML = '<tr><td colspan="8">Gagal memuat data</td></tr>'; }
}

var filterTimer = null;
function filterProductList() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(async function() {
    var query = document.getElementById('invSearch') ? document.getElementById('invSearch').value.trim() : '';
    if (!query) { await refreshProductList(); return; }
    try {
      var result = await supabaseClient.from('products').select('*').or('nama.ilike.%' + query + '%,barcode.ilike.%' + query + '%,kategori.ilike.%' + query + '%').order('nama').limit(50);
      if (result.error) throw result.error;
      renderProductTable(result.data || []);
    } catch (e) { console.error(e); document.querySelector('#productListTable tbody').innerHTML = '<tr><td colspan="8">Gagal mencari data</td></tr>'; }
  }, 300);
}

async function editProdukDariDaftar(b) {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  document.getElementById('prodBarcode').value = b; cariAtauTambahProduk();
}

async function hapusProdukDariDaftar(b) {
  if (!currentUser || currentUser.role !== 'admin') return;
  if (!confirm('Hapus?')) return; await deleteProduct(b); refreshProductList();
}

function generateBarcode() {
  var now = new Date();
  var y = now.getFullYear().toString().slice(-2);
  var m = ('0' + (now.getMonth() + 1)).slice(-2);
  var d = ('0' + now.getDate()).slice(-2);
  var h = ('0' + now.getHours()).slice(-2);
  var i = ('0' + now.getMinutes()).slice(-2);
  var s = ('0' + now.getSeconds()).slice(-2);
  document.getElementById('prodBarcode').value = y + m + d + h + i + s;
  cariAtauTambahProduk();
}

// ===================== LABEL PRINT DIALOG =====================
function mmToDots(mm) {
  return Math.round(mm * 8);
}

function updateLabelDialogStatus() {
  var connected = (typeof labelPrinterDevice !== 'undefined' && labelPrinterDevice && typeof labelPrinterCharacteristic !== 'undefined' && labelPrinterCharacteristic);
  var led = document.getElementById('labelStatusLed');
  var text = document.getElementById('labelStatusText');
  if (led) led.className = 'led ' + (connected ? 'led-green' : 'led-red');
  if (text) text.textContent = connected ? 'Label printer terhubung' : 'Label printer tidak terhubung';
}

async function sambungLabelPrinterDariDialog() {
  await sambungLabelPrinter();
  updateLabelDialogStatus();
}

function bukaLabelDialog(barcode) {
  currentLabelBarcode = barcode;
  
  var savedSettings = localStorage.getItem('labelSettings');
  if (savedSettings) {
    try {
      var settings = JSON.parse(savedSettings);
      document.getElementById('labelWidthMM').value = settings.widthMM || 33;
      document.getElementById('labelHeightMM').value = settings.heightMM || 15;
      document.getElementById('labelGapMM').value = settings.gapMM || 2;
      document.getElementById('labelDirection').value = settings.direction || '0';
      document.getElementById('labelOffsetX').value = settings.offsetXMM || 0;
      document.getElementById('labelOffsetY').value = settings.offsetYMM || 0;
      document.getElementById('labelCols').value = settings.cols || 2;
      document.getElementById('labelQty').value = settings.qty || 2;
      if (settings.showNama !== undefined) document.getElementById('showNama').checked = settings.showNama;
      if (settings.showHarga !== undefined) document.getElementById('showHarga').checked = settings.showHarga;
      if (settings.showBarcode !== undefined) document.getElementById('showBarcode').checked = settings.showBarcode;
      if (settings.showDate !== undefined) document.getElementById('showDate').checked = settings.showDate;
    } catch(e) {}
  }
  
  hitungJumlahCetak();
  refreshPresetList();
  updateLabelDialogStatus();
  
  var btnPrint = document.getElementById('btnPrintLabelDirect');
  if (btnPrint) btnPrint.style.display = '';
  
  document.getElementById('labelPrintModal').style.display = 'flex';
}

function hitungJumlahCetak() {
  var qty = parseInt(document.getElementById('labelQty').value) || 2;
  var cols = parseInt(document.getElementById('labelCols').value) || 2;
  var printCount = Math.ceil(qty / cols);
  document.getElementById('labelPrintCount').value = printCount;
}

async function cetakLabelPDF() {
  var product = await getProductByBarcode(currentLabelBarcode);
  if (!product) return alert('Produk tidak ditemukan');
  
  var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(currentLabelBarcode);
  var nama = product.nama || 'Produk';
  var harga = 'Rp ' + (product.harga_jual || 0).toLocaleString('id');
  
  var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: [33, 15] });
  var qrImage = new Image();
  qrImage.crossOrigin = 'Anonymous';
  qrImage.onload = function() {
    doc.addImage(qrImage, 'PNG', 2, 2, 9, 9);
    doc.setFontSize(5); var namaLines = doc.splitTextToSize(nama, 23); doc.text(namaLines, 12, 3);
    doc.setFontSize(6); doc.setFont(undefined, 'bold'); doc.text(harga, 12, 9);
    doc.setFontSize(3); doc.setFont(undefined, 'normal'); doc.text(currentLabelBarcode, 2, 12);
    doc.setFontSize(2); doc.text(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), 12, 12);
    window.open(URL.createObjectURL(doc.output('blob')), '_blank');
  };
  qrImage.onerror = function() { alert('Gagal memuat QR code.'); };
  qrImage.src = qrUrl;
  document.getElementById('labelPrintModal').style.display = 'none';
}

async function cetakLabelWithSettings() {
  if (!labelPrinterDevice || !labelPrinterCharacteristic) {
    alert('⚠️ Label printer tidak terhubung!\n\nSilakan klik tombol "🔗 Sambung" untuk menghubungkan printer.');
    return;
  }
  
  var product = await getProductByBarcode(currentLabelBarcode);
  if (!product) return alert('Produk tidak ditemukan');
  
  var w = mmToDots(parseFloat(document.getElementById('labelWidthMM').value) || 33);
  var h = mmToDots(parseFloat(document.getElementById('labelHeightMM').value) || 15);
  var gap = mmToDots(parseFloat(document.getElementById('labelGapMM').value) || 2);
  var direction = document.getElementById('labelDirection').value || '0';
  var ox = mmToDots(parseFloat(document.getElementById('labelOffsetX').value) || 0);
  var oy = mmToDots(parseFloat(document.getElementById('labelOffsetY').value) || 0);
  var cols = parseInt(document.getElementById('labelCols').value) || 2;
  var printCount = parseInt(document.getElementById('labelPrintCount').value) || 1;
  
  var showNama = document.getElementById('showNama').checked;
  var showHarga = document.getElementById('showHarga').checked;
  var showBarcode = document.getElementById('showBarcode').checked;
  var showDate = document.getElementById('showDate').checked;
  
  var nama = (product.nama || 'Produk').substring(0, 20);
  var harga = 'Rp' + (product.harga_jual || 0).toLocaleString('id');
  var barcodeText = currentLabelBarcode;
  var tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  
  try {
    var encoder = new TextEncoder();
    var cmd = '';
    
    // EXACT logic from working labelprinter.html
    var totalW = cols === 2 ? (w * 2 + gap) : w;
    cmd += 'SIZE ' + totalW + ',' + h + '\r\n';
    cmd += 'GAP 0,0\r\n';
    cmd += 'DIRECTION ' + direction + '\r\n';
    cmd += 'CLS\r\n';
    
    for (var col = 0; col < cols; col++) {
      var x = (col * (w + gap)) + 10 + ox;
      var y = 10 + oy;
      
      if (showNama) {
        cmd += 'TEXT ' + x + ',' + y + ',"1",0,1,1,"' + nama + '"\r\n';
        y += 25;
      }
      if (showHarga) {
        cmd += 'TEXT ' + x + ',' + y + ',"1",0,1.5,1.5,"' + harga + '"\r\n';
        y += 30;
      }
      if (showBarcode) {
        cmd += 'BARCODE ' + x + ',' + y + ',"128",30,1,0,1,1,"' + barcodeText + '"\r\n';
        y += 35;
      }
      if (showDate) {
        cmd += 'TEXT ' + x + ',' + y + ',"1",0,1,1,"' + tgl + '"\r\n';
      }
    }
    
    cmd += 'PRINT ' + printCount + '\r\n';
    
    console.log('Label - w:' + w + ' h:' + h + ' gap:' + gap + ' totalW:' + totalW + ' ox:' + ox + ' oy:' + oy + ' cols:' + cols + ' dir:' + direction);
    
    var data = encoder.encode(cmd);
    for (var i = 0; i < data.byteLength; i += 20) {
      var end = Math.min(i + 20, data.byteLength);
      var chunk = data.slice(i, end);
      await labelPrinterCharacteristic.writeValue(chunk);
      await sleep(80);
    }
    
    document.getElementById('labelPrintModal').style.display = 'none';
    alert('Label dicetak! (' + (printCount * cols) + ' pcs)');
  } catch (e) {
    console.error('Error:', e.message);
    alert('Gagal cetak: ' + e.message);
  }
}

// ===================== LABEL PRESETS =====================
function simpanLabelSettings() {
  var name = document.getElementById('presetName').value.trim();
  if (!name) { alert('Beri nama template terlebih dahulu! Contoh: "Label 33x15"'); return; }
  
  var settings = {
    widthMM: parseFloat(document.getElementById('labelWidthMM').value) || 33,
    heightMM: parseFloat(document.getElementById('labelHeightMM').value) || 15,
    gapMM: parseFloat(document.getElementById('labelGapMM').value) || 2,
    direction: document.getElementById('labelDirection').value || '0',
    offsetXMM: parseFloat(document.getElementById('labelOffsetX').value) || 0,
    offsetYMM: parseFloat(document.getElementById('labelOffsetY').value) || 0,
    cols: parseInt(document.getElementById('labelCols').value) || 2,
    qty: parseInt(document.getElementById('labelQty').value) || 2,
    showNama: document.getElementById('showNama').checked,
    showHarga: document.getElementById('showHarga').checked,
    showBarcode: document.getElementById('showBarcode').checked,
    showDate: document.getElementById('showDate').checked
  };
  
  var presets = {};
  var saved = localStorage.getItem('labelPresets');
  if (saved) { try { presets = JSON.parse(saved); } catch(e) {} }
  
  presets[name] = settings;
  localStorage.setItem('labelPresets', JSON.stringify(presets));
  localStorage.setItem('labelSettings', JSON.stringify(settings));
  
  refreshPresetList();
  document.getElementById('presetName').value = '';
  alert('Template "' + name + '" disimpan!');
}

function refreshPresetList() {
  var select = document.getElementById('presetList');
  select.innerHTML = '<option value="">-- Pilih template --</option>';
  
  var saved = localStorage.getItem('labelPresets');
  if (saved) {
    try {
      var presets = JSON.parse(saved);
      var names = Object.keys(presets).sort();
      names.forEach(function(name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
      });
    } catch(e) {}
  }
}

function muatLabelPreset() {
  var name = document.getElementById('presetList').value;
  if (!name) { alert('Pilih template terlebih dahulu!'); return; }
  
  var saved = localStorage.getItem('labelPresets');
  if (!saved) return;
  
  try {
    var presets = JSON.parse(saved);
    var s = presets[name];
    if (!s) return;
    
    document.getElementById('labelWidthMM').value = s.widthMM || 33;
    document.getElementById('labelHeightMM').value = s.heightMM || 15;
    document.getElementById('labelGapMM').value = s.gapMM || 2;
    document.getElementById('labelDirection').value = s.direction || '0';
    document.getElementById('labelOffsetX').value = s.offsetXMM || 0;
    document.getElementById('labelOffsetY').value = s.offsetYMM || 0;
    document.getElementById('labelCols').value = s.cols || 2;
    document.getElementById('labelQty').value = s.qty || 2;
    document.getElementById('showNama').checked = s.showNama !== false;
    document.getElementById('showHarga').checked = s.showHarga !== false;
    document.getElementById('showBarcode').checked = s.showBarcode !== false;
    document.getElementById('showDate').checked = s.showDate === true;
    hitungJumlahCetak();
    
    localStorage.setItem('labelSettings', JSON.stringify(s));
    alert('Template "' + name + '" dimuat!');
  } catch(e) {}
}

function hapusLabelPreset() {
  var name = document.getElementById('presetList').value;
  if (!name) return;
  if (!confirm('Hapus template "' + name + '"?')) return;
  
  var saved = localStorage.getItem('labelPresets');
  if (!saved) return;
  
  try {
    var presets = JSON.parse(saved);
    delete presets[name];
    localStorage.setItem('labelPresets', JSON.stringify(presets));
    refreshPresetList();
    alert('Template dihapus!');
  } catch(e) {}
}

async function cetakLabelQR(barcode) { bukaLabelDialog(barcode); }