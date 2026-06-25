// ===================== PRINTER STRUK (ESC/POS) =====================
var strukDevice = null;
var strukCharacteristic = null;

async function sambungPrinterStruk() {
  try {
    strukDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
    });
    var server = await strukDevice.gatt.connect();
    var service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    strukCharacteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
    updateStrukStatus(true);
    alert('Printer struk terhubung!');
    if (typeof simpanPengaturanCetak === 'function') simpanPengaturanCetak();
  } catch (e) {
    console.error(e);
    updateStrukStatus(false);
    alert('Gagal hubung printer struk: ' + e.message);
  }
}

async function putusPrinterStruk() {
  if (strukDevice && strukDevice.gatt.connected) {
    await strukDevice.gatt.disconnect();
    strukDevice = null;
    strukCharacteristic = null;
    updateStrukStatus(false);
  }
}

function updateStrukStatus(connected) {
  var elements = [
    { led: 'ledStrukTrans', text: 'strukStatusTextTrans', btn: 'btnPutusStrukTrans' },
    { led: 'ledStrukSetting', text: 'strukStatusTextSetting', btn: 'btnPutusStrukSetting' }
  ];
  elements.forEach(function(el) {
    var led = document.getElementById(el.led);
    var text = document.getElementById(el.text);
    var btn = document.getElementById(el.btn);
    if (led) led.className = 'led ' + (connected ? 'led-green' : 'led-red');
    if (text) text.textContent = connected ? 'Printer struk terhubung' : 'Printer struk tidak terhubung';
    if (btn) btn.style.display = connected ? 'inline-block' : 'none';
  });
}

async function cetakStrukKePrinter(logoBase64, teks) {
  if (!strukCharacteristic) {
    alert('Printer struk tidak terhubung');
    return;
  }
  try {
    var reset = new Uint8Array([0x1B, 0x40]);
    await strukCharacteristic.writeValue(reset);
    await sleepStruk(50);

    var encoder = new TextEncoder();
    var lines = teks.split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (i < lines.length - 1) line += '\n';
      var data = encoder.encode(line);
      for (var j = 0; j < data.byteLength; j += 256) {
        var chunk = data.slice(j, j + 256);
        await strukCharacteristic.writeValue(chunk);
      }
      await sleepStruk(50);
    }

    var extraFeed = encoder.encode('\n\n\n');
    await strukCharacteristic.writeValue(extraFeed);
    await sleepStruk(50);

    var cut = encoder.encode('\x1B\x69');
    await strukCharacteristic.writeValue(cut);
    await sleepStruk(100);

    alert('Cetak struk berhasil');
  } catch (e) {
    console.error(e);
    alert('Gagal cetak struk: ' + e.message);
  }
}

async function testPrintStruk() {
  var settings = typeof getSettings === 'function' ? await getSettings() : {};
  var lebar = parseInt(settings.kertas_lebar) || 80;
  var charWidth = lebar === 80 ? 47 : 32;
  var garis = '='.repeat(charWidth);
  var teks = garis + '\n   TEST PRINT STRUK\n' + garis + '\nLebar: ' + lebar + 'mm\n' + new Date().toLocaleDateString('id-ID') + '\n' + garis + '\n';

  if (strukDevice && strukCharacteristic) {
    await cetakStrukKePrinter(null, teks);
  } else {
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: [lebar, 40] });
    doc.setFontSize(10);
    doc.text('Test Print Struk', 3, 10);
    doc.text('Lebar: ' + lebar + 'mm', 3, 18);
    var blob = doc.output('blob');
    window.open(URL.createObjectURL(blob), '_blank');
  }
}

function sleepStruk(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}