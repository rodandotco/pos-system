// ===================== PRINTER LABEL (BeePRT/PPLB) =====================
var labelDevice = null;
var labelCharacteristic = null;

async function sambungPrinterLabel() {
  try {
    labelDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '00001101-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '0000ff00-0000-1000-8000-00805f9b34fb'
      ]
    });
    
    var server = await labelDevice.gatt.connect();
    var services = await server.getPrimaryServices();
    
    for (var i = 0; i < services.length; i++) {
      try {
        var chars = await services[i].getCharacteristics();
        for (var j = 0; j < chars.length; j++) {
          if (chars[j].properties.write || chars[j].properties.writeWithoutResponse) {
            labelCharacteristic = chars[j];
            updateLabelStatus(true);
            alert('Label printer terhubung!');
            return;
          }
        }
      } catch (e) {}
    }
    
    throw new Error('No writable characteristic found');
  } catch (e) {
    console.error(e);
    updateLabelStatus(false);
    alert('Gagal hubung label printer: ' + e.message);
  }
}

async function putusPrinterLabel() {
  if (labelDevice && labelDevice.gatt.connected) {
    await labelDevice.gatt.disconnect();
    labelDevice = null;
    labelCharacteristic = null;
    updateLabelStatus(false);
  }
}

function updateLabelStatus(connected) {
  var led = document.getElementById('labelStatusLed');
  var text = document.getElementById('labelStatusText');
  if (led) led.className = 'led ' + (connected ? 'led-green' : 'led-red');
  if (text) text.textContent = connected ? 'Label printer terhubung' : 'Label printer tidak terhubung';
  
  var statusEl = document.getElementById('labelPrinterStatusMsg');
  if (statusEl) {
    var html = (connected ? '<span class="led led-green"></span> Label printer terhubung' : '<span class="led led-red"></span> Label printer tidak terhubung');
    html += ' <button class="btn btn-sm" onclick="sambungPrinterLabel()" style="margin-left:8px;">🔗 Sambung</button>';
    html += ' <button class="btn btn-sm btn-danger" onclick="putusPrinterLabel()">Putus</button>';
    statusEl.innerHTML = html;
  }
}

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

        // ── Product Name (auto split into 2 lines) ──
        if (showNama) {
          var maxChars = 14;
          var line1 = nama;
          var line2 = '';
          
          if (nama.length > maxChars) {
            var splitAt = nama.lastIndexOf(' ', maxChars);
            if (splitAt === -1) splitAt = maxChars;
            line1 = nama.substring(0, splitAt);
            line2 = nama.substring(splitAt).trim();
          }
          
          cmd += 'TEXT ' + x + ',' + y + ',"3",0,1,1,"' + line1 + '"\r\n';
          if (line2) {
            y += 20;
            cmd += 'TEXT ' + x + ',' + y + ',"3",0,1,1,"' + line2 + '"\r\n';
          }
          y += 30;
        }

        // ── Barcode & Price ───────────────────────
        if (showBarcode && showHarga) {
          cmd += 'BARCODE ' + x + ',' + y + ',"128",30,0,0,1,2,"' + barcodeText + '"\r\n';
          cmd += 'TEXT ' + (x + 150) + ',' + (y + 10) + ',"3",0,1.3,1.3,"' + harga + '"\r\n';
          y += 35;
        } else if (showBarcode) {
          cmd += 'BARCODE ' + x + ',' + y + ',"128",30,0,0,1,2,"' + barcodeText + '"\r\n';
          y += 35;
        } else if (showHarga) {
          cmd += 'TEXT ' + x + ',' + y + ',"3",0,1.3,1.3,"' + harga + '"\r\n';
          y += 22;
        }

        // ── Barcode Number ───────────────────────
        cmd += 'TEXT ' + x + ',' + y + ',"3",0,1,1,"' + barcodeText + '"\r\n';
        y += 18;

        // ── Date ──────────────────────────────────
        if (showDate) {
          cmd += 'TEXT ' + x + ',' + y + ',"3",0,1,1,"' + tgl + '"\r\n';
        }
      }

      cmd += 'PRINT 1\r\n';
      allData += cmd;
    }

    // Save settings to Supabase
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
    console.log('Total bytes to send:', data.byteLength);
    
    for (var i = 0; i < data.byteLength; i += 20) {
      var chunk = data.slice(i, Math.min(i + 20, data.byteLength));
      console.log('Sending chunk ' + Math.floor(i/20 + 1) + ': ' + chunk.byteLength + ' bytes');
      try {
        await labelCharacteristic.writeValueWithoutResponse(chunk);
      } catch (e1) {
        try {
          await labelCharacteristic.writeValue(chunk);
        } catch (e2) {
          console.error('Write failed at chunk ' + Math.floor(i/20 + 1) + ':', e2.message);
          throw e2;
        }
      }
      await sleepLabel(100);
    }
    
    console.log('All data sent successfully!');

    alert('✅ Label dicetak! (' + qty + ' pcs, ' + printCount + 'x cetak)');

  } catch (e) {
    console.error(e);
    alert('Gagal cetak label: ' + e.message);
  }
}

function mmToDotsLabel(mm) { return Math.round(mm * 8); }
function sleepLabel(ms) { return new Promise(function(resolve) { setTimeout(resolve, ms); }); }