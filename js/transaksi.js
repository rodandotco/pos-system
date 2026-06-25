// ===================== TRANSAKSI.JS =====================
var cart = [];
var searchTimer = null;
var appSettings = {};
var isAdmin = false;
var totalDiskonValue = 0;
var bayarValue = 0;
var cachedSettings = null;
var currentPesananNo = null;

async function setupTransaksi() {
  var role = currentUser ? currentUser.role : 'kasir';
  isAdmin = (role === 'admin');
  var isKasir = (role === 'kasir');
  var isStaff = (role === 'staff');
  var isGudang = (role === 'gudang');

  try {
    if (cachedSettings) {
      appSettings = cachedSettings;
    } else {
      appSettings = await getSettings();
      cachedSettings = appSettings;
    }
  } catch (e) {
    appSettings = { diskon_item_enabled: true, diskon_total_enabled: true };
  }

  var el = document.querySelector('#page-transaksi .total-box');
  if (el) el.remove();
  document.querySelectorAll('#totalCart').forEach(function(x) { x.remove(); });

  el = document.getElementById('pembayaranGroup');
  if (el) el.style.display = 'none';
  el = document.querySelector('#page-transaksi #kembalian');
  if (el && el.parentElement) el.parentElement.style.display = 'none';
  el = document.getElementById('nominalButtons');
  if (el) el.remove();

  var summaryContainer = document.getElementById('summaryContainer');
  if (!summaryContainer) {
    summaryContainer = document.createElement('div');
    summaryContainer.id = 'summaryContainer';
    summaryContainer.style.cssText = 'background: #f0f4f8; padding: 12px; border-radius: 8px; margin-top: 8px;';
    var cartTable = document.getElementById('cartTable');
    cartTable.parentNode.insertBefore(summaryContainer, cartTable.nextSibling);
    summaryContainer.innerHTML = '<div id="diskonContainer"></div><div id="pembayaranSummary" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid #d0d8e0; padding-top:8px;"><div><strong style="font-size:16px;">PEMBAYARAN:</strong><button class="btn btn-tunai" id="btnTunai" onclick="bukaPopupTunai()">TUNAI</button></div><div style="text-align:right;"><div style="font-weight:bold;">BAYAR: Rp <span id="bayarDisplay">0</span></div><div style="font-weight:bold;">Kembalian: Rp <span id="kembalianDisplay">0</span></div></div></div>';
  }

  bayarValue = 0;
  updateBayarDisplay();

  document.getElementById('scanInputTrans').onkeydown = function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      var b = e.target.value.trim();
      if (b) {
        e.target.value = '';
        tambahProdukDariScan(b);
      }
    }
  };

  var searchInput = document.getElementById('searchProduct');
  if (searchInput) {
    searchInput.oninput = function() { searchProductFn(searchInput.value); };
    searchInput.onfocus = function() { searchProductFn(searchInput.value); };
  }

  var btnSimpan = document.querySelector('button[onclick="simpanPesanan()"]');
  var btnPesanan = document.querySelector('button[onclick="tampilkanPesananTersimpan()"]');
  var btnBayar = document.querySelector('button[onclick="bayarDanCetak()"]');
  var pembayaranSummary = document.getElementById('pembayaranSummary');

  if (isGudang) {
    if (btnSimpan) btnSimpan.style.display = 'none';
    if (btnPesanan) btnPesanan.style.display = 'none';
    if (btnBayar) btnBayar.style.display = 'none';
    if (pembayaranSummary) pembayaranSummary.style.display = 'none';
  } else if (isStaff) {
    if (btnSimpan) btnSimpan.style.display = '';
    if (btnPesanan) btnPesanan.style.display = '';
    if (btnBayar) btnBayar.style.display = 'none';
    if (pembayaranSummary) pembayaranSummary.style.display = 'none';
  } else if (isKasir) {
    if (btnSimpan) btnSimpan.style.display = '';
    if (btnPesanan) btnPesanan.style.display = '';
    if (btnBayar) btnBayar.style.display = '';
    if (pembayaranSummary) pembayaranSummary.style.display = '';
  } else if (isAdmin) {
    if (btnSimpan) btnSimpan.style.display = '';
    if (btnPesanan) btnPesanan.style.display = '';
    if (btnBayar) btnBayar.style.display = '';
    if (pembayaranSummary) pembayaranSummary.style.display = '';
  }

  totalDiskonValue = 0;
  renderCart();
}

function updateBayarDisplay() {
  var d = document.getElementById('bayarDisplay');
  if (d) d.textContent = bayarValue.toLocaleString('id');
  hitungKembalian();
}

function bukaPopupTunai() {
  var modal = document.createElement('div');
  modal.id = 'popupTunaiModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  var html = '<div style="background:#fff;padding:20px;border-radius:8px;width:320px;text-align:center;"><h3>Pembayaran Tunai</h3><div id="popupNominalGrid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
  [100000,50000,20000,10000,5000,2000,1000,500,200].forEach(function(n) { html += '<button class="nominal-btn-popup" onclick="tambahNominalPopup(' + n + ')">Rp ' + n.toLocaleString('id') + '</button>'; });
  html += '</div><input type="number" id="inputBayarPopup" value="' + bayarValue + '" placeholder="0" style="width:100%;padding:10px;font-size:18px;box-sizing:border-box;text-align:right;" onfocus="this.select()"><div style="margin-top:10px;"><button id="btnSimpanTunai" class="btn-sm">Simpan</button><button id="btnBatalTunai" class="btn-sm btn-danger">Batal</button></div></div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);
  document.getElementById('btnSimpanTunai').onclick = function() { var n = parseInt(document.getElementById('inputBayarPopup').value) || 0; if (n < 0) { alert('Nilai tidak boleh negatif'); return; } bayarValue = n; updateBayarDisplay(); document.body.removeChild(modal); };
  document.getElementById('btnBatalTunai').onclick = function() { document.body.removeChild(modal); };
  setTimeout(function() { document.getElementById('inputBayarPopup').focus(); }, 100);
}

function tambahNominalPopup(n) { var i = document.getElementById('inputBayarPopup'); i.value = (parseInt(i.value) || 0) + n; }

function searchProductFn(query) {
  clearTimeout(searchTimer);
  var div = document.getElementById('searchResults');
  if (!div) return;
  if (!query || query.length < 2) { div.style.display = 'none'; return; }
  searchTimer = setTimeout(async function() {
    var q = query.trim();
    try {
      var result = await supabaseClient.from('products').select('*').or('nama.ilike.%' + q + '%,barcode.ilike.%' + q + '%,kategori.ilike.%' + q + '%').order('nama').limit(15);
      if (result.error) { div.innerHTML = '<div class="search-item">Gagal mencari</div>'; div.style.display = 'block'; return; }
      var data = result.data;
      if (!data || data.length === 0) { div.innerHTML = '<div class="search-item">Tidak ditemukan</div>'; div.style.display = 'block'; return; }
      var html = '';
      data.forEach(function(p) { html += '<div class="search-item" data-barcode="' + p.barcode + '">' + (p.foto ? '<img src="' + p.foto + '" class="search-item-img">' : '<div class="search-item-img" style="background:#e0e0e0;">📦</div>') + '<div><strong>' + p.nama + '</strong><br><small>' + p.barcode + ' | Stok:' + p.stok + ' | Rp' + (p.harga_jual || 0).toLocaleString('id') + '</small></div></div>'; });
      div.innerHTML = html; div.style.display = 'block';
      div.querySelectorAll('.search-item[data-barcode]').forEach(function(item) { item.onclick = function() { div.style.display = 'none'; document.getElementById('searchProduct').value = ''; tambahProdukKeCart(item.dataset.barcode); }; });
    } catch (err) { div.innerHTML = '<div class="search-item">Terjadi kesalahan</div>'; div.style.display = 'block'; }
  }, 300);
}

document.addEventListener('click', function(e) { var s = document.getElementById('searchProduct'), r = document.getElementById('searchResults'); if (s && r && e.target !== s && !r.contains(e.target)) r.style.display = 'none'; });

async function tambahProdukDariScan(barcode) {
  var clean = barcode.replace(/[^a-zA-Z0-9\-_]/g, ''); if (!clean) return;
  var product = await getProductByBarcode(clean);
  if (!product) { var r = await supabaseClient.from('products').select('*').or('barcode.ilike.%' + clean + '%,nama.ilike.%' + clean + '%').limit(1); product = r.data ? r.data[0] : null; }
  if (!product) { alert('Produk "' + clean + '" tidak ditemukan.'); return; }
  if (product.stok <= 0) { alert('Stok "' + product.nama + '" habis.'); return; }
  var minStok = product.min_stok || 10;
  if (product.stok <= minStok) { alert('Stok "' + product.nama + '" tinggal ' + product.stok + '! Minimum stok: ' + minStok); }
  var existing = null;
  for (var i = 0; i < cart.length; i++) { if (cart[i].barcode === product.barcode) { existing = cart[i]; break; } }
  if (existing) {
    if (existing.qty < product.stok) { existing.qty++; existing.harga = calculateGrosirPrice(product, existing.qty); existing.isGrosir = existing.harga < existing.hargaAsli; existing.diskon = 0; }
    else { alert('Stok tidak mencukupi'); return; }
  } else {
    var hg = calculateGrosirPrice(product, 1);
    cart.push({ barcode: product.barcode, nama: product.nama, harga: hg, hargaAsli: product.harga_jual || 0, qty: 1, stok: product.stok || 0, diskon: 0, isGrosir: hg < (product.harga_jual || 0) });
  }
  renderCart();
}
function tambahProdukKeCart(barcode) { tambahProdukDariScan(barcode); }

function calculateGrosirPrice(product, qty) { var hn = product.hargaAsli || product.harga_jual || 0; var dp = product.diskon_persen || 0; var mq = product.diskon_min_qty || 0; if (dp > 0 && mq > 0 && qty >= mq) { return hn - Math.round((dp / 100) * hn); } return hn; }

function editDiskonItem(index) {
  if (!isAdmin) { alert('Hanya admin yang dapat mengubah diskon.'); return; }
  var item = cart[index];
  var d = prompt('Diskon untuk ' + item.nama + ' (Rp ' + item.harga.toLocaleString('id') + ')\nMasukkan nilai diskon:', item.diskon || '0');
  if (d === null) return;
  var nilai = 0;
  if (d.indexOf('%') > -1) { var persen = parseFloat(d); if (isNaN(persen)) return alert('Persentase tidak valid'); nilai = Math.round((persen / 100) * item.harga * item.qty); }
  else { nilai = parseInt(d) || 0; }
  item.diskon = Math.max(0, Math.min(nilai, item.harga * item.qty));
  renderCart();
}

function bukaPopupDiskonTotal() {
  if (!isAdmin) return;
  var modal = document.createElement('div'); modal.id = 'popupDiskonModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = '<div style="background:#fff;padding:20px;border-radius:8px;width:300px;text-align:center;"><h3>Diskon Tambahan</h3><input type="text" id="inputDiskonPopup" placeholder="Nominal atau persen" style="width:100%;padding:8px;box-sizing:border-box;"><div style="margin-top:10px;"><button id="btnSimpanDiskon" class="btn-sm">Simpan</button><button id="btnBatalDiskon" class="btn-sm btn-danger">Batal</button></div></div>';
  document.body.appendChild(modal);
  document.getElementById('btnSimpanDiskon').onclick = function() {
    var input = document.getElementById('inputDiskonPopup').value.trim(); var nilai = 0;
    if (input.indexOf('%') > -1) { var persen = parseFloat(input); if (isNaN(persen)) { alert('Persentase tidak valid'); return; } var s1 = 0; cart.forEach(function(item) { s1 += (item.harga * item.qty) - (item.diskon || 0); }); nilai = Math.round((persen / 100) * s1); }
    else { nilai = parseInt(input) || 0; }
    if (nilai < 0) nilai = 0; totalDiskonValue = nilai; document.body.removeChild(modal); renderCart();
  };
  document.getElementById('btnBatalDiskon').onclick = function() { document.body.removeChild(modal); };
}

function renderCart() {
  var tbody = document.querySelector('#cartTable tbody'); tbody.innerHTML = '';
  var subtotalItemNetto = 0;
  cart.forEach(function(item, idx) {
    var sub = item.harga * item.qty; var diskon = item.diskon || 0; var netto = sub - diskon; subtotalItemNetto += netto;
    var row = tbody.insertRow();
    var html = '<td>' + item.nama + '</td><td>' + (item.isGrosir ? '<span style="color:#e53935;font-size:11px;font-weight:bold;">HARGA GROSIR</span><br>' : '') + 'Rp' + item.harga.toLocaleString('id') + (item.isGrosir ? '<br><small style="color:#999;text-decoration:line-through;">Rp' + item.hargaAsli.toLocaleString('id') + '</small>' : '') + '</td>';
    html += '<td><div class="qty-control"><button onclick="changeQty(' + idx + ',-1)">-</button><input type="number" min="1" value="' + item.qty + '" onchange="updateQty(' + idx + ',this.value)" style="width:60px;font-size:16px;text-align:center;padding:5px;"><button onclick="changeQty(' + idx + ',1)">+</button></div></td>';
    html += '<td>Rp' + sub.toLocaleString('id') + (diskon > 0 ? '<br><small style="color:#e53935;">Diskon: -Rp' + diskon.toLocaleString('id') + '</small>' : '') + '</td>';
    html += '<td>' + (isAdmin ? '<button class="btn-sm" onclick="editDiskonItem(' + idx + ')" title="Diskon">💰</button>' : '') + '<button class="btn-sm" onclick="lihatDetailProduk(\'' + item.barcode + '\')">ℹ️</button><button class="btn-sm btn-danger" onclick="hapusCartItem(' + idx + ')">✕</button></td>';
    row.innerHTML = html;
  });
  var diskonContainer = document.getElementById('diskonContainer'); if (!diskonContainer) return;
  if (totalDiskonValue > subtotalItemNetto) totalDiskonValue = subtotalItemNetto;
  var total = subtotalItemNetto - totalDiskonValue;
  if (totalDiskonValue > 0) {
    diskonContainer.innerHTML = '<div style="text-align:right;font-size:14px;"><div><strong>SUBTOTAL: Rp<span id="subtotal1Display">' + subtotalItemNetto.toLocaleString('id') + '</span></strong></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">' + (isAdmin ? '<button class="btn-sm" style="background:#ff9800;color:white;border:none;font-weight:bold;" onclick="bukaPopupDiskonTotal()">💰 Diskon Lagi</button>' : '<span></span>') + '<span style="color:#e53935;font-weight:bold;">Diskon: -Rp' + totalDiskonValue.toLocaleString('id') + '</span></div><div style="margin-top:6px;font-size:16px;font-weight:bold;">TOTAL: Rp<span id="totalCart">' + total.toLocaleString('id') + '</span></div></div>';
  } else if (isAdmin) {
    diskonContainer.innerHTML = '<div style="text-align:right;font-size:14px;"><div><strong>SUBTOTAL: Rp<span id="subtotal1Display">' + subtotalItemNetto.toLocaleString('id') + '</span></strong></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;"><button class="btn-sm" style="background:#ff9800;color:white;border:none;font-weight:bold;" onclick="bukaPopupDiskonTotal()">💰 Diskon Lagi</button><span></span></div><div style="margin-top:6px;font-size:16px;font-weight:bold;">TOTAL: Rp<span id="totalCart">' + total.toLocaleString('id') + '</span></div></div>';
  } else {
    diskonContainer.innerHTML = '<div style="text-align:right;font-size:16px;font-weight:bold;">TOTAL: Rp<span id="totalCart">' + subtotalItemNetto.toLocaleString('id') + '</span></div>';
  }
  hitungKembalian();
}

function changeQty(i, d) { var q = cart[i].qty + d; if (q < 1) q = 1; if (q > cart[i].stok) { alert('Stok tidak cukup'); q = cart[i].stok; } cart[i].qty = q; getProductByBarcode(cart[i].barcode).then(function(product) { if (product) { cart[i].harga = calculateGrosirPrice(product, q); cart[i].isGrosir = cart[i].harga < cart[i].hargaAsli; cart[i].diskon = 0; } renderCart(); }); }
function updateQty(i, q) { q = parseInt(q) || 1; if (q > cart[i].stok) { alert('Stok tidak cukup'); q = cart[i].stok; } cart[i].qty = q; getProductByBarcode(cart[i].barcode).then(function(product) { if (product) { cart[i].harga = calculateGrosirPrice(product, q); cart[i].isGrosir = cart[i].harga < cart[i].hargaAsli; cart[i].diskon = 0; } renderCart(); }); }
function hapusCartItem(i) { cart.splice(i, 1); renderCart(); }

function hitungKembalian() { var totalEl = document.getElementById('totalCart'); var t = totalEl ? parseInt(totalEl.textContent.replace(/\D/g, '')) || 0 : 0; var el = document.getElementById('kembalianDisplay'); if (el) el.textContent = Math.max(0, bayarValue - t).toLocaleString('id'); }

async function bayarDanCetak() {
  var role = currentUser ? currentUser.role : '';
  if (role !== 'admin' && role !== 'kasir') { alert('Anda tidak memiliki akses untuk pembayaran.'); return; }
  if (!cart.length) { alert('Keranjang kosong'); return; }
  var cust = document.getElementById('custName').value.trim();
  for (var i = 0; i < cart.length; i++) { var r = await supabaseClient.from('products').select('stok').eq('barcode', cart[i].barcode).single(); var cur = r.data; if (!cur || cur.stok < cart[i].qty) { alert('Stok "' + cart[i].nama + '" tidak mencukupi!'); return; } }
  var subtotal1 = 0; cart.forEach(function(item) { subtotal1 += (item.harga * item.qty) - (item.diskon || 0); });
  var grandTotal = subtotal1 - totalDiskonValue;
  if (bayarValue < grandTotal) { alert('Pembayaran kurang'); return; }
  var kembali = bayarValue - grandTotal;
  var now = new Date(); var no = 'INV-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + now.toTimeString().slice(0,8).replace(/:/g,'');
  var items = cart.map(function(i) { return { barcode: i.barcode, nama: i.nama, harga: i.harga, qty: i.qty, subtotal: i.harga * i.qty, diskon: i.diskon || 0, netto: (i.harga * i.qty) - (i.diskon || 0) }; });
  try {
    for (var j = 0; j < cart.length; j++) { var pr = await supabaseClient.from('products').select('stok').eq('barcode', cart[j].barcode).single(); if (pr.data) { await supabaseClient.from('products').update({ stok: Math.max(0, pr.data.stok - cart[j].qty) }).eq('barcode', cart[j].barcode); } }
    await insertTransaction({ no_invoice: no, tanggal: now.toISOString(), customer: cust, items: items, total: grandTotal, bayar: bayarValue, kembali: kembali, created_by: currentUser.username });
    var toko = appSettings; var lk = parseInt(toko.kertas_lebar) || 80;
    var mk = 3, xi = mk, xq = lk * 0.4, xh = lk * 0.65, xs = lk - mk;
    var th = 28; if (toko.logo) th = 40;
    var ti = cart.length * 5, tdb = totalDiskonValue > 0 ? 5 : 0, ttb = 20 + tdb, tf = toko.footer ? 12 : 0, tt = th + ti + ttb + tf + 15;
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: [lk, tt] }); var y = 8;
    if (toko.logo) { try { doc.addImage(toko.logo, toko.logo.indexOf('data:image/png') === 0 ? 'PNG' : 'JPEG', mk, 5, 14, 14); y = 22; } catch(e) {} }
    doc.setFontSize(9); doc.text(toko.nama || 'TOKO', mk, y); doc.setFontSize(7); y += 5;
    doc.text(toko.alamat || '', mk, y); y += 5;
    doc.text('No: ' + no, mk, y); y += 5;
    doc.text('Tanggal: ' + now.toLocaleString('id-ID'), mk, y); y += 5;
    doc.text('Customer: ' + (cust || '-'), mk, y); y += 8;
    doc.text('Item', xi, y); doc.text('Qty', xq, y, { align: 'center' }); doc.text('Harga', xh, y, { align: 'right' }); doc.text('Subtotal', xs, y, { align: 'right' }); y += 4; doc.line(mk, y, xs, y); y += 3;
    cart.forEach(function(i) { var s = i.harga * i.qty; doc.text(i.nama, xi, y, { maxWidth: xq - xi - 2 }); doc.text(i.qty.toString(), xq, y, { align: 'center' }); doc.text('Rp' + i.harga.toLocaleString('id'), xh, y, { align: 'right' }); doc.text('Rp' + (s - (i.diskon || 0)).toLocaleString('id'), xs, y, { align: 'right' }); if (i.diskon) { y += 4; doc.setFontSize(6); doc.text('  Diskon item: -Rp' + i.diskon.toLocaleString('id'), xi + 5, y); doc.setFontSize(7); } y += 5; });
    doc.line(mk, y, xs, y); y += 4;
    doc.text('Subtotal:', xi, y); doc.text('Rp' + subtotal1.toLocaleString('id'), xs, y, { align: 'right' }); y += 5;
    if (totalDiskonValue > 0) { doc.text('Diskon:', xi, y); doc.text('-Rp' + totalDiskonValue.toLocaleString('id'), xs, y, { align: 'right' }); y += 5; }
    doc.setFontSize(9); doc.text('TOTAL:', xi, y); doc.text('Rp' + grandTotal.toLocaleString('id'), xs, y, { align: 'right' }); y += 6;
    doc.setFontSize(8); doc.text('Bayar:', xi, y); doc.text('Rp' + bayarValue.toLocaleString('id'), xs, y, { align: 'right' }); y += 5;
    doc.text('Kembali:', xi, y); doc.text('Rp' + kembali.toLocaleString('id'), xs, y, { align: 'right' }); y += 5;
    if (toko.footer) { doc.setFontSize(7); doc.text(toko.footer, lk / 2, y, { align: 'center' }); }
    var pdfBlob = doc.output('blob'); await uploadInvoicePDF(no, pdfBlob);

    if (typeof strukDevice !== 'undefined' && strukDevice && typeof strukCharacteristic !== 'undefined' && strukCharacteristic) {
      var ts = buatStrukTeks(cart, subtotal1, totalDiskonValue, grandTotal, bayarValue, kembali, toko, no, cust);
      await cetakStrukKePrinter(toko.logo || null, ts);
    } else { window.open(URL.createObjectURL(pdfBlob), '_blank'); }

    alert('Berhasil!\nNo: ' + no + '\nTotal: Rp' + grandTotal.toLocaleString('id') + '\nKembali: Rp' + kembali.toLocaleString('id'));
    if (currentPesananNo) { supabaseClient.from('saved_orders').update({ status: 'paid', closed_by: currentUser.username, closed_at: now.toISOString() }).eq('no_pesanan', currentPesananNo); currentPesananNo = null; }
    cart = []; totalDiskonValue = 0; bayarValue = 0; updateBayarDisplay(); renderCart(); document.getElementById('custName').value = '';
  } catch (e) { alert('Gagal: ' + e.message); }
}

function buatStrukTeks(cart, s1, td, gt, b, k, toko, no, cust) {
  var lk = parseInt(toko.kertas_lebar) || 80; var cw = lk === 80 ? 48 : 32;
  var li = lk === 80 ? 20 : 12, lq = lk === 80 ? 4 : 3, lh = lk === 80 ? 10 : 8, ls = lk === 80 ? 11 : 8;
  function pr(t,l) { return t.length > l ? t.substring(0,l) : t + ' '.repeat(l - t.length); }
  function pl(t,l) { return t.length > l ? t.substring(0,l) : ' '.repeat(l - t.length) + t; }
  var t = (toko.nama || 'TOKO') + '\n'; if (toko.alamat) t += toko.alamat + '\n';
  t += 'No: ' + no + '\nTanggal: ' + new Date().toLocaleString('id-ID') + '\nCustomer: ' + (cust || '-') + '\n' + '-'.repeat(cw) + '\n';
  t += pr('Item',li) + pl('Qty',lq) + pl('Harga',lh) + pl('Subtotal',ls) + '\n' + '-'.repeat(cw) + '\n';
  cart.forEach(function(i) { var s = i.harga * i.qty, n = s - (i.diskon||0); var nm = i.nama||'', p=[]; while(nm.length>li){p.push(nm.substring(0,li));nm=nm.substring(li);} p.push(nm);
    t += pr(p[0],li) + pl(i.qty.toString(),lq) + pl('Rp'+i.harga.toLocaleString('id'),lh) + pl('Rp'+n.toLocaleString('id'),ls) + '\n';
    for(var x=1;x<p.length;x++) t += pr(p[x],li) + '\n'; if(i.diskon) t += '  Diskon item: -Rp'+i.diskon.toLocaleString('id')+'\n'; });
  t += '-'.repeat(cw) + '\nSubtotal:'.padEnd(25) + 'Rp' + s1.toLocaleString('id') + '\n';
  if(td>0) t += 'Diskon:'.padEnd(25) + '-Rp' + td.toLocaleString('id') + '\n';
  t += 'TOTAL:'.padEnd(25) + 'Rp' + gt.toLocaleString('id') + '\nBayar:'.padEnd(25) + 'Rp' + b.toLocaleString('id') + '\nKembali:'.padEnd(25) + 'Rp' + k.toLocaleString('id') + '\n';
  if(toko.footer) t += '\n' + toko.footer + '\n';
  t += '='.repeat(cw) + '\n'; return t;
}

function lihatDetailProduk(barcode) { (async function() { var p = await getProductByBarcode(barcode); if(!p) return alert('Produk tidak ditemukan'); document.getElementById('detailNama').textContent=p.nama||''; document.getElementById('detailBarcode').textContent=p.barcode||''; document.getElementById('detailKategori').textContent=p.kategori||'-'; document.getElementById('detailKeterangan').textContent=p.keterangan||'-'; document.getElementById('detailHargaJual').textContent='Rp'+(p.harga_jual||0).toLocaleString('id'); document.getElementById('detailStok').textContent=p.stok||0; var img=document.getElementById('detailFoto'); if(p.foto){img.src=p.foto;img.style.display='block';}else img.style.display='none'; document.getElementById('productDetailModal').style.display='flex'; })(); }

async function simpanPesanan() {
  if (!cart.length) { alert('Keranjang kosong'); return; }
  var cust = document.getElementById('custName').value.trim(); var now = new Date();
  var no = 'PSN-' + now.toISOString().slice(0,10).replace(/-/g,'') + '-' + now.toTimeString().slice(0,8).replace(/:/g,'');
  var items = cart.map(function(i) { return { barcode: i.barcode, nama: i.nama, harga: i.harga, hargaAsli: i.hargaAsli || i.harga, qty: i.qty, isGrosir: i.isGrosir || false, diskon: i.diskon || 0 }; });
  var s1 = 0; cart.forEach(function(item) { s1 += (item.harga * item.qty) - (item.diskon || 0); }); var gt = s1 - totalDiskonValue;
  var updateData = { customer: cust, items: items, total: gt, total_diskon: totalDiskonValue, modified_by: currentUser.username, modified_at: now.toISOString() };
  if (currentPesananNo) {
    var r = await supabaseClient.from('saved_orders').update(updateData).eq('no_pesanan', currentPesananNo);
    if (r.error) { alert('Gagal update: ' + r.error.message); return; }
    alert('Pesanan ' + currentPesananNo + ' diupdate!\nTotal: Rp' + gt.toLocaleString('id')); currentPesananNo = null;
  } else {
    updateData.no_pesanan = no; updateData.status = 'pending'; updateData.created_by = currentUser.username;
    var r = await supabaseClient.from('saved_orders').insert(updateData);
    if (r.error) { alert('Gagal menyimpan: ' + r.error.message); return; }
    alert('Pesanan disimpan!\nNo: ' + no + '\nTotal: Rp' + gt.toLocaleString('id'));
  }
  cart = []; totalDiskonValue = 0; bayarValue = 0; currentPesananNo = null; updateBayarDisplay(); renderCart(); document.getElementById('custName').value = '';
}

async function tampilkanPesananTersimpan() {
  var r = await supabaseClient.from('saved_orders').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (r.error) { alert('Gagal memuat: ' + r.error.message); return; }
  var orders = r.data; var listEl = document.getElementById('pesananList');
  if (!orders || orders.length === 0) { listEl.innerHTML = '<p style="text-align:center;color:#999;">Tidak ada pesanan tersimpan</p>'; }
  else {
    var html = ''; orders.forEach(function(o) { var it = ''; o.items.forEach(function(i) { it += i.nama + ' x' + i.qty + ', '; }); it = it.replace(/, $/, '');
      var isAdm = currentUser && currentUser.role === 'admin';
      html += '<div style="border:1px solid #e0e0e0;border-radius:8px;padding:12px;margin-bottom:8px;"><strong>' + o.no_pesanan + '</strong> | Total: <b>Rp' + (o.total||0).toLocaleString('id') + '</b>';
      if(o.total_diskon>0) html += ' <small style="color:#e53935;">(Diskon: -Rp'+(o.total_diskon||0).toLocaleString('id')+')</small>';
      html += '<br><small style="color:#00695c;">📝 Dibuat: ' + new Date(o.created_at).toLocaleString('id-ID') + ' oleh ' + (o.created_by||'-') + '</small>';
      if(o.modified_by) html += '<br><small style="color:#e65100;">✏️ Diubah: ' + new Date(o.modified_at).toLocaleString('id-ID') + ' oleh ' + o.modified_by + '</small>';
      html += '<div style="margin-top:4px;font-size:12px;color:#666;">' + it + '</div><div style="margin-top:8px;"><button class="btn-sm" onclick="muatPesanan(\'' + o.no_pesanan + '\')">📥 Muat</button>';
      if(isAdm) html += '<button class="btn-sm btn-danger" onclick="hapusPesanan(\'' + o.no_pesanan + '\')">🗑</button>'; html += '</div></div>'; });
    listEl.innerHTML = html;
  }
  document.getElementById('pesananModal').style.display = 'flex';
}

async function muatPesanan(noPesanan) {
  var r = await supabaseClient.from('saved_orders').select('*').eq('no_pesanan', noPesanan).single();
  if (r.error || !r.data) { alert('Pesanan tidak ditemukan'); return; }
  var order = r.data;
  for (var i = 0; i < order.items.length; i++) { var item = order.items[i]; var p = await getProductByBarcode(item.barcode); if (!p) { alert('Produk "' + item.nama + '" sudah tidak ada.'); return; } if (p.stok < item.qty) { alert('Stok "' + item.nama + '" tidak cukup!'); return; } }
  cart = []; totalDiskonValue = order.total_diskon || 0;
  order.items.forEach(function(item) { cart.push({ barcode: item.barcode, nama: item.nama, harga: item.harga, hargaAsli: item.hargaAsli || item.harga, qty: item.qty, stok: 999, diskon: item.diskon || 0, isGrosir: item.isGrosir || false }); });
  if (order.customer) document.getElementById('custName').value = order.customer;
  currentPesananNo = noPesanan; renderCart(); document.getElementById('pesananModal').style.display = 'none';
  var info = 'Pesanan ' + noPesanan + ' dimuat!\nTotal: Rp' + (order.total || 0).toLocaleString('id') + '\n\n📝 Dibuat: ' + new Date(order.created_at).toLocaleString('id-ID') + ' oleh ' + (order.created_by || '-');
  if (order.modified_by) info += '\n✏️ Diubah: ' + new Date(order.modified_at).toLocaleString('id-ID') + ' oleh ' + order.modified_by;
  if (order.closed_by) info += '\n🔒 Ditutup: ' + new Date(order.closed_at).toLocaleString('id-ID') + ' oleh ' + order.closed_by;
  alert(info);
}

async function hapusPesanan(noPesanan) { if (!confirm('Hapus pesanan ' + noPesanan + '?')) return; await supabaseClient.from('saved_orders').delete().eq('no_pesanan', noPesanan); alert('Pesanan dihapus'); tampilkanPesananTersimpan(); }

function invalidateSettingsCache() { cachedSettings = null; }