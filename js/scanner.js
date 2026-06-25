// ===================== SCANNER.JS =====================
// Handles barcode scanner input across all pages
// Barcode scanners act as keyboard input + Enter key

var scannerBuffer = '';
var scannerTimer = null;
var scannerActive = true;

// Initialize scanner on page load
function initScanner() {
  console.log('Scanner ready');
  
  // Global listener for scanner input
  document.addEventListener('keydown', function(e) {
    // Only process if scanner is active
    if (!scannerActive) return;
    
    // Check if this is scanner input (very fast typing)
    var now = new Date().getTime();
    
    if (e.key === 'Enter') {
      // Scanner sends Enter after barcode
      if (scannerBuffer.length > 3) {
        handleScannedBarcode(scannerBuffer.trim());
      }
      scannerBuffer = '';
      return;
    }
    
    // Accumulate scanner characters
    if (e.key.length === 1) {
      scannerBuffer += e.key;
      
      // Reset buffer after delay (manual typing is slower)
      clearTimeout(scannerTimer);
      scannerTimer = setTimeout(function() {
        scannerBuffer = '';
      }, 100);
    }
  });
}

// Route scanned barcode to the correct handler
function handleScannedBarcode(barcode) {
  console.log('Barcode scanned:', barcode);
  
  // Clean the barcode
  barcode = barcode.replace(/[^a-zA-Z0-9\-_]/g, '');
  if (!barcode) return;
  
  // Determine which page is active
  if (activeTab === 'transaksi') {
    // Add to cart
    if (typeof tambahProdukDariScan === 'function') {
      tambahProdukDariScan(barcode);
    }
  } else if (activeTab === 'inventory') {
    // Search product in inventory
    var prodInput = document.getElementById('prodBarcode');
    if (prodInput) {
      prodInput.value = barcode;
      if (typeof cariAtauTambahProduk === 'function') {
        cariAtauTambahProduk();
      }
    }
  }
}

// Enable/disable scanner
function setScannerActive(active) {
  scannerActive = active;
}

// Manual scan trigger (for on-screen button)
function triggerScan(barcode) {
  handleScannedBarcode(barcode);
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScanner);
} else {
  initScanner();
}