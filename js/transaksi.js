// ===================== TRANSAKSI.JS =====================
let cart = [];
let searchTimer = null;
let appSettings = {};
let isAdmin = false;
let totalDiskonValue = 0;
let bayarValue = 0;
let cachedSettings = null;

async function setupTransaksi() {
  const role = currentUser ? currentUser.role : 'kasir';
  isAdmin = role === 'admin';
  const isKasir = role === 'kasir';
  const isStaff = role === 'staff';
  const isGudang = role === 'gudang';

  try {
    if (cachedSettings) { appSettings = cachedSettings; }
    else { appSettings = await getSettings(); cachedSettings = appSettings; }
  } catch (e) { console.warn('Gagal ambil settings:', e); appSettings = { diskon_item_enabled: true, diskon_total_enabled: true }; }

  const staticTotalBox = document.querySelector('#page-transaksi .total-box');
  if (staticTotalBox) staticTotalBox.remove();
  document.querySelectorAll('#totalCart').forEach(el => el.remove());
  const oldPembayaranGroup = document.getElementById('pembayaranGroup');
  if (oldPembayaranGroup) oldPembayaranGroup.style.display = 'none';
  const oldKembalian = document.querySelector('#page-transaksi #kembalian');
  if (oldKembalian && oldKembalian.parentElement) oldKembalian.parentElement.style.display = 'none';
  const oldNominal = document.getElementById('nominalButtons');
  if (oldNominal) oldNominal.remove();

  let summaryContainer = document.getElementById('summaryContainer');
  if (!summaryContainer) {
    summaryContainer = document.createElement('div');
    summaryContainer.id = 'summaryContainer';
    summaryContainer.style.cssText = 'background: #f0f4f8; padding: 12px; border-radius: 8px; margin-top: 8px;';
    const cartTable = document.getElementById('cartTable');
    cartTable.parentNode.insertBefore(summaryContainer, cartTable.nextSibling);
    summaryContainer.innerHTML = '<div id="diskonContainer"></div><div id="pembayaranSummary" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid #d0d8e0; padding-top:8px;"><div><strong style="font-size:16px;">PEMBAYARAN:</strong><button class="btn btn-tunai" id="btnTunai" onclick="bukaPopupTunai()">TUNAI</button></div><div style="text-align:right;"><div style="font-weight:bold;">BAYAR: Rp <span id="bayarDisplay">0</span></div><div style="font-weight:bold;">Kembalian: Rp <span id="kembalianDisplay">0</span></div></div></div>';
  }

  bayarValue = 0; updateBayarDisplay();

  document.getElementById('scanInputTrans').onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); const b = e.target.value.trim(); if (b) { e.target.value = ''; tambahProdukDariScan(b); } }
  };

  const searchInput = document.getElementById('searchProduct');
  if (searchInput) { searchInput.oninput = () => searchProductFn(searchInput.value); searchInput.onfocus = () => searchProductFn(searchInput.value); }

  // Show/hide buttons based on role
  const btnSimpan = document.querySelector('button[onclick="simpanPesanan()"]');
  const btnPesanan = document.querySelector('button[onclick="tampilkanPesananTersimpan()"]');
  const btnBayar = document.querySelector('button[onclick="bayarDanCetak()"]');
  const pembayaranSummary = document.getElementById('pembayaranSummary');

  if (isGudang) {
    // Gudang: no transaction access
    if (btnSimpan) btnSimpan.style.display = 'none';
    if (btnPesanan) btnPesanan.style.display = 'none';
    if (btnBayar) btnBayar.style.display = 'none';
    if (pembayaranSummary) pembayaranSummary.style.display = 'none';
  } else if (isStaff) {
    // Staff: save & recall, no payment
    if (btnSimpan) btnSimpan.style.display = '';
    if (btnPesanan) btnPesanan.style.display = '';
    if (btnBayar) btnBayar.style.display = 'none';
    if (pembayaranSummary) pembayaranSummary.style.display = 'none';
  } else if (isKasir) {
    // Kasir: all transaction features
    if (btnSimpan) btnSimpan.style.display = '';
    if (btnPesanan) btnPesanan.style.display = '';
    if (btnBayar) btnBayar.style.display = '';
    if (pembayaranSummary) pembayaranSummary.style.display = '';
  } else if (isAdmin) {
    // Admin: everything
    if (btnSimpan) btnSimpan.style.display = '';
    if (btnPesanan) btnPesanan.style.display = '';
    if (btnBayar) btnBayar.style.display = '';
    if (pembayaranSummary) pembayaranSummary.style.display = '';
  }

  totalDiskonValue = 0; renderCart();
}

function updateBayarDisplay() { const d = document.getElementById('bayarDisplay'); if (d) d.textContent = bayarValue.toLocaleString('id'); hitungKembalian(); }

function bukaPopupTunai() {
  const modal = document.createElement('div'); modal.id = 'popupTunaiModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:8px;width:300px;text-align:center;"><h3>Pembayaran Tunai</h3><div id="popupNominalGrid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">' + [100000,50000,20000,10000,5000,2000,1000,500,200].map(n => '<button class="nominal-btn-popup" onclick="tambahNominalPopup(' + n + ')">Rp ' + n.toLocaleString('id') + '</button>').join('') + '</div><input type="number" id="inputBayarPopup" value="' + bayarValue + '" placeholder="0" style="width:100%;padding:8px;box-sizing:border-box;text-align:right;" onfocus="this.select()"><div style="margin-top:10px;"><button id="btnSimpanTunai" class="btn-sm">Simpan</button><button id="btnBatalTunai" class="btn-sm btn-danger">Batal</button></div></div>';
  document.body.appendChild(modal);
  document.getElementById('btnSimpanTunai').onclick = () => { const n = parseInt(document.getElementById('inputBayarPopup').value) || 0; if (n < 0) { alert('Nilai tidak boleh negatif'); return; } bayarValue = n; updateBayarDisplay(); document.body.removeChild(modal); };
  document.getElementById('btnBatalTunai').onclick = () => document.body.removeChild(modal);
  setTimeout(() => document.getElementById('inputBayarPopup').focus(), 100);
}

function tambahNominalPopup(n) { const i = document.getElementById('inputBayarPopup'); i.value = (parseInt(i.value) || 0) + n; }

function searchProductFn(query) {
  clearTimeout(searchTimer); const div = document.getElementById('searchResults'); if (!div) return;
  if (!query || query.length < 2) { div.style.display = 'none'; return; }
  searchTimer = setTimeout(async () => {
    const q = query.trim();
    try {
      const { data, error } = await supabaseClient.from('products').select('*').or('nama.ilike.%' + q + '%,barcode.ilike.%' + q + '%,kategori.ilike.%' + q + '%').order('nama').limit(15);
      if (error) { div.innerHTML = '<div class="search-item">Gagal mencari</div>'; div.style.display = 'block'; return; }
      if (!data || data.length === 0) { div.innerHTML = '<div class="search-item">Tidak ditemukan</div>'; div.style.display = 'block'; return; }
      div.innerHTML = data.map(p => '<div class="search-item" data-barcode="' + p.barcode + '">' + (p.foto ? '<img src="' + p.foto + '" class="search-item-img">' : '<div class="search-item-img" style="background:#e0e0e0;">📦</div>') + '<div><strong>' + p.nama + '</strong><br><small>' + p.barcode + ' | Stok:' + p.stok + ' | Rp' + (p.harga_jual||0).toLocaleString('id') + '</small></div></div>').join('');
      div.style.display = 'block';
      div.querySelectorAll('.search-item[data-barcode]').forEach(item => { item.onclick = () => { div.style.display = 'none'; document.getElementById('searchProduct').value = ''; tambahProdukKeCart(item.dataset.barcode); }; });
    } catch (err) { div.innerHTML = '<div class="search-item">Terjadi kesalahan</div>'; div.style.display = 'block'; }
  }, 300);
}

document.addEventListener('click', e => { const s = document.getElementById('searchProduct'), r = document.getElementById('searchResults'); if (s && r && e.target !== s && !r.contains(e.target)) r.style.display = 'none'; });

async function tambahProdukDariScan(barcode) {
  let clean = barcode.replace(/[^a-zA-Z0-9\-_]/g, ''); if (!clean) return;
  let product = await getProductByBarcode(clean);
  if (!product) { const { data } = await supabaseClient.from('products').select('*').or('barcode.ilike.%' + clean + '%,nama.ilike.%' + clean + '%').limit(1); product = data?.[0] || null; }
  if (!product) { alert('Produk "' + clean + '" tidak ditemukan.'); return; }
  if (product.stok <= 0) { alert('Stok "' + product.nama + '" habis.'); return; }
  const minStok = product.min_stok || 10;
  if (product.stok <= minStok) { alert('⚠️ Stok "' + product.nama + '" tinggal ' + product.stok + '!\nMinimum stok: ' + minStok + '\nSegera lakukan pembelian stok.'); }
  const existing = cart.find(i => i.barcode === product.barcode);
  if (existing) {
    if (existing.qty < product.stok) { existing.qty++; existing.harga = calculateGrosirPrice(product, existing.qty); existing.isGrosir = existing.harga < existing.hargaAsli; existing.diskon = 0; }
    else { alert('Stok tidak mencukupi'); return; }
  } else {
    const hg = calculateGrosirPrice(product, 1);
    cart.push({ barcode: product.barcode, nama: product.nama, harga: hg, hargaAsli: product.harga_jual || 0, qty: 1, stok: product.stok || 0, diskon: 0, isGrosir: hg < (product.harga_jual || 0), diskon_persen: product.diskon_persen || 0, diskon_min_qty: product.diskon_min_qty || 0 });
  }
  renderCart();
}

function tambahProdukKeCart(barcode) { tambahProdukDariScan(barcode); }

function calculateGrosirPrice(product, qty) {
  const hn = product.harga_jual || product.hargaAsli || 0;
  const dp = product.diskon_persen || 0; const mq = product.diskon_min_qty || 0;
  if (dp > 0 && mq > 0 && qty >= mq) { return hn - Math.round((dp / 100) * hn); }
  return hn;
}

function editDiskonItem(index) {
  if (!isAdmin) { alert('Hanya admin yang dapat mengubah diskon.'); return; }
  const item = cart[index];
  const d = prompt('Diskon untuk ' + item.nama + ' (Rp ' + item.harga.toLocaleString('id') + ')\nMasukkan nilai diskon (akhiri dengan % untuk persen, atau angka untuk nominal):', item.diskon || '0');
  if (d === null) return;
  let nilai = 0;
  if (d.endsWith('%')) { const p = parseFloat(d); if (isNaN(p)) return alert('Persentase tidak valid'); nilai = Math.round((p / 100) * item.harga * item.qty); }
  else { nilai = parseInt(d) || 0; }
  item.diskon = Math.max(0, Math.min(nilai, item.harga * item.qty));
  renderCart();
}

function bukaPopupDiskonTotal() {
  if (!isAdmin) return;
  const modal = document.createElement('div'); modal.id = 'popupDiskonModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:8px;width:300px;text-align:center;"><h3>Diskon Tambahan</h3><input type="text" id="inputDiskonPopup" placeholder="Nominal atau persen (contoh: 5000 atau 10%)" style="width:100%;padding:8px;box-sizing:border-box;"><div style="margin-top:10px;"><button id="btnSimpanDiskon" class="btn-sm">Simpan</button><button id="btnBatalDiskon" class="btn-sm btn-danger">Batal</button></div></div>';
  document.body.appendChild(modal);
  document.getElementById('btnSimpanDiskon').onclick = () => {
    const input = document.getElementById('inputDiskonPopup').value.trim(); let nilai = 0;
    if (input.endsWith('%')) { const p = parseFloat(input); if (isNaN(p)) { alert('Persentase tidak valid'); return; } const s1 = cart.reduce((sum, item) => sum + (item.harga * item.qty) - (item.diskon || 0), 0); nilai = Math.round((p / 100) * s1); }
    else { nilai = parseInt(input) || 0; }
    if (nilai < 0) nilai = 0;
    totalDiskonValue = nilai; document.body.removeChild(modal); renderCart();
  };
  document.getElementById('btnBatalDiskon').onclick = () => document.body.removeChild(modal);
}

function renderCart() {
  const tbody = document.querySelector('#cartTable tbody'); tbody.innerHTML = '';
  let subtotalItemNetto = 0;
  cart.forEach((item, idx) => {
    const sub = item.harga * item.qty; const diskon = item.diskon || 0; const netto = sub - diskon; subtotalItemNetto += netto;
    const row = tbody.insertRow();
    row.innerHTML = '<td>' + item.nama + '</td><td>' + (item.isGrosir ? '<span style="color:#e53935;font-size:11px;font-weight:bold;">HARGA GROSIR</span><br>' : '') + 'Rp' + item.harga.toLocaleString('id') + (item.isGrosir ? '<br><small style="color:#999;text-decoration:line-through;">Rp' + item.hargaAsli.toLocaleString('id') + '</small>' : '') + '</td><td><div class="qty-control"><button onclick="changeQty(' + idx + ',-1)">−</button><input type="number" min="1" value="' + item.qty + '" onchange="updateQty(' + idx + ',this.value)" style="width:50px"><button onclick="changeQty(' + idx + ',1)">+</button></div></td><td>Rp' + sub.toLocaleString('id') + (diskon > 0 ? '<br><small style="color:#e53935;">Diskon: -Rp' + diskon.toLocaleString('id') + '</small>' : '') + '</td><td>' + (isAdmin ? '<button class="btn-sm" onclick="editDiskonItem(' + idx + ')" title="Diskon">💲</button>' : '') + '<button class="btn-sm" onclick="lihatDetailProduk(\'' + item.barcode + '\')">ℹ️</button><button class="btn-sm btn-danger" onclick="hapusCartItem(' + idx + ')">✕</button></td>';
  });
  const diskonContainer = document.getElementById('diskonContainer'); if (!diskonContainer) return;
  if (totalDiskonValue > subtotalItemNetto) totalDiskonValue = subtotalItemNetto;
  const total = subtotalItemNetto - totalDiskonValue;
  if (isAdmin) {
    diskonContainer.innerHTML = '<div style="text-align:right;font-size:14px;"><div><strong>SUBTOTAL: Rp<span id="subtotal1Display">' + subtotalItemNetto.toLocaleString('id') + '</span></strong></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;"><button class="btn-sm" style="background:#ff9800;color:white;border:none;font-weight:bold;" onclick="bukaPopupDiskonTotal()">💲 Diskon Lagi</button>' + (totalDiskonValue > 0 ? '<span style="color:#e53935;font-weight:bold;">-Rp' + totalDiskonValue.toLocaleString('id') + '</span>' : '<span></span>') + '</div><div style="margin-top:6px;font-size:16px;font-weight:bold;">TOTAL: Rp<span id="totalCart">' + total.toLocaleString('id') + '</span></div></div>';
  } else {
    diskonContainer.innerHTML = '<div style="text-align:right;font-size:16px;font-weight:bold;">TOTAL: Rp<span id="totalCart">' + subtotalItemNetto.toLocaleString('id') + '</span></div>';
  }
  hitungKembalian();
}

function changeQty(i, d) { let q = cart[i].qty + d; if (q < 1) q = 1; if (q > cart[i].stok) { alert('Stok tidak cukup'); q = cart[i].stok; } cart[i].qty = q; cart[i].harga = calculateGrosirPrice(cart[i], q); cart[i].isGrosir = cart[i].harga < cart[i].hargaAsli; cart[i].diskon = 0; renderCart(); }
function updateQty(i, q) { q = parseInt(q) || 1; if (q > cart[i].stok) { alert('Stok tidak cukup'); q = cart[i].stok; } cart[i].qty = q; cart[i].harga = calculateGrosirPrice(cart[i], q); cart[i].isGrosir = cart[i].harga < cart[i].hargaAsli; cart[i].diskon = 0; renderCart(); }
function hapusCartItem(i) { cart.splice(i, 1); renderCart(); }

function hitungKembalian() { const t = parseInt((document.getElementById('totalCart')?.textContent || '0').replace(/\D/g, '')) || 0; const el = document.getElementById('kembalianDisplay'); if (el) el.textContent = Math.max(0, bayarValue - t).toLocaleString('id'); }

async function bayarDanCetak() {
  const role = currentUser ? currentUser.role : '';
  if (role !== 'admin' && role !== 'kasir') { alert('Anda tidak memiliki akses untuk pembayaran.'); return; }
  if (!cart.length) { alert('Keranjang kosong'); return; }
  const cust = document.getElementById('custName').value.trim();
  for (let item of cart) { const { data: cur } = await supabaseClient.from('products').select('stok').eq('barcode', item.barcode).single(); if (!cur || cur.stok < item.qty) { alert('Stok "' + item.nama + '" tidak mencukupi!\nTersedia: ' + (cur?.stok || 0) + '\nDiminta: ' + item.qty); return; } }
  const subtotal1 = cart.reduce((sum, item) => sum + (item.harga * item.qty) - (item.diskon || 0), 0);
  const grandTotal = subtotal1 - totalDiskonValue;
  if (bayarValue < grandTotal) { alert('Pembayaran kurang'); return; }
  const kembali = bayarValue - grandTotal;
  const now = new Date();
  const no = 'INV-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + now.toTimeString().slice(0,8).replace(/:/g,'');
  const items = cart.map(i => ({ barcode: i.barcode, nama: i.nama, harga: i.harga, qty: i.qty, subtotal: i.harga * i.qty, diskon: i.diskon || 0, netto: (i.harga * i.qty) - (i.diskon || 0) }));
  try {
    for (let i of cart) { const { data: prod } = await supabaseClient.from('products').select('stok').eq('barcode', i.barcode).single(); if (prod) { await supabaseClient.from('products').update({ stok: Math.max(0, prod.stok - i.qty) }).eq('barcode', i.barcode); } }
    await insertTransaction({ no_invoice: no, tanggal: now.toISOString(), customer: cust, items, total: grandTotal, bayar: bayarValue, kembali });
    const toko = appSettings; const lk = parseInt(toko.kertas_lebar) || 80;
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: [lk, 80] }); let y = 8;
    doc.setFontSize(9); doc.text(toko.nama || 'TOKO', 3, y); doc.setFontSize(7); y += 5;
    if (toko.alamat) { doc.text(toko.alamat, 3, y); y += 5; }
    doc.text('No: ' + no, 3, y); y += 5; doc.text('Tanggal: ' + now.toLocaleString('id-ID'), 3, y); y += 5;
    doc.text('Customer: ' + (cust || '-'), 3, y); y += 8;
    doc.text('Item', 3, y); doc.text('Qty', 35, y); doc.text('Harga', 50, y); doc.text('Subtotal', 70, y); y += 4; doc.line(3, y, 77, y); y += 3;
    cart.forEach(i => { doc.text(i.nama, 3, y, { maxWidth: 30 }); doc.text(i.qty.toString(), 35, y); doc.text('Rp' + i.harga.toLocaleString('id'), 50, y); doc.text('Rp' + (i.harga * i.qty).toLocaleString('id'), 70, y); y += 5; });
    doc.line(3, y, 77, y); y += 4; doc.text('TOTAL: Rp' + grandTotal.toLocaleString('id'), 3, y); y += 5;
    doc.text('Bayar: Rp' + bayarValue.toLocaleString('id'), 3, y); y += 5; doc.text('Kembali: Rp' + kembali.toLocaleString('id'), 3, y);
    const pdfBlob = doc.output('blob'); await uploadInvoicePDF(no, pdfBlob);
    if (bluetoothDevice && bluetoothCharacteristic) { const ts = buatStrukTeks(cart, subtotal1, totalDiskonValue, grandTotal, bayarValue, kembali, toko, no, cust); await cetakStrukKePrinter(toko.logo || null, ts); }
    else { window.open(URL.createObjectURL(pdfBlob), '_blank'); }
    cart = []; totalDiskonValue = 0; bayarValue = 0; updateBayarDisplay(); renderCart(); document.getElementById('custName').value = '';
    alert('✅ Berhasil!\nNo: ' + no + '\nTotal: Rp' + grandTotal.toLocaleString('id') + '\nKembali: Rp' + kembali.toLocaleString('id'));
  } catch (e) { alert('❌ Gagal: ' + e.message); }
}

function buatStrukTeks(cart, s1, td, gt, b, k, toko, no, cust) {
  const cw = 48; let t = ''; t += (toko.nama || 'TOKO') + '\n'; if (toko.alamat) t += toko.alamat + '\n';
  t += 'No: ' + no + '\nCustomer: ' + (cust || '-') + '\n' + '-'.repeat(cw) + '\n';
  cart.forEach(i => { t += i.nama + ' x' + i.qty + ' @Rp' + i.harga.toLocaleString('id') + ' = Rp' + (i.harga * i.qty).toLocaleString('id') + '\n'; if (i.diskon) t += '  Diskon: -Rp' + i.diskon.toLocaleString('id') + '\n'; });
  t += '-'.repeat(cw) + '\nTOTAL: Rp' + gt.toLocaleString('id') + '\nBayar: Rp' + b.toLocaleString('id') + '\nKembali: Rp' + k.toLocaleString('id') + '\n';
  if (toko.footer) t += '\n' + toko.footer + '\n';
  t += '='.repeat(cw) + '\n'; return t;
}

function lihatDetailProduk(barcode) {
  (async () => { const p = await getProductByBarcode(barcode); if (!p) return alert('Produk tidak ditemukan');
    document.getElementById('detailNama').textContent = p.nama || ''; document.getElementById('detailBarcode').textContent = p.barcode || '';
    document.getElementById('detailKategori').textContent = p.kategori || '-'; document.getElementById('detailKeterangan').textContent = p.keterangan || '-';
    document.getElementById('detailHargaJual').textContent = 'Rp' + (p.harga_jual || 0).toLocaleString('id'); document.getElementById('detailStok').textContent = p.stok || 0;
    const img = document.getElementById('detailFoto'); if (p.foto) { img.src = p.foto; img.style.display = 'block'; } else img.style.display = 'none';
    document.getElementById('productDetailModal').style.display = 'flex';
  })();
}

async function simpanPesanan() {
  if (!cart.length) { alert('Keranjang kosong'); return; }
  const cust = document.getElementById('custName').value.trim(); const now = new Date();
  const no = 'PSN-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + now.toTimeString().slice(0,8).replace(/:/g,'');
  const items = cart.map(i => ({ barcode: i.barcode, nama: i.nama, harga: i.harga, hargaAsli: i.hargaAsli || i.harga, qty: i.qty, isGrosir: i.isGrosir || false, diskon: i.diskon || 0 }));
  const s1 = cart.reduce((sum, item) => sum + (item.harga * item.qty) - (item.diskon || 0), 0); const gt = s1 - totalDiskonValue;
  const { error } = await supabaseClient.from('saved_orders').insert({ no_pesanan: no, customer: cust, items, total: gt, status: 'pending', created_by: currentUser.username });
  if (error) { alert('Gagal menyimpan: ' + error.message); return; }
  cart = []; totalDiskonValue = 0; bayarValue = 0; updateBayarDisplay(); renderCart(); document.getElementById('custName').value = '';
  alert('✅ Pesanan disimpan!\nNo: ' + no + '\nTotal: Rp' + gt.toLocaleString('id'));
}

async function tampilkanPesananTersimpan() {
  const { data: orders, error } = await supabaseClient.from('saved_orders').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (error) { alert('Gagal memuat: ' + error.message); return; }
  const listEl = document.getElementById('pesananList');
  if (!orders || orders.length === 0) { listEl.innerHTML = '<p style="text-align:center;color:#999;">Tidak ada pesanan tersimpan</p>'; }
  else { listEl.innerHTML = orders.map(o => '<div style="border:1px solid #e0e0e0;border-radius:8px;padding:12px;margin-bottom:8px;"><strong>' + o.no_pesanan + '</strong><br><small>' + new Date(o.created_at).toLocaleString('id-ID') + ' | Staff: ' + (o.created_by || '-') + '</small><br><small>Customer: ' + (o.customer || '-') + ' | Total: <b>Rp' + (o.total||0).toLocaleString('id') + '</b></small><div style="margin-top:4px;font-size:12px;color:#666;">' + o.items.map(i => i.nama + ' x' + i.qty).join(', ') + '</div><div style="margin-top:8px;"><button class="btn-sm" onclick="muatPesanan(\'' + o.no_pesanan + '\')">📥 Muat</button><button class="btn-sm btn-danger" onclick="hapusPesanan(\'' + o.no_pesanan + '\')">🗑</button></div></div>').join(''); }
  document.getElementById('pesananModal').style.display = 'flex';
}

async function muatPesanan(noPesanan) {
  const { data: order, error } = await supabaseClient.from('saved_orders').select('*').eq('no_pesanan', noPesanan).single();
  if (error || !order) { alert('Pesanan tidak ditemukan'); return; }
  for (let item of order.items) { const p = await getProductByBarcode(item.barcode); if (!p) { alert('Produk "' + item.nama + '" sudah tidak ada.'); return; } if (p.stok < item.qty) { alert('Stok "' + item.nama + '" tidak cukup!'); return; } }
  cart = []; totalDiskonValue = 0;
  order.items.forEach(item => { cart.push({ barcode: item.barcode, nama: item.nama, harga: item.harga, hargaAsli: item.hargaAsli || item.harga, qty: item.qty, stok: 999, diskon: item.diskon || 0, isGrosir: item.isGrosir || false }); });
  if (order.customer) document.getElementById('custName').value = order.customer;
  renderCart(); document.getElementById('pesananModal').style.display = 'none';
  await supabaseClient.from('saved_orders').delete().eq('no_pesanan', noPesanan);
  alert('✅ Pesanan ' + noPesanan + ' dimuat!\nTotal: Rp' + (order.total||0).toLocaleString('id'));
}

async function hapusPesanan(noPesanan) { if (!confirm('Hapus pesanan ' + noPesanan + '?')) return; await supabaseClient.from('saved_orders').delete().eq('no_pesanan', noPesanan); alert('Pesanan dihapus'); tampilkanPesananTersimpan(); }

function invalidateSettingsCache() { cachedSettings = null; }