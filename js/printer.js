// ===================== PRINTER.JS =====================
var bluetoothDevice = null;
var bluetoothCharacteristic = null;

// Label printer (Aiyin AD240-BT BLE)
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

// ===================== LABEL PRINTER (Aiyin AD240-BT BLE) =====================
async function sambungLabelPrinter() {
  try {
    console.log('Requesting Bluetooth device...');
    
    labelPrinterDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '00001101-0000-1000-8000-00805f9b34fb',
        '00001800-0000-1000-8000-00805f9b34fb',
        '00001801-0000-1000-8000-00805f9b34fb',
        '0000180a-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000ff01-0000-1000-8000-00805f9b34fb',
        '0000ff02-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
      ]
    });
    
    console.log('Device selected:', labelPrinterDevice.name);
    console.log('Device ID:', labelPrinterDevice.id);
    
    var server = await labelPrinterDevice.gatt.connect();
    console.log('GATT connected!');
    
    var services = await server.getPrimaryServices();
    console.log('Found ' + services.length + ' services');
    
    for (var i = 0; i < services.length; i++) {
      console.log('Service ' + i + ': ' + services[i].uuid);
      
      try {
        var chars = await services[i].getCharacteristics();
        for (var j = 0; j < chars.length; j++) {
          console.log('  Char ' + j + ': ' + chars[j].uuid);
          console.log('  Properties: write=' + chars[j].properties.write + ', writeWoResp=' + chars[j].properties.writeWithoutResponse);
          
          if (chars[j].properties.write || chars[j].properties.writeWithoutResponse) {
            labelPrinterCharacteristic = chars[j];
            console.log('  -> USING THIS CHARACTERISTIC');
            updateLabelPrinterStatus(true);
            
            var msg = 'Label printer terhubung!\n\n';
            msg += 'Device: ' + labelPrinterDevice.name + '\n';
            msg += 'Service: ' + services[i].uuid.substring(0, 8) + '...\n';
            msg += 'Char: ' + chars[j].uuid.substring(0, 8) + '...';
            alert(msg);
            return;
          }
        }
      } catch (e) {
        console.log('  Error getting chars: ' + e.message);
      }
    }
    
    alert('Tidak menemukan characteristic.\nCek console (F12) untuk detail UUID.');
    updateLabelPrinterStatus(false);
    
  } catch (e) {
    console.error('Error:', e.message, e.name);
    
    if (e.name === 'NotFoundError') {
      alert('Tidak ada device ditemukan.\nPastikan printer menyala & dalam mode pairing (lampu biru berkedip).');
    } else if (e.name === 'SecurityError') {
      alert('Izin Bluetooth ditolak.\nSettings > Apps > Chrome > Permissions > Allow Bluetooth.');
    } else if (e.name === 'NetworkError') {
      alert('Gagal konek GATT.\n1. Restart printer\n2. Unpair dari Settings Bluetooth\n3. Coba lagi');
    } else {
      alert('Gagal: ' + e.message);
    }
    
    updateLabelPrinterStatus(false);
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

// ===================== CETAK LABEL 33x15mm 2 KOLOM (BeePRT via BLE) =====================
async function cetakLabelLangsung(barcode) {
  if (!labelPrinterDevice || !labelPrinterCharacteristic) {
    alert('Label printer tidak terhubung. Sambungkan dulu.');
    return;
  }

  var product = await getProductByBarcode(barcode);
  if (!product) return alert('Produk tidak ditemukan');

  var nama = (product.nama || 'Produk');
  var namaLine1 = nama.substring(0, 18);
  var namaLine2 = nama.length > 18 ? nama.substring(18, 36) : '';
  
  var harga = 'Rp ' + (product.harga_jual || 0).toLocaleString('id');
  var barcodeText = product.barcode || '';
  var tglCetak = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  // Try Style 1: With QRCODE command
  try {
    var encoder = new TextEncoder();
    var cmd = '';
    
    cmd += 'SIZE 33 mm,15 mm\r\n';
    cmd += 'GAP 2 mm,0\r\n';
    cmd += 'DIRECTION 1\r\n';
    cmd += 'CLS\r\n';
    
    // ===== LEFT LABEL =====
    cmd += 'QRCODE 5,5,L,3,A,"' + barcodeText + '"\r\n';
    cmd += 'TEXT 55,5,"1",0,1,1,"' + namaLine1 + '"\r\n';
    if (namaLine2) {
      cmd += 'TEXT 55,20,"1",0,1,1,"' + namaLine2 + '"\r\n';
    }
    cmd += 'TEXT 55,45,"1",0,2,2,"' + harga + '"\r\n';
    cmd += 'TEXT 5,100,"1",0,1,1,"' + barcodeText + '"\r\n';
    cmd += 'TEXT 55,100,"1",0,1,1,"' + tglCetak + '"\r\n';
    
    // ===== RIGHT LABEL =====
    var offsetX = 140;
    cmd += 'QRCODE ' + (5 + offsetX) + ',5,L,3,A,"' + barcodeText + '"\r\n';
    cmd += 'TEXT ' + (55 + offsetX) + ',5,"1",0,1,1,"' + namaLine1 + '"\r\n';
    if (namaLine2) {
      cmd += 'TEXT ' + (55 + offsetX) + ',20,"1",0,1,1,"' + namaLine2 + '"\r\n';
    }
    cmd += 'TEXT ' + (55 + offsetX) + ',45,"1",0,2,2,"' + harga + '"\r\n';
    cmd += 'TEXT ' + (5 + offsetX) + ',100,"1",0,1,1,"' + barcodeText + '"\r\n';
    cmd += 'TEXT ' + (55 + offsetX) + ',100,"1",0,1,1,"' + tglCetak + '"\r\n';
    
    cmd += 'PRINT 1\r\n';
    
    console.log('Sending label with QR...');
    
    var data = encoder.encode(cmd);
    for (var i = 0; i < data.byteLength; i += 20) {
      var end = Math.min(i + 20, data.byteLength);
      var chunk = data.slice(i, end);
      await labelPrinterCharacteristic.writeValue(chunk);
      await sleep(100);
    }
    
    console.log('Label sent!');
    alert('Label dicetak!');
    return;
    
  } catch (e1) {
    console.error('QR style failed:', e1.message);
  }
  
  // Try Style 2: Without QRCODE, use BARCODE instead
  try {
    var encoder2 = new TextEncoder();
    var cmd2 = '';
    
    cmd2 += 'SIZE 33 mm,15 mm\r\n';
    cmd2 += 'GAP 2 mm,0\r\n';
    cmd2 += 'DIRECTION 1\r\n';
    cmd2 += 'CLS\r\n';
    
    // Left label
    cmd2 += 'TEXT 5,5,"1",0,1,1,"' + namaLine1 + '"\r\n';
    if (namaLine2) cmd2 += 'TEXT 5,20,"1",0,1,1,"' + namaLine2 + '"\r\n';
    var priceY = namaLine2 ? 40 : 30;
    cmd2 += 'TEXT 5,' + priceY + ',"1",0,2,2,"' + harga + '"\r\n';
    cmd2 += 'TEXT 5,65,"1",0,1,1,"' + barcodeText + '"\r\n';
    cmd2 += 'TEXT 5,80,"1",0,1,1,"' + tglCetak + '"\r\n';
    cmd2 += 'BARCODE 5,95,"128",30,1,0,1,1,"' + barcodeText + '"\r\n';
    
    // Right label
    var offsetX2 = 140;
    cmd2 += 'TEXT ' + (5 + offsetX2) + ',5,"1",0,1,1,"' + namaLine1 + '"\r\n';
    if (namaLine2) cmd2 += 'TEXT ' + (5 + offsetX2) + ',20,"1",0,1,1,"' + namaLine2 + '"\r\n';
    cmd2 += 'TEXT ' + (5 + offsetX2) + ',' + priceY + ',"1",0,2,2,"' + harga + '"\r\n';
    cmd2 += 'TEXT ' + (5 + offsetX2) + ',65,"1",0,1,1,"' + barcodeText + '"\r\n';
    cmd2 += 'TEXT ' + (5 + offsetX2) + ',80,"1",0,1,1,"' + tglCetak + '"\r\n';
    cmd2 += 'BARCODE ' + (5 + offsetX2) + ',95,"128",30,1,0,1,1,"' + barcodeText + '"\r\n';
    
    cmd2 += 'PRINT 1\r\n';
    
    console.log('Trying without QR...');
    
    var data2 = encoder2.encode(cmd2);
    for (var k = 0; k < data2.byteLength; k += 20) {
      var chunk2 = data2.slice(k, Math.min(k + 20, data2.byteLength));
      await labelPrinterCharacteristic.writeValue(chunk2);
      await sleep(100);
    }
    
    alert('Label dicetak! (barcode)');
    return;
    
  } catch (e2) {
    console.error('Barcode style failed:', e2.message);
    
    // Last resort: Just text
    try {
      var encoder3 = new TextEncoder();
      var cmd3 = '';
      
      cmd3 += 'SIZE 33 mm,15 mm\r\n';
      cmd3 += 'GAP 2 mm,0\r\n';
      cmd3 += 'CLS\r\n';
      
      cmd3 += 'TEXT 5,10,"1",0,1,1,"' + namaLine1 + '"\r\n';
      cmd3 += 'TEXT 5,40,"1",0,2,2,"' + harga + '"\r\n';
      cmd3 += 'TEXT 5,80,"1",0,1,1,"' + barcodeText + '"\r\n';
      
      cmd3 += 'TEXT 145,10,"1",0,1,1,"' + namaLine1 + '"\r\n';
      cmd3 += 'TEXT 145,40,"1",0,2,2,"' + harga + '"\r\n';
      cmd3 += 'TEXT 145,80,"1",0,1,1,"' + barcodeText + '"\r\n';
      
      cmd3 += 'PRINT 1\r\n';
      
      var data3 = encoder3.encode(cmd3);
      for (var m = 0; m < data3.byteLength; m += 20) {
        var chunk3 = data3.slice(m, Math.min(m + 20, data3.byteLength));
        await labelPrinterCharacteristic.writeValue(chunk3);
        await sleep(100);
      }
      
      alert('Label dicetak! (text only)');
    } catch (e3) {
      alert('Gagal cetak: ' + e3.message);
    }
  }
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}