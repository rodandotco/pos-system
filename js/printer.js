// ===================== PRINTER.JS =====================
var bluetoothDevice = null;
var bluetoothCharacteristic = null;

// Label printer (PPLB - Aiyin AD240-BT)
var labelPrinterDevice = null;
var labelPrinterCharacteristic = null;

async function sambungPrinter() {
  try {
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });
    var server = await bluetoothDevice.gatt.connect();
    var service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    bluetoothCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    updateStatusPrinter(true);
    alert('Printer terhubung!');
    await simpanPengaturanCetak();
  } catch (e) {
    console.error(e);
    updateStatusPrinter(false);
    alert('Gagal terhubung: ' + e.message);
  }
}

async function putusPrinter() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    await bluetoothDevice.gatt.disconnect();
    bluetoothDevice = null;
    bluetoothCharacteristic = null;
    updateStatusPrinter(false);
    alert('Koneksi printer diputus');
  }
}

function updateStatusPrinter(connected) {
  var elements = [
    { led: 'ledTrans', text: 'printerStatusText', btn: 'btnPutusTrans' },
    { led: 'ledSetting', text: 'printerStatusTextSetting', btn: 'btnPutusSetting' }
  ];
  elements.forEach(function(el) {
    var led = document.getElementById(el.led);
    var text = document.getElementById(el.text);
    var btn = document.getElementById(el.btn);
    if (led) led.className = 'led ' + (connected ? 'led-green' : 'led-red');
    if (text) text.textContent = connected ? 'Printer terhubung' : 'Printer tidak terhubung';
    if (btn) btn.style.display = connected ? 'inline-block' : 'none';
  });
}

async function cetakStrukKePrinter(logoBase64, teks) {
  if (!bluetoothCharacteristic) {
    alert('Printer tidak terhubung');
    return;
  }
  try {
    var reset = new Uint8Array([0x1B, 0x40]);
    await bluetoothCharacteristic.writeValue(reset);
    await sleep(50);

    var encoder = new TextEncoder();
    var lines = teks.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (i < lines.length - 1) line += '\n';
      var data = encoder.encode(line);
      for (var j = 0; j < data.byteLength; j += 256) {
        var chunk = data.slice(j, j + 256);
        await bluetoothCharacteristic.writeValue(chunk);
      }
      await sleep(50);
    }

    var extraFeed = encoder.encode('\n\n\n');
    await bluetoothCharacteristic.writeValue(extraFeed);
    await sleep(50);

    var cut = encoder.encode('\x1B\x69');
    await bluetoothCharacteristic.writeValue(cut);
    await sleep(100);

    alert('Cetak berhasil');
  } catch (e) {
    console.error(e);
    alert('Gagal cetak: ' + e.message);
  }
}

async function getLebarKertasAktif() {
  var settings = await getSettings();
  return parseInt(settings.kertas_lebar) || 80;
}

async function testPrint() {
  var lebar = await getLebarKertasAktif();
  var charWidth = lebar === 80 ? 47 : 32;
  var garis = '='.repeat(charWidth);

  var teks = '';
  teks += garis + '\n';
  teks += '   TEST PRINT\n';
  teks += garis + '\n';
  teks += 'Lebar: ' + lebar + 'mm\n';
  teks += 'Tanggal: ' + new Date().toLocaleDateString('id-ID') + '\n';
  teks += garis + '\n';

  if (bluetoothDevice && bluetoothCharacteristic) {
    await cetakStrukKePrinter(null, teks);
  } else {
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: [lebar, 40] });
    doc.setFontSize(10);
    doc.text('Test Print', 3, 10);
    doc.text('Lebar: ' + lebar + 'mm', 3, 18);
    doc.text(new Date().toLocaleDateString('id-ID'), 3, 24);
    var blob = doc.output('blob');
    var url = URL.createObjectURL(blob);
    var pw = window.open(url, '_blank');
    if (pw) pw.addEventListener('load', function() { pw.print(); }, { once: true });
  }
}

// ===================== LABEL PRINTER (PPLB - Aiyin AD240-BT) =====================
async function sambungLabelPrinter() {
  try {
    labelPrinterDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });
    var server = await labelPrinterDevice.gatt.connect();
    var service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    labelPrinterCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    updateLabelPrinterStatus(true);
    alert('Label printer terhubung!');
  } catch (e) {
    console.error(e);
    updateLabelPrinterStatus(false);
    alert('Gagal hubung label printer: ' + e.message);
  }
}

async function putusLabelPrinter() {
  if (labelPrinterDevice && labelPrinterDevice.gatt.connected) {
    await labelPrinterDevice.gatt.disconnect();
    labelPrinterDevice = null;
    labelPrinterCharacteristic = null;
    updateLabelPrinterStatus(false);
  }
}

function updateLabelPrinterStatus(connected) {
  var statusEl = document.getElementById('labelPrinterStatus');
  if (statusEl) {
    statusEl.innerHTML = (connected ? '<span class="led led-green"></span> Label printer terhubung' : '<span class="led led-red"></span> Label printer tidak terhubung') + ' <button class="btn btn-sm" onclick="sambungLabelPrinter()" style="margin-left:8px;">🔗 Sambung Label</button> <button class="btn btn-sm btn-danger" onclick="putusLabelPrinter()">Putus</button>';
  }
}

// ===================== CETAK LABEL 33x15mm 2 KOLOM (PPLB) =====================
async function cetakLabelLangsung(barcode) {
  if (!labelPrinterDevice || !labelPrinterCharacteristic) {
    alert('Label printer tidak terhubung. Sambungkan dulu.');
    return;
  }

  var product = await getProductByBarcode(barcode);
  if (!product) return alert('Produk tidak ditemukan');

  var nama = (product.nama || 'Produk').substring(0, 24);
  var harga = 'Rp' + (product.harga_jual || 0).toLocaleString('id');
  var barcodeText = product.barcode || '';

  try {
    var encoder = new TextEncoder();
    
    // PPLB Commands for 33x15mm label, 2 columns, 2mm gap
    var cmd = '';
    
    // Start job: ! offset width height copies
    // 33mm at 203dpi = ~264 dots, 15mm = ~120 dots
    cmd += '! 0 200 200 120 1\r\n';
    cmd += 'LABEL\r\n';
    cmd += 'CONTRAST 2\r\n';
    cmd += 'SPEED 3\r\n';
    
    // Column 1 - Left label
    // TEXT x y rotation font size data
    cmd += 'TEXT 10 10 0 3 1 ' + nama + '\r\n';
    cmd += 'TEXT 10 50 0 4 2 ' + harga + '\r\n';
    cmd += 'TEXT 10 85 0 2 1 ' + barcodeText + '\r\n';
    // BARCODE x y rotation type height readable data
    cmd += 'BARCODE 10 100 0 128 2 1 ' + barcodeText + '\r\n';
    
    // Column 2 - Right label (offset by ~264 dots + 16 dot gap = 280)
    var col2x = 280;
    cmd += 'TEXT ' + col2x + ' 10 0 3 1 ' + nama + '\r\n';
    cmd += 'TEXT ' + col2x + ' 50 0 4 2 ' + harga + '\r\n';
    cmd += 'TEXT ' + col2x + ' 85 0 2 1 ' + barcodeText + '\r\n';
    cmd += 'BARCODE ' + col2x + ' 100 0 128 2 1 ' + barcodeText + '\r\n';
    
    // End and print
    cmd += 'END\r\n';
    cmd += 'FORM\r\n';
    cmd += 'PRINT\r\n';
    
    // Send to printer in small chunks
    var data = encoder.encode(cmd);
    var chunkSize = 64;
    for (var i = 0; i < data.byteLength; i += chunkSize) {
      var chunk = data.slice(i, Math.min(i + chunkSize, data.byteLength));
      await labelPrinterCharacteristic.writeValue(chunk);
      await sleep(50);
    }
    
    alert('Label dicetak!');
  } catch (e) {
    console.error(e);
    alert('Gagal cetak label: ' + e.message);
  }
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}