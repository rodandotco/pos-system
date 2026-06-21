// DEBUG - Test if search works
console.log('Transaksi.js loaded');

// Override search function with debug version
const originalSearch = searchProductFn;
searchProductFn = function(query) {
  console.log('Search called with:', query);
  if (!query || query.length < 2) {
    console.log('Query too short, need 2+ characters');
    return;
  }
  originalSearch(query);
};

// ===================== TRANSAKSI.JS =====================
let cart = [];
let searchTimer = null;
let appSettings = {};
let isAdmin = false;
let totalDiskonValue = 0;
let bayarValue = 0;

let cachedSettings = null;

async function setupTransaksi() {
  isAdmin = (currentUser && currentUser.role === 'admin');

  try {
    if (cachedSettings) {
      appSettings = cachedSettings;
    } else {
      appSettings = await getSettings();
      cachedSettings = appSettings;
    }
  } catch (e) {
    console.warn('Gagal ambil settings, gunakan default:', e);
    appSettings = { diskon_item_enabled: true, diskon_total_enabled: true };
  }

  const staticTotalBox = document.querySelector('#page-transaksi .total-box');
  if (staticTotalBox) staticTotalBox.remove();
  document.querySelectorAll('#totalCart').forEach(el => el.remove());

  const oldPembayaranGroup = document.getElementById('pembayaranGroup');
  if (oldPembayaranGroup) oldPembayaranGroup.style.display = 'none';
  const oldKembalian = document.querySelector('#page-transaksi #kembalian');
  if (oldKembalian && oldKembalian.parentElement) {
    oldKembalian.parentElement.style.display = 'none';
  }
  const oldNominal = document.getElementById('nominalButtons');
  if (oldNominal) oldNominal.remove();

  let summaryContainer = document.getElementById('summaryContainer');
  if (!summaryContainer) {
    summaryContainer = document.createElement('div');
    summaryContainer.id = 'summaryContainer';
    summaryContainer.style.cssText = 'background: #f0f4f8; padding: 12px; border-radius: 8px; margin-top: 8px;';
    const cartTable = document.getElementById('cartTable');
    cartTable.parentNode.insertBefore(summaryContainer, cartTable.nextSibling);
    summaryContainer.innerHTML = `
      <div id="diskonContainer"></div>
      <div id="pembayaranSummary" style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; border-top:1px solid #d0d8e0; padding-top:8px;">
        <div>
          <strong style="font-size:16px;">PEMBAYARAN:</strong>
          <button class="btn btn-tunai" id="btnTunai" onclick="bukaPopupTunai()">TUNAI</button>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:bold;">BAYAR: Rp <span id="bayarDisplay">0</span></div>
          <div style="font-weight:bold;">Kembalian: Rp <span id="kembalianDisplay">0</span></div>
        </div>
      </div>
    `;
  }

  bayarValue = 0;
  updateBayarDisplay();

  document.getElementById('scanInputTrans').onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const b = e.target.value.trim();
      if (b) {
        e.target.value = '';
        tambahProdukDariScan(b);
      }
    }
  };

  const searchInput = document.getElementById('searchProduct');
  if (searchInput) {
    searchInput.oninput = () => searchProductFn(searchInput.value);
    searchInput.onfocus = () => searchProductFn(searchInput.value);
  }

  totalDiskonValue = 0;
  renderCart();
}

function updateBayarDisplay() {
  const display = document.getElementById('bayarDisplay');
  if (display) display.textContent = bayarValue.toLocaleString('id');
  hitungKembalian();
}

// ========== POP-UP TUNAI ==========
function bukaPopupTunai() {
  const modal = document.createElement('div');
  modal.id = 'popupTunaiModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';
  modal.innerHTML = `
    <div style="background:#fff;padding:20px;border-radius:8px;width:300px;text-align:center;">
      <h3>Pembayaran Tunai</h3>
      <div id="popupNominalGrid" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:12px;">
        ${[100000,50000,20000,10000,5000,2000,1000,500,200].map(n => 
          `<button class="nominal-btn-popup" onclick="tambahNominalPopup(${n})">Rp ${n.toLocaleString('id')}</button>`
        ).join('')}
      </div>
      <input type="number" id="inputBayarPopup" value="${bayarValue}" placeholder="0" style="width:100%;padding:8px;box-sizing:border-box;text-align:right;" onfocus="this.select()">
      <div style="margin-top:10px;">
        <button id="btnSimpanTunai" class="btn-sm">Simpan</button>
        <button id="btnBatalTunai" class="btn-sm btn-danger">Batal</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('btnSimpanTunai').onclick = () => {
    const nilai = parseInt(document.getElementById('inputBayarPopup').value) || 0;
    if (nilai < 0) { alert('Nilai tidak boleh negatif'); return; }
    bayarValue = nilai;
    updateBayarDisplay();
    document.body.removeChild(modal);
  };

  document.getElementById('btnBatalTunai').onclick = () => {
    document.body.removeChild(modal);
  };

  setTimeout(() => document.getElementById('inputBayarPopup').focus(), 100);
}

function tambahNominalPopup(nominal) {
  const input = document.getElementById('inputBayarPopup');
  input.value = (parseInt(input.value) || 0) + nominal;
}

// ========== PENCARIAN PRODUK ==========
function searchProductFn(query) {
  clearTimeout(searchTimer);
  const div = document.getElementById('searchResults');
  if (!div) return;
  if (!query || query.length < 2) {
    div.style.display = 'none';
    return;
  }
  searchTimer = setTimeout(async () => {
    const q = query.trim();
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .or(`nama.ilike.%${q}%,barcode.ilike.%${q}%,kategori.ilike.%${q}%`)
        .order('nama')
        .limit(15);
      if (error) {
        console.error(error);
        div.innerHTML = '<div class="search-item">Gagal mencari</div>';
        div.style.display = 'block';
        return;
      }
      if (!data || data.length === 0) {
        div.innerHTML = '<div class="