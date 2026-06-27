async function cetakLabelLangsung(barcode) {
  if (!labelDevice || !labelCharacteristic) {
    alert('Label printer tidak terhubung.');
    return;
  }

  var product = typeof getProductByBarcode === 'function' ? await getProductByBarcode(barcode) : null;
  if (!product) return alert('Produk tidak ditemukan');

  var nama = (product.nama || 'Produk').substring(0, 20);
  var harga = 'Rp' + (product.harga_jual || 0).toLocaleString('id');
  var barcodeText = product.barcode || '';
  var tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  var w = mmToDotsLabel(parseFloat(document.getElementById('labelWidthMM').value) || 33);
  var h = mmToDotsLabel(parseFloat(document.getElementById('labelHeightMM').value) || 15);
  var gap = mmToDotsLabel(parseFloat(document.getElementById('labelGapMM').value) || 2);
  var ox = mmToDotsLabel(parseFloat(document.getElementById('labelOffsetX').value) || 0);
  var oy = mmToDotsLabel(parseFloat(document.getElementById('labelOffsetY').value) || 0);
  var cols = parseInt(document.getElementById('labelCols').value) || 2;
  var printCount = parseInt(document.getElementById('labelPrintCount').value) || 1;
  var qty = parseInt(document.getElementById('labelQty').value) || 0;

  var showNama = document.getElementById('showNama').checked;
  var showHarga = document.getElementById('showHarga').checked;
  var showBarcode = document.getElementById('showBarcode').checked;
  var showDate = document.getElementById('showDate').checked;

  try {
    var encoder = new TextEncoder();
    var allData = '';
    var totalW = cols === 2 ? (w * 2 + gap) : w;

    console.log('Label - w:' + w + ' h:' + h + ' gap:' + gap + ' totalW:' + totalW + ' ox:' + ox + ' oy:' + oy + ' cols:' + cols + ' qty:' + qty + ' printCount:' + printCount);

    for (var p = 0; p < printCount; p++) {
      var cmd = '';
      cmd += 'SIZE ' + totalW + ',' + h + '\r\n';
      cmd += 'CLS\r\n';

      for (var col = 0; col < cols; col++) {
        var x = (col * (w + gap)) + 5 + ox;
        var y = 5 + oy;

        // ── Product Name ──────────────────────────
        if (showNama) {
          cmd += 'TEXT ' + x + ',' + y + ',"3",0,1,1,"' + nama + '"\r\n';  // FIXED: font "1" → "3"
          y += 22;
        }

        // ── Barcode & Price ───────────────────────
        if (showBarcode && showHarga) {
          // Barcode (no human-readable) + Price next to it
          cmd += 'BARCODE ' + x + ',' + y + ',"128",30,0,0,1,2,"' + barcodeText + '"\r\n';  // FIXED: narrow=1, wide=2
          cmd += 'TEXT ' + (x + 150) + ',' + (y + 10) + ',"3",0,1.3,1.3,"' + harga + '"\r\n';  // FIXED: font "3"
          y += 45;

        } else if (showBarcode) {
          // Barcode only (no human-readable, we print it manually later)
          cmd += 'BARCODE ' + x + ',' + y + ',"128",30,0,0,1,2,"' + barcodeText + '"\r\n';  // FIXED: narrow=1, wide=2, HR=0
          y += 45;

        } else if (showHarga) {
          // Price only
          cmd += 'TEXT ' + x + ',' + y + ',"3",0,1.3,1.3,"' + harga + '"\r\n';  // FIXED: font "3"
          y += 22;
        }

        // ── Barcode Number (as text) ─────────────
        // Always print manually — avoids double-print conflict
        cmd += 'TEXT ' + x + ',' + y + ',"3",0,1,1,"' + barcodeText + '"\r\n';  // FIXED: font "3"
        y += 18;

        // ── Date ──────────────────────────────────
        if (showDate) {
          cmd += 'TEXT ' + x + ',' + y + ',"3",0,1,1,"' + tgl + '"\r\n';  // FIXED: font "3"
        }
      }

      cmd += 'PRINT 1\r\n';
      allData += cmd;
    }

    // Save settings (if function exists)
    if (typeof updateSettings === 'function') {
      await updateSettings({
        label_width_mm: document.getElementById('labelWidthMM').value,
        label_height_mm: document.getElementById('labelHeightMM').value,
        label_gap_mm: document.getElementById('labelGapMM').value,
        label_direction: document.getElementById('labelDirection').value,
        label_offset_x: document.getElementById('labelOffsetX').value,
        label_offset_y: document.getElementById('labelOffsetY').value,
        label_cols: document.getElementById('labelCols').value,
        label_qty: document.getElementById('labelQty').value
      });
    }

    // Send data over BLE
    var data = encoder.encode(allData);
    for (var i = 0; i < data.byteLength; i += 256) {  // FIXED: chunk size 20 → 256
      var chunk = data.slice(i, Math.min(i + 256, data.byteLength));
      await labelCharacteristic.writeValue(chunk);
      await sleepLabel(80);
    }

    alert('✅ Label dicetak! (' + qty + ' pcs, ' + printCount + 'x cetak)');

  } catch (e) {
    console.error(e);
    alert('Gagal cetak label: ' + e.message);
  }
}