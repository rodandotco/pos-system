// ===================== INVENTORY.JS =====================
function setupInventory() {
  document.getElementById('prodBarcode').onkeydown = function(e) {
    if (e.key === 'Enter') { e.preventDefault(); cariAtauTambahProduk(); }
  };
}

var currentBarcode = null, fotoDihapus = false;

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
    var aksi = editBtn + deleteBtn + '<button class="btn-sm" onclick="cetakLabelQR(\'' + p.barcode + '\')">🏷️ Label</button>';
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

// ========== CETAK LABEL (Direct PPLB or PDF Fallback) ==========
async function cetakLabelQR(barcode) {
  if (!labelPrinterDevice || !labelPrinterCharacteristic) {
    // Fallback: show PDF if no label printer connected
    var product = await getProductByBarcode(barcode);
    if (!product) return alert('Produk tidak ditemukan');
    
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(barcode);
    var nama = product.nama || 'Produk';
    var harga = 'Rp ' + (product.harga_jual || 0).toLocaleString('id');
    
    var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: [33, 15] });
    var qrImage = new Image();
    qrImage.crossOrigin = 'Anonymous';
    qrImage.onload = function() {
      doc.addImage(qrImage, 'PNG', 2, 2, 9, 9);
      doc.setFontSize(5);
      doc.text(doc.splitTextToSize(nama, 23), 12, 3);
      doc.setFontSize(6);
      doc.setFont(undefined, 'bold');
      doc.text(harga, 12, 9);
      doc.setFontSize(3);
      doc.setFont(undefined, 'normal');
      doc.text(barcode, 2, 12);
      doc.setFontSize(2);
      doc.text(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), 12, 12);
      window.open(URL.createObjectURL(doc.output('blob')), '_blank');
    };
    qrImage.onerror = function() { alert('Gagal memuat QR code.'); };
    qrImage.src = qrUrl;
    return;
  }
  
  // Direct print to label printer via PPLB
  await cetakLabelLangsung(barcode);
}