// ===================== INVENTORY.JS =====================
function setupInventory() {
  document.getElementById('prodBarcode').onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); cariAtauTambahProduk(); }
  };
}

let currentBarcode = null, fotoDihapus = false;

async function cariAtauTambahProduk() {
  if (!currentUser) return;
  const barcode = document.getElementById('prodBarcode').value.trim(); if (!barcode) return;
  currentBarcode = barcode; document.getElementById('productForm').style.display = 'block'; fotoDihapus = false;
  const product = await getProductByBarcode(barcode);
  const isAdmin = currentUser.role === 'admin';
  const isGudang = currentUser.role === 'gudang';
  const canEdit = isAdmin || isGudang;
  if (product) {
    isiFormProduk(product, false, canEdit, isAdmin);
    if (product.foto) { document.getElementById('fotoPreview').src = product.foto; document.getElementById('fotoPreviewContainer').style.display = 'block'; }
    else document.getElementById('fotoPreviewContainer').style.display = 'none';
  } else {
    if (!canEdit) { alert('Produk tidak ditemukan'); tutupFormProduk(); return; }
    isiFormProduk({ barcode, nama: '', kategori: '', keterangan: '', harga_beli: 0, harga_jual: 0, min_stok: 10, diskon_persen: 0, diskon_min_qty: 0, stok: 0, foto: null }, true, true, isAdmin);
    document.getElementById('fotoPreviewContainer').style.display = 'none';
  }
  if (canEdit) document.getElementById('prodNama').focus();
  else {
    ['prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'prodDiskonPersen', 'prodDiskonMinQty', 'prodMinStok', 'perubahanStok'].forEach(id => document.getElementById(id).readOnly = true);
    document.getElementById('btnSimpanProduk').style.display = 'none';
    document.getElementById('btnHapusProduk').style.display = 'none';
    document.getElementById('btnHapusFoto').style.display = 'none';
    document.getElementById('prodFoto').disabled = true;
  }
}

function previewFoto() {
  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'gudang')) return;
  const f = document.getElementById('prodFoto').files[0];
  if (f) { const reader = new FileReader(); reader.onload = e => { document.getElementById('fotoPreview').src = e.target.result; document.getElementById('fotoPreviewContainer').style.display = 'block'; }; reader.readAsDataURL(f); fotoDihapus = false; }
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
    // Only admin can delete, gudang only edit
    document.getElementById('btnHapusProduk').style.display = (isNew || !isAdmin) ? 'none' : 'inline-block';
    document.getElementById('btnSimpanProduk').style.display = 'inline-block';
    document.getElementById('btnHapusFoto').style.display = 'block';
    ['prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'prodDiskonPersen', 'prodDiskonMinQty', 'prodMinStok', 'perubahanStok', 'prodFoto'].forEach(id => { document.getElementById(id).readOnly = false; document.getElementById(id).disabled = false; });
    document.getElementById('btnSimpanProduk').onclick = async () => {
      if (!currentBarcode) return;
      let foto = produk.foto || null;
      if (fotoDihapus) foto = null;
      else { const fi = document.getElementById('prodFoto'); if (fi.files[0]) foto = await toBase64(fi.files[0]); }
      const data = { barcode: currentBarcode, nama: document.getElementById('prodNama').value.trim(), kategori: document.getElementById('prodKategori').value.trim(), keterangan: document.getElementById('prodKeterangan').value.trim(), harga_beli: parseFloat(document.getElementById('prodHargaBeli').value) || 0, harga_jual: parseFloat(document.getElementById('prodHargaJual').value) || 0, diskon_persen: parseFloat(document.getElementById('prodDiskonPersen').value) || 0, diskon_min_qty: parseInt(document.getElementById('prodDiskonMinQty').value) || 0, min_stok: parseInt(document.getElementById('prodMinStok').value) || 10, stok: (parseInt(document.getElementById('stokSaatIni').textContent) || 0) + (parseInt(document.getElementById('perubahanStok').value) || 0), foto };
      try { await upsertProduct(data); alert('Disimpan'); tutupFormProduk(); refreshProductList(); } catch (e) { alert('Gagal: ' + e.message); }
    };
    document.getElementById('btnHapusProduk').onclick = async () => { if (confirm('Hapus?')) { await deleteProduct(currentBarcode); alert('Dihapus'); tutupFormProduk(); refreshProductList(); } };
  }
}

function tutupFormProduk() {
  document.getElementById('productForm').style.display = 'none'; document.getElementById('prodBarcode').value = ''; document.getElementById('prodBarcode').focus(); currentBarcode = null;
  document.getElementById('fotoPreviewContainer').style.display = 'none'; document.getElementById('prodFoto').value = ''; fotoDihapus = false;
  ['prodNama', 'prodKategori', 'prodKeterangan', 'prodHargaBeli', 'prodHargaJual', 'prodDiskonPersen', 'prodDiskonMinQty', 'prodMinStok', 'perubahanStok', 'prodFoto'].forEach(id => { document.getElementById(id).readOnly = false; document.getElementById(id).disabled = false; });
  document.getElementById('btnSimpanProduk').style.display = 'inline-block'; document.getElementById('btnHapusProduk').style.display = 'none'; document.getElementById('btnHapusFoto').style.display = 'block';
}

function hitungStokAkhir() { const a = parseInt(document.getElementById('stokSaatIni').textContent) || 0, b = parseInt(document.getElementById('perubahanStok').value) || 0; document.getElementById('stokAkhir').textContent = a + b; }

function renderProductTable(products) {
  const tbody = document.querySelector('#productListTable tbody');
  tbody.innerHTML = '';
  document.getElementById('productCount').textContent = products.length;
  if (!products.length) { tbody.innerHTML = '<tr><td colspan="8">Tidak ada produk</td></tr>'; return; }
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isGudang = currentUser && currentUser.role === 'gudang';
  const canEdit = isAdmin || isGudang;
  document.getElementById('thAksi').style.display = canEdit ? '' : 'none';
  products.forEach(p => {
    const row = tbody.insertRow();
    const minStok = p.min_stok || 10;
    const isLowStock = (p.stok || 0) <= minStok;
    if (isLowStock) row.style.background = '#fff3e0';
    const stokStyle = isLowStock ? 'color:#e53935; font-weight:bold;' : 'color:#333;';
    const stokDisplay = (p.stok || 0) + (isLowStock ? ' ⚠️' : '');
    const grosirInfo = (p.diskon_persen > 0 && p.diskon_min_qty > 0) ? '<br><small style="color:#e53935; font-weight:bold;">🔥 Grosir ' + p.diskon_persen + '% min ' + p.diskon_min_qty + 'pcs</small>' : '';
    const namaCell = '<td style="display:flex;align-items:center;gap:6px;">' + (p.foto ? '<img src="' + p.foto + '" style="width:30px;height:30px;border-radius:4px;object-fit:cover;">' : '<div style="width:30px;height:30px;background:#e0e0e0;border-radius:4px;display:flex;align-items:center;justify-content:center;">📦</div>') + '<div>' + (p.nama || '') + grosirInfo + '</div></td>';
    // Edit button for admin & gudang, delete only for admin
    const editBtn = canEdit ? '<button class="btn-sm" onclick="editProdukDariDaftar(\'' + p.barcode + '\')">✏️</button> ' : '';
    const deleteBtn = isAdmin ? '<button class="btn-sm btn-danger" onclick="hapusProdukDariDaftar(\'' + p.barcode + '\')">🗑</button> ' : '';
    const aksi = editBtn + deleteBtn + '<button class="btn-sm" onclick="cetakLabelQR(\'' + p.barcode + '\')">🏷️ QR</button>';
    row.innerHTML = '<td>' + (p.barcode || '') + '</td>' + namaCell + '<td>' + (p.kategori || '-') + '</td><td>' + (p.keterangan || '-') + '</td><td>Rp' + (p.harga_jual || 0).toLocaleString('id') + '</td><td style="' + stokStyle + '">' + stokDisplay + '</td><td>' + aksi + '</td>';
  });
}

async function refreshProductList() {
  try { const all = await getAllProducts(); renderProductTable(all); document.getElementById('invSearch').value = ''; }
  catch (e) { console.error(e); document.querySelector('#productListTable tbody').innerHTML = '<tr><td colspan="8">Gagal memuat data</td></tr>'; }
}

let filterTimer = null;
function filterProductList() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(async () => {
    const query = document.getElementById('invSearch')?.value.trim();
    if (!query) { await refreshProductList(); return; }
    try {
      const { data, error } = await supabaseClient.from('products').select('*').or('nama.ilike.%' + query + '%,barcode.ilike.%' + query + '%,kategori.ilike.%' + query + '%').order('nama').limit(50);
      if (error) throw error;
      renderProductTable(data || []);
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
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = ('0' + (now.getMonth() + 1)).slice(-2);
  const d = ('0' + now.getDate()).slice(-2);
  const h = ('0' + now.getHours()).slice(-2);
  const i = ('0' + now.getMinutes()).slice(-2);
  const s = ('0' + now.getSeconds()).slice(-2);
  document.getElementById('prodBarcode').value = y + m + d + h + i + s;
  cariAtauTambahProduk();
}

async function cetakLabelQR(barcode) {
  const product = await getProductByBarcode(barcode);
  if (!product) return alert('Produk tidak ditemukan');
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(barcode);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [33, 15] });
  const qrImage = new Image(); qrImage.crossOrigin = 'Anonymous';
  qrImage.onload = () => {
    doc.addImage(qrImage, 'PNG', 2, 2, 9, 9);
    doc.setFontSize(5); doc.text(doc.splitTextToSize(product.nama || 'Produk', 23), 12, 3);
    doc.setFontSize(6); doc.setFont(undefined, 'bold'); doc.text('Rp ' + (product.harga_jual || 0).toLocaleString('id'), 12, 9);
    doc.setFontSize(3); doc.setFont(undefined, 'normal'); doc.text(barcode, 2, 12);
    doc.setFontSize(2); doc.text(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), 12, 12);
    window.open(URL.createObjectURL(doc.output('blob')), '_blank');
  };
  qrImage.onerror = () => alert('Gagal memuat QR code.');
  qrImage.src = qrUrl;
}