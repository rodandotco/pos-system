// ===================== PRINTER LABEL - Aiyin AD240-BT =====================
function getAD240Command(totalW, h, gap, ox, oy, cols, nama, harga, barcodeText, showNama, showHarga, showBarcode) {
  var cmd = '';
  cmd += 'SIZE ' + totalW + ',' + h + '\r\n';
  cmd += 'GAP 0,0\r\n';
  cmd += 'CLS\r\n';

  for (var col = 0; col < cols; col++) {
    var w = totalW / cols;
    var x = (col * (w + gap)) + 5 + ox;

    // Product Name (split at 20 chars) - same as MP234
    if (showNama) {
      var maxChars = 20;
      var line1 = nama;
      var line2 = '';
      if (nama.length > maxChars) {
        var splitAt = nama.lastIndexOf(' ', maxChars);
        if (splitAt === -1) splitAt = maxChars;
        line1 = nama.substring(0, splitAt);
        line2 = nama.substring(splitAt).trim();
      }
      cmd += 'TEXT ' + x + ',5,"3",0,1,1,"' + line1 + '"\r\n';
      if (line2) {
        cmd += 'TEXT ' + x + ',25,"3",0,1,1,"' + line2 + '"\r\n';
      }
    }

    // Barcode & Price - same positions as MP234
    if (showBarcode && showHarga) {
      cmd += 'BARCODE ' + x + ',43,"128",30,0,0,1,2,"' + barcodeText + '"\r\n';
      cmd += 'TEXT ' + (x + 150) + ',53,"3",0,1.3,1.3,"' + harga + '"\r\n';
    } else if (showBarcode) {
      cmd += 'BARCODE ' + x + ',43,"128",30,0,0,1,2,"' + barcodeText + '"\r\n';
    } else if (showHarga) {
      cmd += 'TEXT ' + x + ',43,"3",0,1.3,1.3,"' + harga + '"\r\n';
    }

    // Barcode Number - same position as MP234
    cmd += 'TEXT ' + x + ',80,"3",0,1,1,"' + barcodeText + '"\r\n';
  }

  cmd += 'PRINT 1\r\n';
  return cmd;
}