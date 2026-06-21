// ===================== LAPORAN.JS (Tombol Hapus Hanya Admin) =====================
let chartInstance = null;
let topProductsChart = null;

function setDefaultDateFilter() {
  const t = new Date().toISOString().slice(0,10);
  document.getElementById('tglAwal').value = t;
  document.getElementById('tglAkhir').value = t;
}

function filterToday() { setDefaultDateFilter(); muatLaporan(); }
function filterThisWeek() {
  const n = new Date(), d = n.getDay(), s = new Date(n);
  s.setDate(n.getDate() - d + (d === 0 ? -6 : 1));
  const e = new Date(s); e.setDate(s.getDate() + 6);
  document.getElementById('tglAwal').value = s.toISOString().slice(0,10);
  document.getElementById('tglAkhir').value = e.toISOString().slice(0,10);
  muatLaporan();
}
function filterMTD() {
  const n = new Date();
  document.getElementById('tglAwal').value = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0,10);
  document.getElementById('tglAkhir').value = n.toISOString().slice(0,10);
  muatLaporan();
}
function filterYTD() {
  const n = new Date();
  document.getElementById('tglAwal').value = new Date(n.getFullYear(), 0, 1).toISOString().slice(0,10);
  document.getElementById('tglAkhir').value = n.toISOString().slice(0,10);
  muatLaporan();
}

async function muatLaporan() {
  const a = document.getElementById('tglAwal').value, b = document.getElementById('tglAkhir').value;
  if (!a || !b) return;

  const all = await getAllTransactions(a + 'T00:00:00', b + 'T23:59:59');
  const tbody = document.querySelector('#reportTable tbody');
  tbody.innerHTML = '';
  if (!all.length) {
    tbody.innerHTML = '<tr><td colspan="5">Tidak ada</td></tr>';
  } else {
    all.forEach(t => {
      const row = tbody.insertRow();
      row.innerHTML = `<td>${t.no_invoice}</td><td>${new Date(t.tanggal).toLocaleDateString('id-ID')}</td><td>${t.customer || '-'}</td><td>Rp${t.total.toLocaleString('id')}</td><td>
        <button class="btn-sm" onclick="viewInvoice('${t.no_invoice}')">👁️</button>
        <button class="btn-sm" onclick="cetakUlang('${t.no_invoice}')">🖨️ PDF</button>
        <button class="btn-sm" onclick="cetakUlangBT('${t.no_invoice}')">🖨️ BT</button>
        ${(currentUser && currentUser.role === 'admin') ? `<button class="btn-sm btn-danger" onclick="hapusTransaksi('${t.no_invoice}')">🗑</button>` : ''}
      </td>`;
    });
  }
  document.getElementById('totalTransaksi').textContent = all.length;
  document.getElementById('totalPendapatan').textContent = 'Rp' + all.reduce((s, t) => s + t.total, 0).toLocaleString('id');
  renderChart(all, 'daily', a, b);
  renderTopProductsChart(all);
}

// ========== CETAK ULANG VIA BLUETOOTH (DIPERBAIKI) ==========
async function cetakUlangBT(noInv) {
  if (!bluetoothDevice || !bluetoothCharacteristic) {
    alert('Printer Bluetooth tidak terhubung. Sambungkan dulu di tab Setting.');
    return;
  }

  const trx = await getTransaction(noInv);
  if (!trx) {
    alert('Transaksi tidak ditemukan');
    return;
  }

  const toko = await getSettings();
  const cart = trx.items || [];

  // Hitung subtotal1 (setelah diskon per item, jika data diskon ada)
  const subtotal1 = cart.reduce((sum, item) => {
    const sub = item.harga * item.qty;
    const diskon = item.diskon || 0;
    return sum + (sub - diskon);
  }, 0);
  // Diskon total (dari transaksi, default 0)
  const totalDiskon = trx.totalDiskon || 0;
  // Grand Total = subtotal1 - totalDiskon (seharusnya sama dengan trx.total)
  const grandTotal = subtotal1 - totalDiskon;
  // Bayar & Kembali
  const bayar = trx.bayar || 0;
  const kembali = trx.kembali || 0;

  // Panggil fungsi buatStrukTeks versi 9 parameter (harus ada di transaksi.js)
  const teks = buatStrukTeks(cart, subtotal1, totalDiskon, grandTotal, bayar, kembali, toko, trx.no_invoice, trx.customer);

  await cetakStrukKePrinter(toko.logo || null, teks);
}

// ========== HAPUS TRANSAKSI ==========
async function hapusTransaksi(noInv) {
  if (!confirm(`Hapus transaksi ${noInv}? Stok akan dikembalikan.`)) return;
  const trx = await getTransaction(noInv);
  if (!trx) return alert('Transaksi tidak ditemukan');
  try {
    for (let item of trx.items) {
      const { data: prod } = await supabaseClient.from('products').select('stok').eq('barcode', item.barcode).single();
      if (prod) {
        await supabaseClient.from('products').update({ stok: prod.stok + item.qty }).eq('barcode', item.barcode);
      }
    }
    await deleteTransaction(noInv);
    try { await supabaseClient.storage.from('invoices').remove([`${noInv}.pdf`]); } catch(e) {}
    alert('Transaksi dihapus');
    muatLaporan();
  } catch (e) { alert('Gagal menghapus: ' + e.message); }
}

// ========== VIEW & CETAK PDF (FALLBACK) ==========
async function viewInvoice(noInv) {
  const url = await getInvoiceURL(noInv);
  if (url) {
    window.open(url, '_blank');
    return;
  }
  const trx = await getTransaction(noInv);
  if (!trx) return alert('Transaksi tidak ditemukan');
  const toko = await getSettings();
  trx.toko_nama = toko.nama; trx.toko_alamat = toko.alamat; trx.toko_footer = toko.footer;
  const blob = generateInvoicePDF(trx);
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, '_blank');
}

async function cetakUlang(noInv) {
  const url = await getInvoiceURL(noInv);
  if (url) {
    const pw = window.open(url, '_blank');
    if (pw) pw.addEventListener('load', () => pw.print(), { once: true });
    return;
  }
  const trx = await getTransaction(noInv);
  if (!trx) return alert('Transaksi tidak ditemukan');
  const toko = await getSettings();
  trx.toko_nama = toko.nama; trx.toko_alamat = toko.alamat; trx.toko_footer = toko.footer;
  const blob = generateInvoicePDF(trx);
  const blobUrl = URL.createObjectURL(blob);
  const pw = window.open(blobUrl, '_blank');
  if (pw) pw.addEventListener('load', () => pw.print(), { once: true });
}

// ========== GENERATE PDF DARI DATA TRANSAKSI (sama seperti sebelumnya) ==========
function generateInvoicePDF(trx) {
  const { jsPDF } = window.jspdf;
  const lebarKertas = 80;
  const marginKiri = 3, marginKanan = 3;
  const xItem = marginKiri, xQty = lebarKertas * 0.4, xHarga = lebarKertas * 0.65, xSubtotal = lebarKertas - marginKanan;
  let tinggiHeader = 28;
  const tinggiItem = (trx.items || []).length * 5;
  const tinggiTotalBayar = 15;
  const tinggiFooter = trx.toko_footer ? 12 : 0;
  const tinggiTotal = tinggiHeader + tinggiItem + tinggiTotalBayar + tinggiFooter + 10;

  const doc = new jsPDF({ unit: 'mm', format: [lebarKertas, tinggiTotal] });
  let y = 8;

  doc.setFontSize(9);
  doc.text(trx.toko_nama || 'TOKO', marginKiri, y);
  doc.setFontSize(7);
  y += 5;
  if (trx.toko_alamat) { doc.text(trx.toko_alamat, marginKiri, y); y += 5; }
  doc.text('No: ' + trx.no_invoice, marginKiri, y); y += 5;
  doc.text('Tanggal: ' + new Date(trx.tanggal).toLocaleString('id-ID'), marginKiri, y); y += 5;
  doc.text('Customer: ' + (trx.customer || '-'), marginKiri, y); y += 8;

  doc.text('Item', xItem, y);
  doc.text('Qty', xQty, y, { align: 'center' });
  doc.text('Harga', xHarga, y, { align: 'right' });
  doc.text('Subtotal', xSubtotal, y, { align: 'right' });
  y += 4; doc.line(marginKiri, y, xSubtotal, y); y += 3;

  (trx.items || []).forEach(item => {
    const netto = (item.harga * item.qty) - (item.diskon || 0);
    doc.text(item.nama, xItem, y, { maxWidth: xQty - xItem - 2 });
    doc.text(item.qty.toString(), xQty, y, { align: 'center' });
    doc.text('Rp' + item.harga.toLocaleString('id'), xHarga, y, { align: 'right' });
    doc.text('Rp' + netto.toLocaleString('id'), xSubtotal, y, { align: 'right' });
    if (item.diskon) {
      y += 4;
      doc.setFontSize(6);
      doc.text('  Diskon item: -Rp' + item.diskon.toLocaleString('id'), xItem + 5, y);
      doc.setFontSize(7);
    }
    y += 5;
  });
  doc.line(marginKiri, y, xSubtotal, y); y += 4;

  doc.text('Total:', xItem, y);
  doc.text('Rp' + trx.total.toLocaleString('id'), xSubtotal, y, { align: 'right' });
  y += 5;
  doc.text('Bayar:', xItem, y);
  doc.text('Rp' + trx.bayar.toLocaleString('id'), xSubtotal, y, { align: 'right' });
  y += 5;
  doc.text('Kembali:', xItem, y);
  doc.text('Rp' + trx.kembali.toLocaleString('id'), xSubtotal, y, { align: 'right' });
  y += 5;

  if (trx.toko_footer) {
    doc.setFontSize(7);
    doc.text(trx.toko_footer, lebarKertas / 2, y, { align: 'center' });
  }

  return doc.output('blob');
}

// ========== CHART ==========
function renderChart(trans, mode, start, end) {
  if (chartInstance) chartInstance.destroy();
  const ctx = document.getElementById('chartPenjualan')?.getContext('2d');
  if (!ctx) return;
  let labels, data;
  if (mode === 'hourly') {
    const hourly = {}; trans.forEach(t => { const hr = new Date(t.tanggal).getHours(); hourly[hr] = (hourly[hr] || 0) + t.total; });
    labels = Array.from({ length: 24 }, (_, i) => i + ':00');
    data = labels.map((_, i) => hourly[i] || 0);
  } else if (mode === 'daily') {
    const daily = {}; const s = new Date(start), e = new Date(end);
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) { daily[d.toISOString().slice(0, 10)] = 0; }
    trans.forEach(t => { const k = t.tanggal.slice(0, 10); if (daily[k] !== undefined) daily[k] += t.total; });
    const keys = Object.keys(daily).sort();
    labels = keys.map(k => new Date(k).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
    data = keys.map(k => daily[k]);
  }
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Penjualan (Rp)', data, backgroundColor: '#009688', borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { callback: v => 'Rp' + v.toLocaleString('id') } } } }
  });
}

function renderTopProductsChart(trans) {
  if (topProductsChart) topProductsChart.destroy();
  const ctx = document.getElementById('chartTopProducts')?.getContext('2d');
  if (!ctx) return;
  const sales = {}; trans.forEach(t => { if (t.items) t.items.forEach(i => { const k = i.nama || i.barcode; if (!sales[k]) sales[k] = { nama: i.nama, qty: 0 }; sales[k].qty += i.qty || 1; }); });
  const sorted = Object.values(sales).sort((a, b) => b.qty - a.qty).slice(0, 10);
  const colors = ['#e53935', '#1e88e5', '#fdd835', '#8e24aa', '#fb8c00', '#d81b60', '#00acc1', '#7cb342', '#5e35b1', '#ffb300'];
  topProductsChart = new Chart(ctx, {
    type: 'pie',
    data: { labels: sorted.map(p => p.nama), datasets: [{ data: sorted.map(p => p.qty), backgroundColor: colors.slice(0, sorted.length), borderWidth: 1 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } } }
  });
}

function exportCSV() {
  const tbody = document.querySelector('#reportTable tbody');
  let csv = 'No Invoice,Tanggal,Customer,Total\n';
  tbody.querySelectorAll('tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) {
      csv += `"${cells[0].textContent}","${cells[1].textContent}","${cells[2].textContent}","${cells[3].textContent.replace('Rp ', '').replace(/\./g, '')}"\n`;
    }
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'laporan.csv'; a.click();
}

// ========== AUTO EMAIL REPORT (runs on app load) ==========
async function checkAutoEmailReport() {
  const settings = await getSettings();
  
  if (!settings.email || !settings.report_schedule || settings.report_schedule === 'none') {
    return; // Not configured
  }
  
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const lastSent = localStorage.getItem('lastReportSent');
  const lastSchedule = localStorage.getItem('lastReportSchedule');
  
  // Check if schedule changed (reset)
  if (lastSchedule !== settings.report_schedule) {
    localStorage.removeItem('lastReportSent');
    localStorage.setItem('lastReportSchedule', settings.report_schedule);
  }
  
  let shouldSend = false;
  
  if (settings.report_schedule === 'daily') {
    // Send if not sent today
    if (lastSent !== todayStr) shouldSend = true;
    
  } else if (settings.report_schedule === 'weekly') {
    // Send on Monday if not sent this week
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon
    if (dayOfWeek === 1) { // Monday
      const weekStr = `${today.getFullYear()}-W${getWeekNumber(today)}`;
      if (lastSent !== weekStr) shouldSend = true;
    }
    
  } else if (settings.report_schedule === 'monthly') {
    // Send on 1st day of month
    if (today.getDate() === 1) {
      const monthStr = `${today.getFullYear()}-${today.getMonth() + 1}`;
      if (lastSent !== monthStr) shouldSend = true;
    }
  }
  
  // Check time (only send between 21:00-22:00)
  const currentHour = today.getHours();
  if (currentHour < 21 || currentHour >= 22) {
    shouldSend = false;
  }
  
  if (shouldSend) {
    // Send the report
    await kirimEmailLaporan(settings);
    
    // Save sent status
    if (settings.report_schedule === 'daily') {
      localStorage.setItem('lastReportSent', todayStr);
    } else if (settings.report_schedule === 'weekly') {
      localStorage.setItem('lastReportSent', `${today.getFullYear()}-W${getWeekNumber(today)}`);
    } else if (settings.report_schedule === 'monthly') {
      localStorage.setItem('lastReportSent', `${today.getFullYear()}-${today.getMonth() + 1}`);
    }
  }
}

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

async function kirimEmailLaporan(settings) {
  const today = new Date();
  const tanggal = today.toISOString().slice(0, 10);
  const tanggalFormat = today.toLocaleDateString('id-ID', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });
  
  // Get transactions
  const transactions = await getAllTransactions(tanggal + 'T00:00:00', tanggal + 'T23:59:59');
  
  const totalTransaksi = transactions.length;
  const totalPendapatan = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
  
  // Top products
  const productSales = {};
  transactions.forEach(t => {
    if (t.items) {
      t.items.forEach(item => {
        const key = item.barcode;
        if (!productSales[key]) {
          productSales[key] = { nama: item.nama, qty: 0, total: 0 };
        }
        productSales[key].qty += item.qty || 0;
        productSales[key].total += (item.harga * item.qty) || 0;
      });
    }
  });
  
  const topProducts = Object.values(productSales)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  
  let body = `📊 LAPORAN POS - ${tanggalFormat}\n`;
  body += `────────────────────────\n`;
  body += `Toko: ${settings.nama || 'POS'}\n`;
  body += `────────────────────────\n\n`;
  body += `Total Transaksi: ${totalTransaksi}\n`;
  body += `Total Pendapatan: Rp ${totalPendapatan.toLocaleString('id')}\n\n`;
  
  if (topProducts.length > 0) {
    body += `🔥 PRODUK TERLARIS:\n`;
    topProducts.forEach((p, i) => {
      body += `${i + 1}. ${p.nama} - ${p.qty} pcs\n`;
    });
  }
  
  body += `\n────────────────────────\n📱 Dikirim otomatis oleh POS\n`;
  
  // Open email client
  const subject = `📊 Laporan POS - ${tanggal}`;
  window.location.href = `mailto:${settings.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}