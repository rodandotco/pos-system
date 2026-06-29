// ===================== CAMERA BARCODE SCANNER =====================
var cameraScannerActive = false;
var cameraCodeReader = null;
var cameraStream = null;
var cameraFacingMode = 'environment';
var lastScannedBarcode = '';
var scanTarget = 'transaksi';

// Beep sound using Web Audio API
function playBeep() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'square';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {
    // Fallback: ignore audio errors
  }
}

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
    if (cameraCodeReader) {
      cameraCodeReader.reset();
      cameraCodeReader = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(function(t) { t.stop(); });
      cameraStream = null;
    }
    
    // Show container with square aspect ratio
    var container = document.getElementById(containerId);
    container.style.display = 'block';
    container.style.cssText = 'margin-top:8px; position:relative; width:100%; max-width:300px; aspect-ratio:1/1; border-radius:12px; overflow:hidden; background:#000; margin-left:auto; margin-right:auto;';
    
    // Add scanning frame overlay
    var overlayHTML = '<div class="scan-overlay" style="position:absolute;top:0;left:0;right:0;bottom:0;z-index:2;pointer-events:none;">';
    overlayHTML += '<div style="position:absolute;top:15%;left:15%;right:15%;bottom:15%;border:3px solid #00ff00;border-radius:8px;">';
    overlayHTML += '<div class="scan-corner" style="position:absolute;top:-3px;left:-3px;width:20px;height:20px;border-top:4px solid #00ff00;border-left:4px solid #00ff00;"></div>';
    overlayHTML += '<div class="scan-corner" style="position:absolute;top:-3px;right:-3px;width:20px;height:20px;border-top:4px solid #00ff00;border-right:4px solid #00ff00;"></div>';
    overlayHTML += '<div class="scan-corner" style="position:absolute;bottom:-3px;left:-3px;width:20px;height:20px;border-bottom:4px solid #00ff00;border-left:4px solid #00ff00;"></div>';
    overlayHTML += '<div class="scan-corner" style="position:absolute;bottom:-3px;right:-3px;width:20px;height:20px;border-bottom:4px solid #00ff00;border-right:4px solid #00ff00;"></div>';
    overlayHTML += '<div class="scan-line" style="position:absolute;left:16%;right:16%;height:2px;background:#ff0000;animation:scanAnim 2s ease-in-out infinite;"></div>';
    overlayHTML += '</div></div>';
    overlayHTML += '<style>@keyframes scanAnim{0%{top:16%}50%{top:82%}100%{top:16%}}</style>';
    
    container.innerHTML = overlayHTML + '<video id="' + videoId + '" autoplay playsinline style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;"></video>';
    
    // Get camera
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: cameraFacingMode, width: { ideal: 1280 }, height: { ideal: 1280 } }
    });
    
    var video = document.getElementById(videoId);
    if (!video) {
      // Re-create if innerHTML removed it
      video = document.createElement('video');
      video.id = videoId;
      video.autoplay = true;
      video.playsInline = true;
      video.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;z-index:1;';
      container.appendChild(video);
    }
    video.srcObject = cameraStream;
    video.play();
    
    // Start ZXing
    cameraCodeReader = new ZXing.BrowserMultiFormatReader();
    
    cameraCodeReader.decodeFromVideoDevice(null, video, function(result, err) {
      if (result && !cameraScannerActive) {
        var text = result.getText();
        if (text !== lastScannedBarcode) {
          lastScannedBarcode = text;
          console.log('Camera scan: ' + text);
          
          // Play beep
          playBeep();
          
          // Flash green overlay
          var scanLine = container.querySelector('.scan-line');
          var corners = container.querySelectorAll('.scan-corner');
          if (scanLine) scanLine.style.background = '#00ff00';
          corners.forEach(function(c) {
            c.style.borderColor = '#00ff00';
          });
          setTimeout(function() {
            if (scanLine) scanLine.style.background = '#ff0000';
            corners.forEach(function(c) {
              c.style.borderColor = '#00ff00';
            });
          }, 300);
          
          // Route to correct input
          if (scanTarget === 'transaksi') {
            document.getElementById('scanInputTrans').value = text;
            if (typeof tambahProdukDariScan === 'function') {
              tambahProdukDariScan(text);
            }
          } else if (scanTarget === 'inventory') {
            document.getElementById('prodBarcode').value = text;
            if (typeof cariAtauTambahProduk === 'function') {
              cariAtauTambahProduk();
            }
          }
          
          // Prevent rapid re-scans
          cameraScannerActive = true;
          setTimeout(function() { cameraScannerActive = false; }, 2500);
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
  var container = document.getElementById(containerId);
  container.style.display = 'none';
  container.innerHTML = '';
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
  var statusEl = document.getElementById('bluetoothScannerStatus');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.textContent = '🔵 Bluetooth scanner aktif - scan barcode sekarang';
  }
}

function activateBluetoothScannerInv() {
  scanTarget = 'inventory';
  var input = document.getElementById('prodBarcode');
  input.focus();
  input.placeholder = 'Bluetooth scanner siap...';
}