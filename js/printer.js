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

  var nama = (product.nama || 'Produk').substring(0, 16);
  var harga = 'Rp' + (product.harga_jual || 0).toLocaleString('id');
  var barcodeText = product.barcode || '';

  try {
    var encoder = new TextEncoder();
    var cmd = '';
    
    // Single label: 264 dots wide, 120 dots high
    cmd += 'SIZE 264,120\r\n';
    cmd += 'GAP 0,0\r\n';
    cmd += 'CLS\r\n';
    
    // Print at different X positions to find the center
    cmd += 'TEXT 5,10,"1",0,1,1,"LEFT EDGE"\r\n';
    cmd += 'TEXT 70,30,"1",0,1,1,"CENTER"\r\n';
    cmd += 'TEXT 200,50,"1",0,1,1,"RIGHT>"\r\n';
    cmd += 'TEXT 5,70,"1",0,1,1,"' + nama + '"\r\n';
    cmd += 'TEXT 5,90,"1",0,1,1,"' + harga + '"\r\n';
    
    cmd += 'PRINT 1\r\n';
    
    console.log('Test print - single label positioning');
    
    var data = encoder.encode(cmd);
    for (var i = 0; i < data.byteLength; i += 20) {
      var end = Math.min(i + 20, data.byteLength);
      var chunk = data.slice(i, end);
      await labelPrinterCharacteristic.writeValue(chunk);
      await sleep(80);
    }
    
    alert('Test printed! Tell me:\n1. Is LEFT EDGE at the very left?\n2. Is RIGHT at the right edge?\n3. Is CENTER in the middle?\n4. Is anything cut off?');
    
  } catch (e) {
    console.error('Error:', e.message);
    alert('Gagal: ' + e.message);
  }
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}