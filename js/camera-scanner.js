// ===================== CAMERA BARCODE SCANNER =====================
var cameraScannerActive = false;
var cameraCodeReader = null;
var cameraStream = null;
var cameraFacingMode = 'environment';
var lastScannedBarcode = '';
var scanTarget = 'transaksi'; // 'transaksi' or 'inventory'

// ===== TRANSAKSI PAGE =====
async function startCameraScanner() {
  scanTarget = 'transaksi';
  await initCameraScanner('cameraScannerVideo', 'cameraScannerContainer');
}

function stopCameraScanner() {
  scanTarget = 'transaksi';
  destroyCameraScanner('cameraScannerVideo', 'cameraScannerContainer');
}

// ===== INVENTORY PAGE =====
async function startCameraScannerInv() {
  scanTarget = 'inventory';
  await initCameraScanner('cameraScannerVideoInv', 'cameraScannerContainerInv');
}

function stopCameraScannerInv() {
  scanTarget = 'inventory';
  destroyCameraScanner('cameraScannerVideoInv', 'cameraScannerContainerInv');
}

// ===== CORE SCANNER =====
async function initCameraScanner(videoId, containerId) {
  try {
    // Stop any existing scanner
    if (cameraCodeReader) {
      cameraCodeReader.reset();
      cameraCodeReader = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(function(t) { t.stop(); });
      cameraStream = null;
    }
    
    // Show video container
    document.getElementById(containerId).style.display = 'block';
    
    // Get camera
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: cameraFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    
    var video = document.getElementById(videoId);
    video.srcObject = cameraStream;
    video.play();
    
    // Start ZXing
    cameraCodeReader = new ZXing.BrowserMultiFormatReader();
    
    cameraCodeReader.decodeFromVideoDevice(null, video, function(result, err) {
      if (result && cameraScannerActive === false) {
        var text = result.getText();
        if (text !== lastScannedBarcode) {
          lastScannedBarcode = text;
          console.log('Camera scan: ' + text);
          
          // Route to correct input
          if (scanTarget === 'transaksi') {
            document.getElementById('scanInputTrans').value = text;
            // Auto-trigger search
            if (typeof tambahProdukDariScan === 'function') {
              tambahProdukDariScan(text);
            }
          } else if (scanTarget === 'inventory') {
            document.getElementById('prodBarcode').value = text;
            if (typeof cariAtauTambahProduk === 'function') {
              cariAtauTambahProduk();
            }
          }
          
          // Flash feedback
          video.style.boxShadow = '0 0 20px #4caf50';
          setTimeout(function() { video.style.boxShadow = 'none'; }, 300);
          
          // Prevent rapid re-scans
          cameraScannerActive = true;
          setTimeout(function() { cameraScannerActive = false; }, 2000);
        }
      }
    });
    
    console.log('Camera scanner started for ' + scanTarget);
  } catch(e) {
    console.error('Camera error:', e);
    alert('Gagal mengakses kamera: ' + e.message);
    document.getElementById(containerId).style.display = 'none';
  }
}

function destroyCameraScanner(videoId, containerId) {
  if (cameraCodeReader) {
    cameraCodeReader.reset();
    cameraCodeReader = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach(function(t) { t.stop(); });
    cameraStream = null;
  }
  document.getElementById(containerId).style.display = 'none';
  lastScannedBarcode = '';
  cameraScannerActive = false;
  console.log('Camera scanner stopped');
}

// ===== BLUETOOTH SCANNER =====
function activateBluetoothScanner() {
  scanTarget = 'transaksi';
  var input = document.getElementById('scanInputTrans');
  input.focus();
  input.placeholder = 'Bluetooth scanner siap...';
  document.getElementById('bluetoothScannerStatus').style.display = 'block';
  document.getElementById('bluetoothScannerStatus').textContent = '🔵 Bluetooth scanner aktif - scan barcode sekarang';
}

function activateBluetoothScannerInv() {
  scanTarget = 'inventory';
  var input = document.getElementById('prodBarcode');
  input.focus();
  input.placeholder = 'Bluetooth scanner siap...';
}