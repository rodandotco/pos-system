// ===================== PRINTER LABEL - Aiyin AD240-BT =====================
function getAD240Command(totalW, h, gap, ox, oy, cols, nama, harga, barcodeText, showNama, showHarga, showBarcode) {
  var cmd = '';
  cmd += 'SIZE ' + totalW + ',' + h + '\r\n';
  cmd += 'GAP 0,0\r\n';
  cmd += 'CLS\r\n';

  for (var col = 0; col < cols; col++) {
    var w = totalW / cols;
    var x = (col * (w + gap)) + 10 + ox;
    var y = 10 + oy;

    if (showNama) {
      cmd += 'TEXT ' + x + ',' + y + ',"1",0,1,1,"' + nama + '"\r\n';
      y += 25;
    }
    if (showHarga) {
      cmd += 'TEXT ' + x + ',' + y + ',"1",0,1.5,1.5,"' + harga + '"\r\n';
      y += 30;
    }
    if (showBarcode) {
      cmd += 'BARCODE ' + x + ',' + y + ',"128",30,1,0,1,1,"' + barcodeText + '"\r\n';
      y += 35;
    }

    cmd += 'TEXT ' + x + ',' + y + ',"1",0,1,1,"' + barcodeText + '"\r\n';
  }

  cmd += 'PRINT 1\r\n';
  return cmd;
}