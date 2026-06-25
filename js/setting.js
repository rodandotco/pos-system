// ===================== SETTING.JS =====================
window.logoTokoDihapus = false;

async function muatProfilToko() {
  var s = await getSettings();
  if (s) {
    document.getElementById('tokoNama').value = s.nama || ''; document.getElementById('tokoAlamat').value = s.alamat || ''; document.getElementById('tokoTelp').value = s.telp || '';
    document.getElementById('tokoFooter').value = s.footer || ''; document.getElementById('kertasLebar').value = s.kertas_lebar || '80';
    document.getElementById('jenisKertas').value = s.jenis_kertas || 'thermal'; document.getElementById('printerPilihan').value = s.printer || 'default';
    document.getElementById('labelWidth').value = s.label_width || 50; document.getElementById('labelHeight').value = s.label_height || 30;
    document.getElementById('labelGap').value = s.label_gap || 3; document.getElementById('paperCols').value = s.label_cols || 1;
    toggleLabelSettings();
    if (s.logo) { document.getElementById('logoPreview').src = s.logo; document.getElementById('logoPreviewContainer').style.display = 'block'; } else document.getElementById('logoPreviewContainer').style.display = 'none';
    document.getElementById('reportEmail').value = s.report_email || ''; document.getElementById('reportFrequency').value = s.report_frequency || 'none';
    document.getElementById('dailyTime').value = s.report_daily_time || '21'; document.getElementById('weeklyDay').value = s.report_weekly_day || '1';
    document.getElementById('weeklyTime').value = s.report_weekly_time || '21'; document.getElementById('monthlyDate').value = s.report_monthly_date || '1';
    document.getElementById('monthlyTime').value = s.report_monthly_time || '21'; toggleReportOptions();
  } else {
    document.getElementById('tokoNama').value = ''; document.getElementById('tokoAlamat').value = ''; document.getElementById('tokoTelp').value = ''; document.getElementById('tokoFooter').value = '';
    document.getElementById('kertasLebar').value = '80'; document.getElementById('jenisKertas').value = 'thermal'; document.getElementById('printerPilihan').value = 'default';
    document.getElementById('labelWidth').value = 50; document.getElementById('labelHeight').value = 30; document.getElementById('labelGap').value = 3; document.getElementById('paperCols').value = 1;
    toggleLabelSettings(); document.getElementById('logoPreviewContainer').style.display = 'none';
    document.getElementById('reportEmail').value = ''; document.getElementById('reportFrequency').value = 'none'; document.getElementById('dailyTime').value = '21';
    document.getElementById('weeklyDay').value = '1'; document.getElementById('weeklyTime').value = '21'; document.getElementById('monthlyDate').value = '1';
    document.getElementById('monthlyTime').value = '21'; toggleReportOptions();
  }
}

function toggleLabelSettings() { document.getElementById('labelSettings').style.display = document.getElementById('jenisKertas').value === 'label' ? 'block' : 'none'; }
function toggleReportOptions() { var f = document.getElementById('reportFrequency').value; document.getElementById('dailyOptions').style.display = f === 'daily' ? 'block' : 'none'; document.getElementById('weeklyOptions').style.display = f === 'weekly' ? 'block' : 'none'; document.getElementById('monthlyOptions').style.display = f === 'monthly' ? 'block' : 'none'; }

async function simpanPengaturanLaporan() {
  var e = document.getElementById('reportEmail').value.trim(), f = document.getElementById('reportFrequency').value, dt = document.getElementById('dailyTime').value;
  var wd = document.getElementById('weeklyDay').value, wt = document.getElementById('weeklyTime').value, md = document.getElementById('monthlyDate').value, mt = document.getElementById('monthlyTime').value;
  if (f !== 'none' && !e) { alert('Silakan isi email tujuan terlebih dahulu.'); return; }
  await updateSettings({ report_email: e, report_frequency: f, report_daily_time: dt, report_weekly_day: wd, report_weekly_time: wt, report_monthly_date: md, report_monthly_time: mt });
  alert('✅ Pengaturan laporan disimpan!'); localStorage.removeItem('lastReportSent'); localStorage.removeItem('lastReportSchedule');
}

async function tesKirimLaporan() { var e = document.getElementById('reportEmail').value.trim(); if (!e) { alert('Isi email tujuan terlebih dahulu.'); return; } await simpanPengaturanLaporan(); var s = await getSettings(); var t = new Date(); try { await sendEmailResend(e, '📊 TES - Laporan POS', '✅ Ini adalah email percobaan.\n\nToko: ' + (s.nama || 'POS') + '\nTanggal: ' + t.toLocaleDateString('id-ID')); alert('✅ Email tes berhasil dikirim!'); } catch (er) { alert('❌ Gagal: ' + er.message); } }

function previewLogoToko() { var f = document.getElementById('tokoLogo').files[0]; if (f) { var r = new FileReader(); r.onload = function(e) { document.getElementById('logoPreview').src = e.target.result; document.getElementById('logoPreviewContainer').style.display = 'block'; }; r.readAsDataURL(f); window.logoTokoDihapus = false; } }
function hapusLogoToko() { document.getElementById('logoPreview').src = ''; document.getElementById('logoPreviewContainer').style.display = 'none'; document.getElementById('tokoLogo').value = ''; window.logoTokoDihapus = true; }

async function simpanProfil() {
  if (!currentUser || currentUser.role !== 'admin') return;
  var n = document.getElementById('tokoNama').value, a = document.getElementById('tokoAlamat').value, t = document.getElementById('tokoTelp').value, f = document.getElementById('tokoFooter').value;
  var kl = document.getElementById('kertasLebar').value, jk = document.getElementById('jenisKertas').value, pr = document.getElementById('printerPilihan').value;
  var lw = parseFloat(document.getElementById('labelWidth').value) || 50, lh = parseFloat(document.getElementById('labelHeight').value) || 30, lg = parseFloat(document.getElementById('labelGap').value) || 3, lc = parseInt(document.getElementById('paperCols').value) || 1;
  var logo = null; if (!window.logoTokoDihapus) { var fi = document.getElementById('tokoLogo'); if (fi.files[0]) { logo = await toBase64(fi.files[0]); } else { var ss = await getSettings(); logo = ss.logo || null; } }
  await updateSettings({ nama: n, alamat: a, telp: t, logo: logo, footer: f, kertas_lebar: kl, jenis_kertas: jk, printer: pr, label_width: lw, label_height: lh, label_gap: lg, label_cols: lc });
  alert('Profil disimpan!'); window.logoTokoDihapus = false; document.getElementById('tokoLogo').value = ''; if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache(); await muatProfilToko();
}

async function simpanPengaturanCetak() { var s = await getSettings(); await updateSettings({ ...s, kertas_lebar: document.getElementById('kertasLebar').value, jenis_kertas: document.getElementById('jenisKertas').value, printer: document.getElementById('printerPilihan').value, label_width: parseFloat(document.getElementById('labelWidth').value) || 50, label_height: parseFloat(document.getElementById('labelHeight').value) || 30, label_gap: parseFloat(document.getElementById('labelGap').value) || 3, label_cols: parseInt(document.getElementById('paperCols').value) || 1 }); alert('Pengaturan cetak disimpan!'); if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache(); }

function aturHakAkses() {
  var role = currentUser ? currentUser.role : 'kasir', isAdmin = role === 'admin', isKasir = role === 'kasir', isStaff = role === 'staff', isGudang = role === 'gudang';
  document.getElementById('manajemenProfilSection').style.display = isAdmin ? 'block' : 'none';
  document.querySelectorAll('#page-setting h3').forEach(function(h3) {
    if (h3.textContent.includes('Manajemen Laporan')) { h3.style.display = isAdmin ? '' : 'none'; var n = h3.nextElementSibling; while (n && n.tagName !== 'H3' && n.tagName !== 'HR') { n.style.display = isAdmin ? '' : 'none'; n = n.nextElementSibling; } if (n && n.tagName === 'HR') n.style.display = isAdmin ? '' : 'none'; }
    if (h3.textContent.includes('Manajemen Cetak')) { h3.style.display = (isAdmin || isKasir) ? '' : 'none'; var n = h3.nextElementSibling; while (n && n.tagName !== 'H3' && n.tagName !== 'HR') { n.style.display = (isAdmin || isKasir) ? '' : 'none'; n = n.nextElementSibling; } if (n && n.tagName === 'HR') n.style.display = (isAdmin || isKasir) ? '' : 'none'; }
  });
  document.getElementById('manajemenUserSection').style.display = isAdmin ? 'block' : 'none'; document.getElementById('manajemenDataSection').style.display = isAdmin ? 'block' : 'none';
  document.getElementById('thAksi').style.display = (isAdmin || isGudang) ? '' : 'none';
  var bb = document.querySelector('button[onclick="bayarDanCetak()"]'); if (bb) bb.style.display = (isAdmin || isKasir) ? '' : 'none';
  var ps = document.getElementById('pembayaranSummary'); if (ps) ps.style.display = (isAdmin || isKasir) ? '' : 'none';
  setTimeout(function() { document.querySelectorAll('button[onclick^="editDiskonItem"], button[onclick^="bukaPopupDiskonTotal"]').forEach(function(b) { if (!isAdmin) b.style.display = 'none'; }); }, 500);
  var es = document.querySelector('#page-laporan div[style*="margin-top:12px"]'); if (es) es.style.display = isAdmin ? '' : 'none';
  if (activeTab === 'inventory') refreshProductList(); if (activeTab === 'laporan') muatLaporan();
}

async function pilihFolder() { try { var d = await window.showDirectoryPicker(); workingDirHandle = d; document.getElementById('folderPath').textContent = d.name; alert('Folder dipilih!'); } catch (e) { if (e.name !== 'AbortError') alert('Gagal memilih folder'); } }

async function backupData() { try { var zip = new JSZip(); var u = await supabaseClient.from('users').select('*'); var p = await supabaseClient.from('products').select('*'); var t = await supabaseClient.from('transactions').select('*'); var s = await supabaseClient.from('settings').select('*'); zip.file('users.json', JSON.stringify(u.data || [])); zip.file('products.json', JSON.stringify(p.data || [])); zip.file('transactions.json', JSON.stringify(t.data || [])); zip.file('settings.json', JSON.stringify(s.data || [])); var blob = await zip.generateAsync({ type: 'blob' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'backup_' + new Date().toISOString().slice(0, 10) + '.zip'; a.click(); } catch (e) { alert('Gagal backup: ' + e.message); } }

async function restoreData() { var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.zip'; inp.onchange = async function(e) { var file = e.target.files[0]; if (!file) return; try { var zip = await JSZip.loadAsync(file); var rst = { users: 0, products: 0, transactions: 0, settings: 0 }; if (zip.files['users.json']) { var t = await zip.files['users.json'].async('text'); var u = JSON.parse(t); if (u.length > 0) { var r = await supabaseClient.from('users').upsert(u, { onConflict: 'username' }); if (!r.error) rst.users = u.length; } } if (zip.files['products.json']) { var t = await zip.files['products.json'].async('text'); var p = JSON.parse(t); if (p.length > 0) { var r = await supabaseClient.from('products').upsert(p, { onConflict: 'barcode' }); if (!r.error) rst.products = p.length; } } if (zip.files['transactions.json']) { var t = await zip.files['transactions.json'].async('text'); var tr = JSON.parse(t); if (tr.length > 0) { var r = await supabaseClient.from('transactions').upsert(tr, { onConflict: 'no_invoice' }); if (!r.error) rst.transactions = tr.length; } } if (zip.files['settings.json']) { var t = await zip.files['settings.json'].async('text'); var s = JSON.parse(t); if (s.length > 0) { var r = await supabaseClient.from('settings').upsert(s, { onConflict: 'id' }); if (!r.error) rst.settings = s.length; } } alert('Restore berhasil!\nUsers: ' + rst.users + '\nProducts: ' + rst.products + '\nTransactions: ' + rst.transactions + '\nSettings: ' + rst.settings); if (typeof invalidateSettingsCache === 'function') invalidateSettingsCache(); location.reload(); } catch (er) { alert('Gagal restore: ' + er.message); } }; inp.click(); }
function resetDatabase() { if (confirm('Reset semua data?')) { alert('Fitur reset harus dilakukan melalui dashboard Supabase.'); } }