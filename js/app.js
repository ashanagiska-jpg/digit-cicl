// ==================== DATA MASTER ====================
const DEFAULT_WILAYAH_NAMES = ['Kabupaten Lahat','Kabupaten Muara Enim','Kabupaten PALI','Kabupaten Empat Lawang','Kota Pagar Alam'];
const DEFAULT_KEPOLISIAN_MAP = {
  'Kabupaten Lahat':['Polres Lahat','Polsek Kota Lahat','Polsek Merapi','Polsek Kikim Barat','Polsek Kikim Timur','Polsek Kikim Tengah','Polsek Kikim Selatan','Polsek Jarai','Polsek Pajar Bulan','Polsek Pulau Pinang','Polsek Tanjung Sakti','Polsek Mulak Ulu','Polsek Gumay Talang','Polsek Pseksu'],
  'Kabupaten Muara Enim':['Polres Muara Enim','Polsek Lawang Kidul','Polsek Muara Enim','Polsek Gelumbang','Polsek Tanjung Agung','Polsek Rambang Dangku','Polsek Benakat','Polsek Lembak','Polsek Sungai Rotan','Polsek Semende','Polsek Rambang','Polsek Rambang Lubai','Polsek Gunung Megang'],
  'Kabupaten PALI':['Polres PALI','Polsek Talang Ubi','Polsek Penukal Abab','Polsek Tanah Abang'],
  'Kabupaten Empat Lawang':['Polres Empat Lawang','Polsek Tebing Tinggi','Polsek Pendopo','Polsek Ulu Musi','Polsek Pasemah Air Keruh','Polsek Saling'],
  'Kota Pagar Alam':['Polres Pagar Alam','Polsek Pagar Alam Utara','Polsek Pagar Alam Selatan','Polsek Dempo Utara','Polsek Dempo Selatan']
};

function normalizeWilayahMaster(raw){
  if(!raw || !Array.isArray(raw) || !raw.length){
    return DEFAULT_WILAYAH_NAMES.map(name=>({ name, kode:'', status:'Aktif', catatan:'' }));
  }
  if(typeof raw[0] === 'string'){
    return raw.map(name=>({ name, kode:'', status:'Aktif', catatan:'' }));
  }
  return raw.map(w=>({
    name: String(w.name || w.nama || '').trim(),
    kode: String(w.kode || '').trim(),
    status: w.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
    catatan: String(w.catatan || '').trim()
  })).filter(w=>w.name);
}

function normalizeKepolisianMaster(raw){
  // Accept: object map {wilayah:[names]} OR array of {wilayah,nama,...}
  if(!raw) return flattenKepolisianMap(DEFAULT_KEPOLISIAN_MAP);
  if(Array.isArray(raw)){
    return raw.map(p=>({
      wilayah: String(p.wilayah || '').trim(),
      nama: String(p.nama || p.name || '').trim(),
      jenis: String(p.jenis || inferJenisPolisi(p.nama || p.name || '')).trim(),
      status: p.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
      catatan: String(p.catatan || '').trim()
    })).filter(p=>p.wilayah && p.nama);
  }
  // object map
  return flattenKepolisianMap(raw);
}
function inferJenisPolisi(nama){
  const n = String(nama||'').toLowerCase();
  if(n.includes('polres')) return 'Polres';
  if(n.includes('polsek')) return 'Polsek';
  return 'Lainnya';
}
function flattenKepolisianMap(map){
  const list = [];
  Object.keys(map||{}).forEach(wil=>{
    (map[wil]||[]).forEach(nama=>{
      list.push({ wilayah: wil, nama, jenis: inferJenisPolisi(nama), status:'Aktif', catatan:'' });
    });
  });
  return list;
}
function kepolisianMapFromMaster(list){
  const map = {};
  (list||[]).forEach(p=>{
    if(!p.wilayah || !p.nama) return;
    if(p.status === 'Nonaktif') return; // dropdown hanya aktif
    if(!map[p.wilayah]) map[p.wilayah] = [];
    if(!map[p.wilayah].includes(p.nama)) map[p.wilayah].push(p.nama);
  });
  return map;
}

let WILAYAH_MASTER = normalizeWilayahMaster(JSON.parse(localStorage.getItem('CICL_WILAYAH')||'null'));
/** Nama wilayah untuk dropdown — sinkron dari WILAYAH_MASTER (aktif saja). */
let WILAYAH = WILAYAH_MASTER.filter(w=>w.status!=='Nonaktif').map(w=>w.name);
// Pastikan semua nama (termasuk nonaktif) tetap di list internal untuk mapping
if(!WILAYAH.length) WILAYAH = WILAYAH_MASTER.map(w=>w.name);

let KEPOLISIAN_MASTER = (()=>{
  const stored = JSON.parse(localStorage.getItem('CICL_POLISI')||'null');
  if(stored && Array.isArray(stored)) return normalizeKepolisianMaster(stored);
  if(stored && typeof stored === 'object') return normalizeKepolisianMaster(stored);
  return normalizeKepolisianMaster(DEFAULT_KEPOLISIAN_MAP);
})();
/** Map wilayah → [nama unit] untuk dropdown form. */
let KEPOLISIAN = kepolisianMapFromMaster(KEPOLISIAN_MASTER);

function syncWilayahFromMaster(){
  WILAYAH = WILAYAH_MASTER.filter(w=>w.status!=='Nonaktif').map(w=>w.name);
  if(!WILAYAH.length) WILAYAH = WILAYAH_MASTER.map(w=>w.name);
}
function syncKepolisianFromMaster(){
  KEPOLISIAN = kepolisianMapFromMaster(KEPOLISIAN_MASTER);
  // Pastikan setiap wilayah punya key
  WILAYAH_MASTER.forEach(w=>{ if(!KEPOLISIAN[w.name]) KEPOLISIAN[w.name]=[]; });
}
// --- Data PK (model kaya, disimpan lokal + Google Sheet MasterPK) ---
const DEFAULT_PK_MASTER = [
  { name:'Firman Syahri', nip:'', jabatan:'PK Ahli Muda', status:'Aktif', wilayah_fokus:'Kabupaten Lahat', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Sarnudi', nip:'', jabatan:'PK Ahli Pertama', status:'Aktif', wilayah_fokus:'Kabupaten Lahat', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Merwandi', nip:'', jabatan:'PK Ahli Muda', status:'Aktif', wilayah_fokus:'Kabupaten Muara Enim', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Rinto Harahap', nip:'', jabatan:'PK Ahli Madya', status:'Aktif', wilayah_fokus:'Kabupaten Muara Enim', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Darwind Sepriyansyah', nip:'', jabatan:'PK Ahli Pertama', status:'Aktif', wilayah_fokus:'Kabupaten PALI', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'M. Habibur Rozak', nip:'', jabatan:'PK Ahli Muda', status:'Aktif', wilayah_fokus:'Kabupaten Empat Lawang', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'M. Eryzal Qarnein', nip:'', jabatan:'PK Ahli Pertama', status:'Aktif', wilayah_fokus:'Kota Pagar Alam', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Revan Kurniadi', nip:'', jabatan:'PK Ahli Pertama', status:'Aktif', wilayah_fokus:'Kabupaten Lahat', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Marendi Pusaka', nip:'', jabatan:'PK Ahli Muda', status:'Aktif', wilayah_fokus:'Kabupaten Muara Enim', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Armicho Roy Jaka Suma', nip:'', jabatan:'PK Ahli Pertama', status:'Aktif', wilayah_fokus:'Kabupaten PALI', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Henry Manumpak', nip:'', jabatan:'PK Ahli Madya', status:'Aktif', wilayah_fokus:'Kabupaten Empat Lawang', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Simamora', nip:'', jabatan:'PK Ahli Muda', status:'Aktif', wilayah_fokus:'Kota Pagar Alam', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Arief Tri Hantoro', nip:'', jabatan:'PK Ahli Pertama', status:'Aktif', wilayah_fokus:'Kabupaten Lahat', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Choirul Muslimah', nip:'', jabatan:'PK Ahli Muda', status:'Aktif', wilayah_fokus:'Kabupaten Muara Enim', telepon:'', email:'', tanggal_masuk:'', catatan:'' },
  { name:'Pinesthi Laksa Ambawani', nip:'', jabatan:'PK Ahli Pertama', status:'Aktif', wilayah_fokus:'Kabupaten Empat Lawang', telepon:'', email:'', tanggal_masuk:'', catatan:'' }
];

function normalizePkMaster(raw){
  if(!raw || !Array.isArray(raw) || !raw.length) return DEFAULT_PK_MASTER.map(p=>({...p}));
  if(typeof raw[0] === 'string'){
    return raw.map(name=>{
      const def = DEFAULT_PK_MASTER.find(d=>d.name===name);
      return def ? {...def} : { name, nip:'', jabatan:'PK', status:'Aktif', wilayah_fokus:'', telepon:'', email:'', tanggal_masuk:'', catatan:'' };
    });
  }
  return raw.map(p=>({
    name: String(p.name || p.nama || '').trim(),
    nip: String(p.nip || '').trim(),
    jabatan: String(p.jabatan || 'PK').trim() || 'PK',
    status: p.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
    wilayah_fokus: String(p.wilayah_fokus || p.wilayah || '').trim(),
    telepon: String(p.telepon || p.phone || '').trim(),
    email: String(p.email || '').trim(),
    tanggal_masuk: String(p.tanggal_masuk || '').trim(),
    catatan: String(p.catatan || '').trim()
  })).filter(p=>p.name);
}

let PK_MASTER = normalizePkMaster(JSON.parse(localStorage.getItem('CICL_PK')||'null'));
/** Nama PK untuk dropdown — selalu sinkron dengan PK_MASTER. */
let PK_LIST = PK_MASTER.map(p=>p.name);

function syncPkListFromMaster(){
  PK_LIST = PK_MASTER.map(p=>p.name);
}

let allData = JSON.parse(localStorage.getItem('CICL_DATA')||'[]');
let gsheetUrl = localStorage.getItem('CICL_GAS_URL') || 'https://script.google.com/macros/s/AKfycbxtFxetSm7wc7poQF7bzxYRQ2wfl0buyAer3XvYqeahYhphkUZ7HqJzeN5SAJTSp5F1FA/exec';
let geminiKey = localStorage.getItem('CICL_GEMINI_KEY') || '';
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];

// ID folder Google Drive tujuan unggahan berkas (dikelola lewat Code.gs / Apps Script).
const GDRIVE_FOLDER_SURAT = '1FXq_GhLqSBtPraAJ79k7cAfRtJYEClbg';
const GDRIVE_FOLDER_LITMAS_INTEGRASI = '1uKYValz8FE97rqPGpsP_iPxBRHw_-Zbn';
const GDRIVE_FOLDER_LITMAS_DIVERSI = '1rpmRyr7UYTdkKXOHr8I8AHrz6JC8PuvB';
const GDRIVE_FOLDER_LITMAS_SIDANG = '11hqqtoKxuu_42S9OrJFls3eiCtucevjc';

// ==================== SORTIR TABEL (klik header) ====================
let tableSort = {}; // { tableKey: {key, dir:'asc'|'desc'} }
let editSidangState = null; // {itemId, idx} - sidang row currently being edited
let editPutusanState = null; // itemId currently editing putusan, or null

// ==================== PAGINATION ====================
const PAGE_SIZE_DEFAULT = 10;
let pageState = {
  permintaan: 1,
  'reg-belum': 1,
  'reg-sudah': 1,
  adjudikasi: 1,
  pasca: 1,
  pk: 1,
  wilayah: 1,
  kepolisian: 1
};
let pageSize = PAGE_SIZE_DEFAULT;

function paginate(list, tableKey) {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (!pageState[tableKey] || pageState[tableKey] > pages) pageState[tableKey] = 1;
  const page = pageState[tableKey];
  const start = (page - 1) * pageSize;
  return { slice: list.slice(start, start + pageSize), total, pages, page, start };
}

function renderPagination(containerId, tableKey, total, pages, page, onChange) {
  let el = document.getElementById(containerId);
  if (!el) return;
  if (total <= pageSize) { el.innerHTML = total ? `<span class="text-xs text-slate-400">${total} data</span>` : ''; return; }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  let btns = '';
  const maxVisible = 5;
  let startP = Math.max(1, page - Math.floor(maxVisible / 2));
  let endP = Math.min(pages, startP + maxVisible - 1);
  if (endP - startP < maxVisible - 1) startP = Math.max(1, endP - maxVisible + 1);
  btns += `<button class="page-btn" ${page<=1?'disabled':''} onclick="changePage('${tableKey}',${page-1})"><i data-lucide="chevron-left" class="w-3.5 h-3.5"></i></button>`;
  if (startP > 1) btns += `<button class="page-btn" onclick="changePage('${tableKey}',1)">1</button>${startP>2?'<span class="px-1 text-slate-400">…</span>':''}`;
  for (let i = startP; i <= endP; i++) {
    btns += `<button class="page-btn ${i===page?'active':''}" onclick="changePage('${tableKey}',${i})">${i}</button>`;
  }
  if (endP < pages) btns += `${endP<pages-1?'<span class="px-1 text-slate-400">…</span>':''}<button class="page-btn" onclick="changePage('${tableKey}',${pages})">${pages}</button>`;
  btns += `<button class="page-btn" ${page>=pages?'disabled':''} onclick="changePage('${tableKey}',${page+1})"><i data-lucide="chevron-right" class="w-3.5 h-3.5"></i></button>`;
  el.innerHTML = `
    <span class="text-xs">Menampilkan <b>${from}–${to}</b> dari <b>${total}</b></span>
    <div class="pagination-btns">${btns}</div>`;
  lucide.createIcons();
}

function changePage(tableKey, page) {
  pageState[tableKey] = page;
  renderAllViews();
}

function compareValues(a, b){
  const av = (a===undefined||a===null) ? '' : a;
  const bv = (b===undefined||b===null) ? '' : b;
  if(typeof av === 'number' && typeof bv === 'number') return av - bv;
  const sa = String(av), sb = String(bv);
  // Coba bandingkan sebagai tanggal (format YYYY-MM-DD atau yang bisa di-parse Date)
  if(/^\d{4}-\d{2}-\d{2}/.test(sa) && /^\d{4}-\d{2}-\d{2}/.test(sb)){
    const da = new Date(sa).getTime(), db = new Date(sb).getTime();
    if(!isNaN(da) && !isNaN(db)) return da - db;
  }
  return sa.localeCompare(sb, 'id', {numeric:true, sensitivity:'base'});
}
function sortByTable(list, tableKey, getter){
  const s = tableSort[tableKey];
  if(!s || !s.key) return list;
  const arr = list.slice();
  arr.sort((a,b)=>{
    const cmp = compareValues(getter(a,s.key), getter(b,s.key));
    return s.dir==='desc' ? -cmp : cmp;
  });
  return arr;
}
function updateSortIndicators(){
  document.querySelectorAll('th.sortable').forEach(th=>{
    const table = th.dataset.table, key = th.dataset.key;
    const s = tableSort[table];
    const arrow = th.querySelector('.sort-arrow');
    if(!arrow) return;
    arrow.textContent = (s && s.key===key) ? (s.dir==='asc'?'▲':'▼') : '';
  });
}
document.addEventListener('click', function(e){
  const th = e.target.closest('th.sortable');
  if(!th) return;
  const table = th.dataset.table, key = th.dataset.key;
  if(!table || !key) return;
  const cur = tableSort[table];
  tableSort[table] = { key, dir: (cur && cur.key===key && cur.dir==='asc') ? 'desc' : 'asc' };
  renderAllViews();
});

// ==================== AUTENTIKASI (ADMIN / TAMU) ====================
const ADMIN_USERNAME = 'Naer';
const ADMIN_PASSWORD = 'adp1212';
let currentRole = localStorage.getItem('CICL_ROLE') || null; // 'admin' | 'guest' | null
let currentUserLabel = localStorage.getItem('CICL_USER_LABEL') || '';

function isAdmin(){ return currentRole === 'admin'; }

// Dipanggil di awal setiap fungsi yang mengubah data. Mengembalikan true jika akses ditolak.
function guardWrite(){
  if(!isAdmin()){
    showToast('Mode Tamu: hanya dapat melihat data (view only)', 'error');
    return true;
  }
  return false;
}

function showRoleStep(){
  document.getElementById('login-step-admin').classList.add('hidden');
  document.getElementById('login-step-role').classList.remove('hidden');
  document.getElementById('login-error').classList.add('hidden');
}
function showAdminLoginForm(){
  document.getElementById('login-step-role').classList.add('hidden');
  document.getElementById('login-step-admin').classList.remove('hidden');
  setTimeout(()=>document.getElementById('login-username')?.focus(), 50);
}
function submitAdminLogin(){
  const u = document.getElementById('login-username').value.trim();
  const p = document.getElementById('login-password').value;
  if(u === ADMIN_USERNAME && p === ADMIN_PASSWORD){
    completeLogin('admin', u);
  } else {
    document.getElementById('login-error').classList.remove('hidden');
  }
}
function loginAsGuest(){
  completeLogin('guest', 'Tamu');
}
function completeLogin(role, label){
  currentRole = role;
  currentUserLabel = label;
  localStorage.setItem('CICL_ROLE', role);
  localStorage.setItem('CICL_USER_LABEL', label);
  document.getElementById('login-overlay').style.display = 'none';
  applyRoleUI();
  showToast(role === 'admin' ? `Selamat datang, ${label}` : 'Masuk sebagai Tamu (view only)', 'success');
}
function logoutUser(){
  if(!confirm('Keluar dari sesi ini?')) return;
  currentRole = null; currentUserLabel = '';
  localStorage.removeItem('CICL_ROLE');
  localStorage.removeItem('CICL_USER_LABEL');
  document.getElementById('login-overlay').style.display = 'flex';
  showRoleStep();
  document.getElementById('login-username').value=''; document.getElementById('login-password').value='';
}
function applyRoleUI(){
  document.body.classList.toggle('guest-mode', currentRole !== 'admin');
  const lbl = document.getElementById('logged-user-label');
  if(lbl) lbl.textContent = currentRole === 'admin' ? `${currentUserLabel} (Admin)` : 'Tamu (View Only)';
  renderAllViews();
  lucide.createIcons();
}
function initAuth(){
  const overlay = document.getElementById('login-overlay');
  if(currentRole === 'admin' || currentRole === 'guest'){
    overlay.style.display = 'none';
    applyRoleUI();
  } else {
    overlay.style.display = 'flex';
  }
  lucide.createIcons();
}

function saveAll(){ localStorage.setItem('CICL_DATA', JSON.stringify(allData)); }
function saveMaster(){
  localStorage.setItem('CICL_WILAYAH', JSON.stringify(WILAYAH_MASTER));
  localStorage.setItem('CICL_POLISI', JSON.stringify(KEPOLISIAN_MASTER));
  localStorage.setItem('CICL_PK', JSON.stringify(PK_MASTER));
  syncPkListFromMaster();
  syncWilayahFromMaster();
  syncKepolisianFromMaster();
}

/** Push seluruh daftar PK ke Google Sheet (sheet MasterPK). */
async function pushPkListToSheet(){
  if(!gsheetUrl) return;
  try{
    await postToSheetJSON('save_pk_list', { list: PK_MASTER });
  }catch(e){
    console.error('pushPkListToSheet:', e);
    throw e;
  }
}

/** Upsert satu PK ke sheet. */
async function pushPkUpsertToSheet(payload, oldName){
  if(!gsheetUrl) return;
  try{
    await postToSheetJSON('upsert_pk', { ...payload, oldName: oldName || '' });
  }catch(e){
    console.error('pushPkUpsertToSheet:', e);
    throw e;
  }
}

/** Hapus satu PK di sheet. */
async function pushPkDeleteToSheet(name){
  if(!gsheetUrl) return;
  try{
    await postToSheetJSON('delete_pk', { name });
  }catch(e){
    console.error('pushPkDeleteToSheet:', e);
    throw e;
  }
}

/** Ambil master PK dari Google Sheet. */
async function fetchPkFromSheet(){
  const url = normalizeGasUrl(gsheetUrl);
  if(!url) return null;
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(url + sep + 'resource=pk', { method:'GET', redirect:'follow', cache:'no-store' });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch(e){
    throw new Error('Respons PK bukan JSON: ' + raw.slice(0,100));
  }
  if(data && data.status === 'error') throw new Error(data.message || 'Gagal ambil PK');
  if(!Array.isArray(data)) throw new Error('Format master PK tidak valid');
  return data;
}

async function fetchWilayahFromSheet(){
  const url = normalizeGasUrl(gsheetUrl);
  if(!url) return null;
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(url + sep + 'resource=wilayah', { method:'GET', redirect:'follow', cache:'no-store' });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch(e){ throw new Error('Respons wilayah bukan JSON'); }
  if(data && data.status === 'error') throw new Error(data.message || 'Gagal ambil wilayah');
  if(!Array.isArray(data)) throw new Error('Format master wilayah tidak valid');
  return data;
}
async function fetchKepolisianFromSheet(){
  const url = normalizeGasUrl(gsheetUrl);
  if(!url) return null;
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(url + sep + 'resource=kepolisian', { method:'GET', redirect:'follow', cache:'no-store' });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch(e){ throw new Error('Respons kepolisian bukan JSON'); }
  if(data && data.status === 'error') throw new Error(data.message || 'Gagal ambil kepolisian');
  if(!Array.isArray(data)) throw new Error('Format master kepolisian tidak valid');
  return data;
}
async function pushWilayahListToSheet(){
  if(!gsheetUrl) return;
  await postToSheetJSON('save_wilayah_list', { list: WILAYAH_MASTER });
}
async function pushKepolisianListToSheet(){
  if(!gsheetUrl) return;
  await postToSheetJSON('save_kepolisian_list', { list: KEPOLISIAN_MASTER });
}
async function pushWilayahUpsertToSheet(payload, oldName){
  if(!gsheetUrl) return;
  await postToSheetJSON('upsert_wilayah', { ...payload, oldName: oldName||'' });
}
async function pushWilayahDeleteToSheet(name){
  if(!gsheetUrl) return;
  await postToSheetJSON('delete_wilayah', { name });
}
async function pushKepolisianUpsertToSheet(payload, oldWilayah, oldName){
  if(!gsheetUrl) return;
  await postToSheetJSON('upsert_kepolisian', { ...payload, oldWilayah: oldWilayah||'', oldName: oldName||'' });
}
async function pushKepolisianDeleteToSheet(wilayah, nama){
  if(!gsheetUrl) return;
  await postToSheetJSON('delete_kepolisian', { wilayah, nama });
}


function uid(){ return String(Date.now()) + Math.floor(Math.random()*1000); }

function showToast(msg, type='info'){
  const c = document.getElementById('toast-container'); if(!c) return;
  const bg = type==='success'?'bg-emerald-600':type==='error'?'bg-red-600':'bg-blue-600';
  const icon = type==='success'?'check-circle-2':type==='error'?'alert-circle':'info';
  const t = document.createElement('div'); t.className = `toast ${bg} text-white font-medium flex items-center gap-2`;
  t.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0"></i><span>${msg}</span>`;
  c.appendChild(t); lucide.createIcons();
  setTimeout(()=>t.remove(), type==='success'?3000:4000);
}
// Popup "Berhasil" yang lebih menonjol dipakai setiap kali proses simpan selesai di semua menu.
function showSuccessPopup(msg){ showToast(msg, 'success'); }

function toggleDarkMode(){ document.documentElement.classList.toggle('dark'); renderAllCharts(); }

// ==================== NAVIGATION ====================
function navigateTo(pageId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const t = document.getElementById('page-'+pageId);
  if(t){
    // Restart page enter animation
    t.classList.remove('active');
    void t.offsetWidth;
    t.classList.add('active');
  }
  document.querySelectorAll('.sidebar-link').forEach(l=>l.classList.toggle('active', l.getAttribute('data-page')===pageId));
  const titles = {dashboard:'Dashboard Monitoring', permintaan:'Permintaan Litmas ABH', registrasi:'Registrasi Anak', adjudikasi:'Tracking Adjudikasi', pasca:'Pasca Adjudikasi (Bimbingan)', pk:'Data PK', wilayah:'Wilayah Kerja', kepolisian:'Data Kepolisian', rekap:'Rekapitulasi PK', statistik:'Statistik & Visualisasi'};
  const titleEl = document.getElementById('nav-title');
  if(titleEl){
    titleEl.style.animation = 'none';
    void titleEl.offsetWidth;
    titleEl.textContent = titles[pageId] || 'DIGIT-CICL';
    titleEl.style.animation = 'fadeUp 0.35s cubic-bezier(0.22,1,0.36,1) both';
  }
  closeSidebar();
  renderAllViews();
}
function openSidebar(){ document.getElementById('sidebar').classList.remove('-translate-x-full'); document.getElementById('sidebar-overlay').classList.remove('hidden'); }
function closeSidebar(){ document.getElementById('sidebar').classList.add('-translate-x-full'); document.getElementById('sidebar-overlay').classList.add('hidden'); }
function toggleSidebar(){ document.getElementById('sidebar').classList.contains('-translate-x-full') ? openSidebar() : closeSidebar(); }

function openModal(html){ document.getElementById('modal-box').innerHTML = html; document.getElementById('modal-overlay').style.display='flex'; lucide.createIcons(); }
function closeModal(){ document.getElementById('modal-overlay').style.display='none'; }

function initDropdowns(){
  ['f-wilayah-p'].forEach(id=>{
    const el = document.getElementById(id); if(!el) return;
    el.innerHTML = '<option value="">Semua Wilayah</option>' + WILAYAH.map(w=>`<option>${w}</option>`).join('');
  });
}

// ==================== SETTINGS MODAL ====================
function openSettingsModal(){
  if(!isAdmin()){ showToast('Pengaturan hanya untuk Admin','error'); return; }
  openModal(`
    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">Pengaturan</h3><button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <div class="space-y-4">
      <div><label class="fl">Gemini API Key (untuk AI Scan)</label>
        <input class="form-input" id="set-gemini" value="${geminiKey}" placeholder="AIza...">
        <p class="text-[11px] text-slate-500 mt-1">Kunci disimpan hanya di browser Anda (localStorage), tidak dikirim ke server manapun selain Google Gemini.</p>
        <button type="button" class="btn btn-ghost btn-sm mt-2" onclick="testGeminiKey()"><i data-lucide="plug-zap" class="w-3.5 h-3.5"></i>Tes Koneksi & Kuota</button>
        <p id="gemini-test-result" class="text-xs mt-1"></p>
      </div>
      <div><label class="fl">URL Web App Google Apps Script (opsional, untuk sinkron Google Sheet)</label>
        <input class="form-input" id="set-gas" value="${gsheetUrl}" placeholder="https://script.google.com/macros/s/.../exec">
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
        <button class="btn btn-primary" onclick="saveSettings()">Simpan</button>
      </div>
    </div>
  `);
}
async function testGeminiKey(){
  const key = document.getElementById('set-gemini').value.trim();
  const out = document.getElementById('gemini-test-result');
  if(!key){ out.textContent = 'Isi API Key dulu.'; out.className='text-xs mt-1 text-red-500'; return; }
  out.textContent = 'Menguji koneksi...'; out.className='text-xs mt-1 text-slate-500';
  try{
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`;
    const res = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{role:'user',parts:[{text:'ping'}]}]})});
    if(res.status===429){ out.textContent = '429 - Kuota/rate limit API key ini sudah terlampaui. Coba lagi nanti atau cek kuota di Google AI Studio.'; out.className='text-xs mt-1 text-amber-500 font-semibold'; return; }
    if(res.status===400 || res.status===403){ out.textContent = 'API Key tidak valid / tidak punya akses ke model ini.'; out.className='text-xs mt-1 text-red-500 font-semibold'; return; }
    if(!res.ok){ out.textContent = 'Gagal terhubung, HTTP '+res.status; out.className='text-xs mt-1 text-red-500'; return; }
    out.textContent = 'Berhasil! API Key valid dan siap dipakai.'; out.className='text-xs mt-1 text-emerald-500 font-semibold';
  }catch(e){ out.textContent = 'Gagal terhubung: '+e.message; out.className='text-xs mt-1 text-red-500'; }
}
function saveSettings(){
  if(guardWrite())return;
  geminiKey = document.getElementById('set-gemini').value.trim();
  gsheetUrl = document.getElementById('set-gas').value.trim();
  localStorage.setItem('CICL_GEMINI_KEY', geminiKey);
  localStorage.setItem('CICL_GAS_URL', gsheetUrl);
  showToast('Pengaturan disimpan','success');
  closeModal();
}

// ==================== 1. PERMINTAAN LITMAS ====================
function updatePolisiOptionsIn(prefix){
  const wil = document.getElementById(prefix+'-wilayah').value;
  const polSel = document.getElementById(prefix+'-polisi');
  const list = KEPOLISIAN[wil] || [];
  polSel.innerHTML = '<option value="">Pilih Kepolisian</option>' + list.map(p=>`<option>${p}</option>`).join('');
}

function openLitmasModal(id, useAI){
  const item = id ? allData.find(d=>d.id===id) : null;
  const wilOpts = WILAYAH.map(w=>`<option ${item&&item.wilayah_asal===w?'selected':''}>${w}</option>`).join('');
  const pkOpts = PK_LIST.map(p=>`<option ${item&&item.nama_pk===p?'selected':''}>${p}</option>`).join('');
  openModal(`
    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">${item?'Edit':'Input'} Permintaan Litmas</h3><button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    ${!item ? `
    <div class="flex gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
      <div class="tabbtn ${useAI?'':'active'}" id="tab-manual" onclick="switchLitmasTab(false)">Input Manual</div>
      <div class="tabbtn ${useAI?'active':''}" id="tab-ai" onclick="switchLitmasTab(true)">AI Scan (Gemini)</div>
    </div>
    <div id="ai-scan-block" class="${useAI?'':'hidden'} mb-4">
      <div class="dropzone" onclick="document.getElementById('ai-file-input').click()">
        <i data-lucide="upload-cloud" class="w-8 h-8 mx-auto text-slate-400 mb-2"></i>
        <p class="text-sm font-semibold">Klik untuk unggah PDF / JPG / PNG</p>
        <p class="text-xs text-slate-500 mt-1">AI akan mengekstrak data surat permintaan litmas secara otomatis.</p>
      </div>
      <input type="file" id="ai-file-input" class="hidden" accept=".pdf,.jpg,.jpeg,.png" onchange="handleAIFile(this.files[0])">
      <div id="ai-scan-status" class="hidden mt-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-2">
        <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span id="ai-scan-text">Memproses...</span>
      </div>
    </div>` : ''}
    <form id="litmas-form" class="grid grid-cols-1 sm:grid-cols-2 gap-3" onsubmit="event.preventDefault(); saveLitmas('${item?item.id:''}')">
      <div><label class="fl">Nomor Surat</label><input class="form-input" id="fm-nosurat" value="${item?item.nomor_surat||'':''}" required></div>
      <div><label class="fl">Jenis Litmas</label>
        <select class="form-input" id="fm-jenislitmas" required onchange="updateLitmasFormExtras()">
          <option value="">Pilih</option>
          <option ${item&&item.jenis_litmas==='Litmas Integrasi'?'selected':''}>Litmas Integrasi</option>
          <option ${item&&item.jenis_litmas==='Litmas Pendampingan ABH'?'selected':''}>Litmas Pendampingan ABH</option>
        </select>
      </div>
      <div><label class="fl">Tanggal Surat</label><input type="date" class="form-input" id="fm-tglsurat" value="${item?item.tanggal_surat||'':''}" required></div>
      <div><label class="fl">Tanggal Diterima</label><input type="date" class="form-input" id="fm-tglditerima" value="${item?item.tanggal_diterima||'':''}" required></div>
      <div><label class="fl">Nama Anak</label><input class="form-input" id="fm-nama" value="${item?item.nama_anak||'':''}" required></div>
      <div><label class="fl">Jenis Kelamin</label><select class="form-input" id="fm-jk"><option ${item&&item.jenis_kelamin==='Laki-laki'?'selected':''}>Laki-laki</option><option ${item&&item.jenis_kelamin==='Perempuan'?'selected':''}>Perempuan</option></select></div>
      <div><label class="fl">Jenis Perkara</label><input class="form-input" id="fm-perkara" value="${item?item.jenis_perkara||'':''}"></div>
      <div><label class="fl">Wilayah</label><select class="form-input" id="fm-wilayah" onchange="updatePolisiOptionsIn('fm')"><option value="">Pilih Wilayah</option>${wilOpts}</select></div>
      <div><label class="fl">Instansi Pengirim (Kepolisian)</label><select class="form-input" id="fm-polisi"><option value="">Pilih Kepolisian</option></select></div>
      <div><label class="fl">PK Pembimbing</label><select class="form-input" id="fm-pk"><option value="">Pilih PK</option>${pkOpts}</select>
        <button type="button" onclick="recommendPkAI()" class="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-1" id="btn-rekomen-pk"><i data-lucide="sparkles" class="w-3 h-3"></i>Rekomendasi PK (AI)</button>
        <div id="rekomen-pk-box" class="hidden mt-2 space-y-2">
          <div class="flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300 text-[11px]"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i><span>3 Rekomendasi PK dari AI (berdasarkan beban kerja) &mdash; pilih salah satu, keputusan akhir tetap di tangan Anda:</span></div>
          <div id="rekomen-pk-list" class="grid grid-cols-1 gap-2"></div>
        </div>
      </div>
      <div><label class="fl">Status Litmas</label><select class="form-input" id="fm-status" onchange="updateLitmasFormExtras()"><option ${item&&item.status_jenis==='Proses'?'selected':''}>Proses</option><option ${item&&item.status_jenis==='Selesai'?'selected':''}>Selesai</option><option ${item&&item.status_jenis==='Pending'?'selected':''}>Pending</option></select></div>
      <div class="sm:col-span-2"><label class="fl">Keterangan</label><textarea class="form-input" id="fm-ket" rows="2">${item?item.keterangan||'':''}</textarea></div>

      <div class="sm:col-span-2 pt-1 border-t border-slate-200 dark:border-slate-700"></div>
      <div class="sm:col-span-2">
        <label class="fl">Berkas Surat Permintaan (JPG/PDF) ${item?'':'<span class="text-red-500">*</span>'}</label>
        <input type="file" class="form-input" id="fm-surat-file" accept=".pdf,.jpg,.jpeg,.png">
        <p class="text-[11px] text-slate-500 mt-1">Wajib diunggah saat menyimpan &mdash; akan disimpan otomatis ke Google Drive.</p>
        ${item&&item.link_surat_permintaan ? `<a href="${item.link_surat_permintaan}" target="_blank" class="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"><i data-lucide="file-text" class="w-3.5 h-3.5"></i>Lihat berkas surat yang tersimpan</a><p class="text-[11px] text-slate-500 mt-0.5">Kosongkan jika tidak ingin mengganti berkas.</p>` : ''}
      </div>

      <div class="sm:col-span-2 hidden" id="fm-berkas-block">
        <label class="fl">Berkas Litmas (PDF) &mdash; wajib saat Status = Selesai <span class="text-red-500">*</span></label>
        <input type="file" class="form-input" id="fm-berkas-file" accept=".pdf">
        <div class="mt-2 hidden" id="fm-kategori-block">
          <label class="fl">Kategori Berkas Litmas</label>
          <select class="form-input" id="fm-kategori-berkas">
            <option value="">Pilih Kategori</option>
            <option value="Diversi" ${item&&item.kategori_berkas==='Diversi'?'selected':''}>Litmas Diversi</option>
            <option value="Sidang" ${item&&item.kategori_berkas==='Sidang'?'selected':''}>Litmas Sidang</option>
          </select>
          <p class="text-[11px] text-slate-500 mt-1">Menentukan folder Google Drive tujuan berkas untuk Litmas Pendampingan ABH.</p>
        </div>
        ${item&&item.link_berkas_litmas ? `<a href="${item.link_berkas_litmas}" target="_blank" class="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"><i data-lucide="file-check-2" class="w-3.5 h-3.5"></i>Lihat berkas litmas yang tersimpan</a><p class="text-[11px] text-slate-500 mt-0.5">Kosongkan jika tidak ingin mengganti berkas.</p>` : ''}
      </div>

      <div class="sm:col-span-2 flex justify-end gap-2 pt-2">
        <button type="button" class="btn btn-ghost" onclick="closeModal()">Batal</button>
        <button type="submit" class="btn btn-primary">Simpan</button>
      </div>
    </form>
  `);
  if(item && item.wilayah_asal){ document.getElementById('fm-wilayah').value = item.wilayah_asal; updatePolisiOptionsIn('fm'); document.getElementById('fm-polisi').value = item.kepolisian||''; }
  updateLitmasFormExtras();
}
// Menampilkan/menyembunyikan blok unggah berkas litmas & pilihan kategori
// sesuai Status Litmas dan Jenis Litmas yang dipilih.
function updateLitmasFormExtras(){
  const statusEl = document.getElementById('fm-status'); const jenisEl = document.getElementById('fm-jenislitmas');
  const berkasBlock = document.getElementById('fm-berkas-block'); const kategoriBlock = document.getElementById('fm-kategori-block');
  if(!statusEl || !berkasBlock) return;
  const isSelesai = statusEl.value === 'Selesai';
  berkasBlock.classList.toggle('hidden', !isSelesai);
  const isPendampingan = jenisEl && jenisEl.value === 'Litmas Pendampingan ABH';
  if(kategoriBlock) kategoriBlock.classList.toggle('hidden', !(isSelesai && isPendampingan));
  lucide.createIcons();
}
function switchLitmasTab(ai){
  document.getElementById('tab-manual').classList.toggle('active', !ai);
  document.getElementById('tab-ai').classList.toggle('active', ai);
  document.getElementById('ai-scan-block').classList.toggle('hidden', !ai);
}

// ==================== REKOMENDASI PK (AI) ====================
// Tersedia di tab Input Manual maupun AI Scan (form sama-sama dipakai).
// AI memberi 3 SARAN berdasarkan beban kerja PK saat ini; PK Pembimbing
// TIDAK diisi otomatis — pengguna harus menekan tombol "Pilih" pada salah satu kartu rekomendasi.

async function recommendPkAI(){
  if(!geminiKey){ showToast('Isi Gemini API Key dulu di menu Pengaturan','error'); openSettingsModal(); return; }
  const jenisLitmas = val('fm-jenislitmas');
  if(!jenisLitmas){ showToast('Pilih Jenis Litmas terlebih dahulu sebelum meminta rekomendasi PK','error'); return; }
  if(!PK_LIST.length){ showToast('Belum ada data master PK','error'); return; }
  const wilayah = val('fm-wilayah'); const jenisPerkara = val('fm-perkara');
  const btn = document.getElementById('btn-rekomen-pk');
  const originalHtml = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>Menganalisis...';
  btn.disabled = true; lucide.createIcons();
  try{
    // Normalisasi nama PK sebelum dibandingkan — data dari sinkronisasi Google Sheet
    // kadang punya spasi ekstra / beda kapitalisasi dibanding daftar master PK,
    // sehingga perbandingan exact-match bisa gagal senyap dan membuat semua beban terlihat 0.
    const norm = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
    const beban = PK_LIST.map(p=>{
      const semuaKasus = allData.filter(d=>norm(d.nama_pk)===norm(p));
      const cases = semuaKasus.filter(d=>d.status_jenis!=='Selesai');
      return {
        nama_pk: p,
        beban_aktif: cases.length,
        beban_total: semuaKasus.length,
        beban_wilayah_sama: wilayah ? cases.filter(d=>d.wilayah_asal===wilayah).length : 0
      };
    });
    if(allData.length>0 && beban.every(b=>b.beban_total===0)){
      console.warn('recommendPkAI: seluruh PK menunjukkan 0 kasus meski allData tidak kosong — kemungkinan field nama_pk pada data tidak cocok dengan PK_LIST (periksa penulisan/spasi/kapitalisasi nama PK di sumber data).', {PK_LIST, contohData: allData.slice(0,3).map(d=>d.nama_pk)});
    }
    const prompt = `Anda asisten pendukung keputusan untuk sistem Litmas Bapas Kelas II Lahat. Berikut data beban kerja PK saat ini (beban_aktif = jumlah kasus litmas berstatus belum selesai; beban_total = jumlah seluruh kasus litmas yang pernah ditangani PK tsb, semua status; beban_wilayah_sama = jumlah kasus aktif dari wilayah yang sama dengan permintaan baru):
${JSON.stringify(beban)}
Permintaan litmas baru yang akan ditugaskan: jenis_litmas="${jenisLitmas}", wilayah_asal="${wilayah||'-'}", jenis_perkara="${jenisPerkara||'-'}".
Rekomendasikan TIGA (3) PK berbeda yang paling tepat menangani kasus ini, diurutkan dari yang paling disarankan ke yang paling kurang, dengan mempertimbangkan pemerataan beban kerja antar PK dan kesesuaian wilayah. Ini murni saran; keputusan akhir tetap sepenuhnya di tangan pengguna.
Kembalikan HANYA objek JSON tanpa markdown dengan struktur persis:
{"rekomendasi":[{"nama_pk":"harus persis salah satu dari: ${PK_LIST.join(', ')}","alasan":"alasan singkat 1-2 kalimat, sebutkan pertimbangan beban kerja"},{"nama_pk":"...","alasan":"..."},{"nama_pk":"...","alasan":"..."}]}`;
    const body = JSON.stringify({
      contents:[{role:'user',parts:[{text:prompt}]}],
      generationConfig:{responseMimeType:'application/json'}
    });
    const models = ['gemini-3.5-flash-lite','gemini-3.6-flash','gemini-2.5-pro'];
    let result = null, lastErr = null;
    for(let m=0; m<models.length && !result; m++){
      try{
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[m]}:generateContent?key=${geminiKey}`;
        let res = await fetchWithTimeout(url,{method:'POST',headers:{'Content-Type':'application/json'},body}, 20000);
        if(res.status===429){ await new Promise(r=>setTimeout(r,1200)); res = await fetchWithTimeout(url,{method:'POST',headers:{'Content-Type':'application/json'},body}, 20000); }
        if(res.status===429){ lastErr = new Error('429'); continue; }
        if(!res.ok){ lastErr = new Error('HTTP '+res.status); continue; }
        result = await res.json();
      }catch(e){ lastErr = (e && e.name==='AbortError') ? new Error('Waktu tunggu habis (timeout)') : e; }
    }
    if(!result){
      if(lastErr && lastErr.message==='429') throw new Error('Kuota Gemini API terlampaui (429). Coba lagi dalam 1-2 menit.');
      throw (lastErr || new Error('Gagal menghubungi Gemini API'));
    }
    const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!raw) throw new Error('AI tidak mengembalikan data (mungkin diblokir filter keamanan)');
    const parsed = JSON.parse(raw);
    const recs = Array.isArray(parsed.rekomendasi) ? parsed.rekomendasi : [];
    const seen = new Set(); const matched = [];
    for(const r of recs){
      const suggested = String(r?.nama_pk||'');
      const match = PK_LIST.find(x=>x.toLowerCase()===suggested.toLowerCase()) || PK_LIST.find(x=>suggested.toLowerCase().includes(x.toLowerCase())||x.toLowerCase().includes(suggested.toLowerCase()));
      if(match && !seen.has(match)){
        seen.add(match);
        const b = beban.find(x=>x.nama_pk===match) || {};
        matched.push({ nama_pk: match, alasan: r.alasan||'', beban_aktif: b.beban_aktif, beban_total: b.beban_total, beban_wilayah_sama: b.beban_wilayah_sama });
      }
      if(matched.length>=3) break;
    }
    if(!matched.length) throw new Error('Rekomendasi AI tidak cocok dengan daftar PK terdaftar');
    renderRekomendasiPkCards(matched);
    document.getElementById('rekomen-pk-box').classList.remove('hidden');
    lucide.createIcons();
    if(allData.length>0 && beban.every(b=>b.beban_total===0)){
      showToast('Peringatan: semua PK tercatat 0 kasus meski data litmas sudah ada — periksa kecocokan nama PK antara data dan menu Data PK','error');
    } else {
      showToast(`${matched.length} rekomendasi PK dari AI siap, silakan tinjau`,'success');
    }
  }catch(err){
    console.error(err);
    showToast('Gagal mendapatkan rekomendasi PK: '+err.message,'error');
  }finally{
    btn.innerHTML = originalHtml; btn.disabled = false; lucide.createIcons();
  }
}

// Menampilkan balok berisi 3 kartu rekomendasi PK beserta detail beban kerjanya.
function renderRekomendasiPkCards(list){
  const box = document.getElementById('rekomen-pk-list'); if(!box) return;
  box.innerHTML = list.map((r,i)=>`
    <div class="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900">
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5"><span class="badge badge-indigo !text-[10px]">#${i+1}</span><span class="font-semibold text-indigo-700 dark:text-indigo-300 text-[12px]">${r.nama_pk}</span></div>
          <div class="text-slate-600 dark:text-slate-300 text-[11px] mt-1">${r.alasan||'-'}</div>
          <div class="text-slate-400 text-[10px] mt-1">Beban aktif: ${r.beban_aktif ?? '-'} kasus &bull; Total riwayat: ${r.beban_total ?? '-'} kasus${r.beban_wilayah_sama!==undefined?` &bull; Wilayah sama: ${r.beban_wilayah_sama} kasus`:''}</div>
        </div>
        <button type="button" onclick="pilihRekomendasiPk('${String(r.nama_pk).replace(/'/g,"\\'")}')" class="btn btn-primary btn-sm !py-1 !px-2.5 text-[11px] shrink-0"><i data-lucide="check" class="w-3 h-3"></i>Pilih</button>
      </div>
    </div>`).join('');
}

// Menerapkan PK terpilih ke form HANYA saat pengguna menekan tombol "Pilih" pada
// salah satu dari 3 kartu rekomendasi — pilihan akhir tetap sepenuhnya di tangan pengguna.
function pilihRekomendasiPk(namaPk){
  const sel = document.getElementById('fm-pk');
  if(sel) sel.value = namaPk;
  showToast(`PK Pembimbing diisi: ${namaPk} — masih bisa diubah manual`,'success');
}

// Kompres gambar di browser sebelum dikirim ke Gemini (mempercepat upload & analisis).
// PDF tidak dikompres (dikirim apa adanya).
function compressImageFile(file, maxDim=1600, quality=0.8){
  return new Promise((resolve)=>{
    if(!file.type.startsWith('image/')){ resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = function(){
      let {width,height} = img;
      if(width>maxDim || height>maxDim){
        const scale = maxDim/Math.max(width,height);
        width = Math.round(width*scale); height = Math.round(height*scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img,0,0,width,height);
      canvas.toBlob((blob)=>{
        URL.revokeObjectURL(url);
        resolve(blob ? new File([blob], file.name, {type:'image/jpeg'}) : file);
      }, 'image/jpeg', quality);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function fetchWithTimeout(url, opts, ms){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), ms);
  try{ return await fetch(url, {...opts, signal: ctrl.signal}); }
  finally{ clearTimeout(t); }
}

async function handleAIFile(file){
  if(!file) return;
  if(!geminiKey){ showToast('Isi Gemini API Key dulu di menu Pengaturan','error'); openSettingsModal(); return; }
  const statusBox = document.getElementById('ai-scan-status'); const statusText = document.getElementById('ai-scan-text');
  statusBox.classList.remove('hidden'); statusText.textContent = `Membaca berkas ${file.name}...`;
  const workFile = await compressImageFile(file);
  const reader = new FileReader();
  reader.onload = async function(){
    try{
      const base64 = reader.result.split(',')[1];
      const mimeType = workFile.type || (workFile.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      statusText.textContent = 'Menganalisis dengan AI Gemini...';
      const prompt = `Anda asisten ekstraksi data untuk sistem Litmas Bapas. Analisis dokumen surat permintaan Litmas Integrasi/Pendampingan ABH ini dan kembalikan HANYA objek JSON tanpa markdown dengan struktur persis:
{
 "nomor_surat":"", "tanggal_surat":"YYYY-MM-DD", "tanggal_diterima":"YYYY-MM-DD",
 "nama_anak":"", "jenis_kelamin":"Laki-laki atau Perempuan",
 "jenis_perkara":"", "wilayah_asal":"salah satu: ${WILAYAH.join(', ')}",
 "kepolisian":"nama instansi pengirim (Polres/Polsek/Kejaksaan/Pengadilan)",
 "nama_pk":"paling cocok dari daftar: ${PK_LIST.join(', ')}",
 "keterangan":"catatan singkat isi surat"
}`;
      // Urutan: model tercepat dulu, hanya 1x percobaan per model (retry singkat khusus utk 429),
      // dan setiap request punya timeout supaya tidak menggantung lama.
      const models = ['gemini-3.5-flash-lite','gemini-3.6-flash','gemini-2.5-pro'];
      const body = JSON.stringify({
        contents:[{role:'user',parts:[{text:prompt},{inlineData:{mimeType,data:base64}}]}],
        generationConfig:{responseMimeType:'application/json'}
      });
      let result = null, lastErr = null;
      for(let m=0; m<models.length && !result; m++){
        try{
          statusText.textContent = `Menganalisis dengan AI Gemini (${models[m]})...`;
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${models[m]}:generateContent?key=${geminiKey}`;
          let res = await fetchWithTimeout(url,{method:'POST',headers:{'Content-Type':'application/json'},body}, 25000);
          if(res.status===429){
            statusText.textContent = `Kuota model ${models[m]} penuh, mencoba ulang sebentar...`;
            await new Promise(r=>setTimeout(r,1500));
            res = await fetchWithTimeout(url,{method:'POST',headers:{'Content-Type':'application/json'},body}, 25000);
          }
          if(res.status===429){ lastErr = new Error('429'); continue; }
          if(!res.ok){ lastErr = new Error('HTTP '+res.status); continue; }
          result = await res.json();
        }catch(e){ lastErr = (e && e.name==='AbortError') ? new Error('Waktu tunggu habis (timeout)') : e; }
      }
      if(!result){
        if(lastErr && lastErr.message==='429'){
          throw new Error('Kuota Gemini API terlampaui (429). Ini bukan error aplikasi, tapi limit rate/kuota dari akun Google Anda. Coba: (1) tunggu 1-2 menit lalu ulangi, (2) cek kuota di Google AI Studio/Cloud Console, (3) aktifkan billing pada project API key Anda, atau (4) gunakan API key lain.');
        }
        throw (lastErr || new Error('Gagal menghubungi Gemini API'));
      }
      const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if(!raw) throw new Error('AI tidak mengembalikan data (berkas mungkin tidak terbaca atau diblokir filter keamanan)');
      const p = JSON.parse(raw);
      if(p.nomor_surat) document.getElementById('fm-nosurat').value = p.nomor_surat;
      if(p.tanggal_surat) document.getElementById('fm-tglsurat').value = p.tanggal_surat;
      if(p.tanggal_diterima) document.getElementById('fm-tglditerima').value = p.tanggal_diterima;
      if(p.nama_anak) document.getElementById('fm-nama').value = p.nama_anak;
      if(p.jenis_kelamin) document.getElementById('fm-jk').value = p.jenis_kelamin;
      if(p.jenis_perkara) document.getElementById('fm-perkara').value = p.jenis_perkara;
      if(p.keterangan) document.getElementById('fm-ket').value = p.keterangan;
      if(p.wilayah_asal && WILAYAH.includes(p.wilayah_asal)){
        document.getElementById('fm-wilayah').value = p.wilayah_asal; updatePolisiOptionsIn('fm');
        if(p.kepolisian){
          const list = KEPOLISIAN[p.wilayah_asal]||[];
          const match = list.find(x=>x.toLowerCase().includes(p.kepolisian.toLowerCase())||p.kepolisian.toLowerCase().includes(x.toLowerCase()));
          if(match) document.getElementById('fm-polisi').value = match;
        }
      }
      if(p.nama_pk){
        const match = PK_LIST.find(x=>x.toLowerCase()===p.nama_pk.toLowerCase()) || PK_LIST.find(x=>x.toLowerCase().includes(p.nama_pk.toLowerCase())||p.nama_pk.toLowerCase().includes(x.toLowerCase()));
        if(match) document.getElementById('fm-pk').value = match;
      }
      switchLitmasTab(false);
      showToast('Data berhasil diekstrak AI, silakan periksa & simpan','success');
      statusBox.classList.add('hidden');
    }catch(err){
      console.error(err);
      showToast('Gagal memindai: '+err.message,'error');
      statusBox.classList.add('hidden');
    }
  };
  reader.readAsDataURL(workFile);
}

async function saveLitmas(id){
  if(guardWrite())return;
  const existingItem = id ? allData.find(d=>d.id===id) : null;
  const jenisLitmas = val('fm-jenislitmas');
  const status = val('fm-status');

  const suratInput = document.getElementById('fm-surat-file');
  const suratFile = suratInput && suratInput.files[0];
  if(!suratFile && !(existingItem && existingItem.link_surat_permintaan)){
    showToast('Berkas surat permintaan (JPG/PDF) wajib diunggah','error'); return;
  }

  let berkasFile = null, kategoriBerkas = '';
  if(status === 'Selesai'){
    const berkasInput = document.getElementById('fm-berkas-file');
    berkasFile = berkasInput && berkasInput.files[0];
    if(berkasFile && !/\.pdf$/i.test(berkasFile.name) && berkasFile.type !== 'application/pdf'){
      showToast('Berkas litmas harus berformat PDF','error'); return;
    }
    if(jenisLitmas === 'Litmas Pendampingan ABH'){
      kategoriBerkas = val('fm-kategori-berkas');
      if(!kategoriBerkas){ showToast('Pilih kategori berkas litmas (Diversi/Sidang)','error'); return; }
    }
    if(!berkasFile && !(existingItem && existingItem.link_berkas_litmas)){
      showToast('Berkas litmas (PDF) wajib diunggah saat Status Litmas = Selesai','error'); return;
    }
  }

  const submitBtn = document.querySelector('#litmas-form button[type=submit]');
  if(submitBtn){ submitBtn.disabled = true; submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>Menyimpan...'; lucide.createIcons(); }

  try{
    let linkSurat = existingItem ? (existingItem.link_surat_permintaan||'') : '';
    if(suratFile){
      showToast('Mengunggah berkas surat permintaan ke Google Drive...','info');
      const up = await uploadFileToDrive(suratFile, GDRIVE_FOLDER_SURAT);
      linkSurat = up.url;
    }
    let linkBerkas = existingItem ? (existingItem.link_berkas_litmas||'') : '';
    if(berkasFile){
      let folderId = GDRIVE_FOLDER_LITMAS_INTEGRASI;
      if(jenisLitmas === 'Litmas Pendampingan ABH') folderId = kategoriBerkas==='Sidang' ? GDRIVE_FOLDER_LITMAS_SIDANG : GDRIVE_FOLDER_LITMAS_DIVERSI;
      showToast('Mengunggah berkas litmas ke Google Drive...','info');
      const up2 = await uploadFileToDrive(berkasFile, folderId);
      linkBerkas = up2.url;
    }

    const data = {
      nomor_surat: val('fm-nosurat'), tanggal_surat: val('fm-tglsurat'), tanggal_diterima: val('fm-tglditerima'),
      nama_anak: val('fm-nama'), jenis_kelamin: val('fm-jk'), jenis_litmas: jenisLitmas,
      jenis_perkara: val('fm-perkara'), wilayah_asal: val('fm-wilayah'), kepolisian: val('fm-polisi'),
      nama_pk: val('fm-pk'), status_jenis: status, keterangan: val('fm-ket'),
      link_surat_permintaan: linkSurat, link_berkas_litmas: linkBerkas
    };
    if(id){
      const item = allData.find(d=>d.id===id); Object.assign(item, data);
      sendToSheet('update', item);
    } else {
      const item = { id: uid(), ...data, registrasi:null, adjudikasi:{jalur:null,status:'Berjalan',diversi:{kepolisian:{},kejaksaan:{},pengadilan:{}},persidangan:{sidang:[],putusan:{}}}, pasca_adjudikasi:null };
      allData.push(item);
      sendToSheet('create', item);
    }
    saveAll(); closeModal(); renderAllViews();
    showSuccessPopup(id ? 'Data litmas berhasil diperbarui & berkas tersimpan' : 'Permintaan litmas berhasil ditambahkan & berkas tersimpan');
  }catch(err){
    console.error(err);
    showToast('Gagal menyimpan: '+err.message, 'error');
    if(submitBtn){ submitBtn.disabled = false; submitBtn.innerHTML = 'Simpan'; }
  }
}
function val(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; }

function deleteLitmas(id){
  if(guardWrite())return;
  if(!confirm('Hapus data permintaan litmas ini? Data registrasi & adjudikasi terkait juga akan terhapus.')) return;
  allData = allData.filter(d=>d.id!==id);
  sendToSheet('delete', {id});
  saveAll(); renderAllViews();
  showToast('Data dihapus','success');
}

function getFilteredPermintaan(){
  const q = (document.getElementById('q-permintaan')?.value||'').toLowerCase().trim();
  const jl = document.getElementById('f-jenislitmas')?.value||'';
  const wl = document.getElementById('f-wilayah-p')?.value||'';
  const st = document.getElementById('f-status-p')?.value||'';
  const reg = document.getElementById('f-reg-p')?.value||'';
  const jk = document.getElementById('f-jk-p')?.value||'';
  const pk = document.getElementById('f-pk-p')?.value||'';
  const from = parseDay(document.getElementById('f-from-p')?.value);
  const to = parseDay(document.getElementById('f-to-p')?.value);
  return allData.filter(d=>{
    if(q){
      const hay = [d.nama_anak,d.nomor_surat,d.jenis_perkara,d.nama_pk,d.kepolisian,d.wilayah_asal,d.keterangan]
        .map(x=>(x||'').toLowerCase()).join(' ');
      if(!hay.includes(q)) return false;
    }
    if(jl && d.jenis_litmas!==jl) return false;
    if(wl && d.wilayah_asal!==wl) return false;
    if(st && d.status_jenis!==st) return false;
    if(pk && d.nama_pk!==pk) return false;
    if(jk && !(d.jenis_kelamin||'').includes(jk.includes('Laki')?'Laki':'Perempuan')) return false;
    if(reg==='sudah' && !d.registrasi) return false;
    if(reg==='belum' && d.registrasi) return false;
    if(from || to){
      const dt = itemDate(d);
      if(!dt) return false;
      if(from && dt < from) return false;
      if(to){
        const end = new Date(to); end.setHours(23,59,59,999);
        if(dt > end) return false;
      }
    }
    return true;
  });
}

let permintaanView = localStorage.getItem('CICL_PVIEW') || 'table';

function setPermintaanView(mode){
  permintaanView = mode;
  localStorage.setItem('CICL_PVIEW', mode);
  const tw = document.getElementById('permintaan-table-wrap');
  const cw = document.getElementById('permintaan-card-wrap');
  if(tw) tw.classList.toggle('hidden', mode!=='table');
  if(cw) cw.classList.toggle('hidden', mode!=='card');
  document.getElementById('pv-table')?.classList.toggle('active', mode==='table');
  document.getElementById('pv-card')?.classList.toggle('active', mode==='card');
  renderPermintaanTable();
}

function onPermintaanFilterChange(){
  if(typeof pageState !== 'undefined') pageState.permintaan = 1;
  renderPermintaanTable();
}

function resetPermintaanFilters(){
  ['q-permintaan','f-jenislitmas','f-wilayah-p','f-status-p','f-reg-p','f-jk-p','f-pk-p','f-from-p','f-to-p'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value = '';
  });
  onPermintaanFilterChange();
}

function populatePermintaanFilterOptions(){
  const wil = document.getElementById('f-wilayah-p');
  if(wil){
    const cur = wil.value;
    wil.innerHTML = '<option value="">Semua Wilayah</option>' + WILAYAH.map(w=>`<option>${w}</option>`).join('');
    wil.value = cur;
  }
  const pk = document.getElementById('f-pk-p');
  if(pk){
    const cur = pk.value;
    pk.innerHTML = '<option value="">Semua PK</option>' + PK_LIST.map(p=>`<option>${p}</option>`).join('');
    pk.value = cur;
  }
}

function statusBadge(st){
  if(st==='Selesai') return 'badge-green';
  if(st==='Pending') return 'badge-amber';
  return 'badge-blue';
}
function initials(name){
  const p = String(name||'?').trim().split(/\s+/).filter(Boolean);
  if(!p.length) return '?';
  return ((p[0][0]||'') + (p.length>1 ? p[p.length-1][0] : '')).toUpperCase();
}
function shortText(s, n=48){
  s = String(s||'').trim();
  if(!s) return '-';
  return s.length > n ? s.slice(0,n-1)+'…' : s;
}

function renderPermintaanKpi(list){
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = v; };
  set('pkpi-total', list.length);
  set('pkpi-proses', list.filter(d=>d.status_jenis==='Proses').length);
  set('pkpi-selesai', list.filter(d=>d.status_jenis==='Selesai').length);
  set('pkpi-belumreg', list.filter(d=>!d.registrasi).length);
}

function permintaanActionBtns(d){
  return `
    <div class="flex items-center justify-center gap-1 flex-wrap">
      ${d.link_surat_permintaan ? `<a href="${d.link_surat_permintaan}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" title="Berkas surat"><i data-lucide="file-text" class="w-3.5 h-3.5"></i></a>` : ''}
      ${d.link_berkas_litmas ? `<a href="${d.link_berkas_litmas}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" title="Berkas litmas"><i data-lucide="file-check-2" class="w-3.5 h-3.5"></i></a>` : ''}
      ${isAdmin() ? `
        <button class="btn btn-ghost btn-sm" onclick="openLitmasModal('${d.id}')" title="Edit"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteLitmas('${d.id}')" title="Hapus"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      ` : `<span class="text-[10px] text-slate-400">View</span>`}
    </div>`;
}

function renderPermintaanTable(){
  populatePermintaanFilterOptions();
  const tbody = document.getElementById('tb-permintaan');
  const cards = document.getElementById('permintaan-cards');
  if(!tbody && !cards) return;

  let data = getFilteredPermintaan();
  renderPermintaanKpi(data);
  data = sortByTable(data, 'permintaan', (d,key)=>{
    if(key==='registrasi') return d.registrasi ? d.registrasi.nomor : '';
    return d[key];
  });
  const pg = paginate(data, 'permintaan');
  const countEl = document.getElementById('permintaan-count');
  if(countEl) countEl.textContent = data.length ? `${data.length} hasil filter` : 'Tidak ada hasil';

  // Keep view mode
  const tw = document.getElementById('permintaan-table-wrap');
  const cw = document.getElementById('permintaan-card-wrap');
  if(tw) tw.classList.toggle('hidden', permintaanView!=='table');
  if(cw) cw.classList.toggle('hidden', permintaanView!=='card');
  document.getElementById('pv-table')?.classList.toggle('active', permintaanView==='table');
  document.getElementById('pv-card')?.classList.toggle('active', permintaanView==='card');

  if(tbody){
    tbody.innerHTML = pg.slice.length ? pg.slice.map(d=>`
      <tr class="align-top">
        <td>
          <div class="flex items-start gap-2.5 min-w-[200px]">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f2744] to-[#1a3d66] text-amber-300 flex items-center justify-center text-[11px] font-extrabold shrink-0">${initials(d.nama_anak)}</div>
            <div class="min-w-0">
              <p class="font-bold text-sm leading-snug truncate">${d.nama_anak||'-'}</p>
              <p class="text-[11px] text-slate-400 truncate">${d.nomor_surat||'-'} · ${d.jenis_kelamin||'-'}</p>
              <p class="text-[10px] text-slate-400">Surat ${fmtDate(d.tanggal_surat)}</p>
            </div>
          </div>
        </td>
        <td class="whitespace-nowrap text-sm">${fmtDate(d.tanggal_diterima)}</td>
        <td><span class="badge ${d.jenis_litmas==='Litmas Integrasi'?'badge-blue':'badge-indigo'}">${shortText(d.jenis_litmas,28)}</span></td>
        <td class="text-xs max-w-[180px]" title="${(d.jenis_perkara||'').replace(/"/g,'&quot;')}">${shortText(d.jenis_perkara,56)}</td>
        <td>
          <p class="text-sm font-medium">${shortText((d.wilayah_asal||'').replace('Kabupaten ','Kab. '),22)}</p>
          <p class="text-[11px] text-slate-400">${shortText(d.kepolisian,28)}</p>
        </td>
        <td class="text-sm">${shortText(d.nama_pk,22)}</td>
        <td><span class="badge ${statusBadge(d.status_jenis)}">${d.status_jenis||'-'}</span></td>
        <td>${d.registrasi?`<span class="badge badge-indigo">${d.registrasi.nomor}</span>`:`<span class="badge badge-slate">Belum</span>`}</td>
        <td class="text-center">${permintaanActionBtns(d)}</td>
      </tr>`).join('') : `<tr><td colspan="9" class="text-center py-12 text-slate-400">
        <div class="flex flex-col items-center gap-2">
          <i data-lucide="inbox" class="w-8 h-8 opacity-40"></i>
          <p class="font-semibold">Tidak ada data permintaan</p>
          <p class="text-xs">Ubah filter atau tambah data baru</p>
        </div>
      </td></tr>`;
  }

  if(cards){
    cards.innerHTML = pg.slice.length ? pg.slice.map(d=>`
      <div class="card-panel p-4 hover:border-amber-500/30 transition relative overflow-hidden">
        <div class="flex items-start justify-between gap-2 mb-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0f2744] to-[#1a3d66] text-amber-300 flex items-center justify-center text-xs font-extrabold shrink-0">${initials(d.nama_anak)}</div>
            <div class="min-w-0">
              <p class="font-bold text-sm truncate">${d.nama_anak||'-'}</p>
              <p class="text-[11px] text-slate-400 truncate">${d.jenis_kelamin||'-'} · ${fmtDate(d.tanggal_diterima)}</p>
            </div>
          </div>
          <span class="badge ${statusBadge(d.status_jenis)} shrink-0">${d.status_jenis||'-'}</span>
        </div>
        <div class="space-y-1.5 text-xs text-slate-500 mb-3">
          <p><span class="font-semibold text-slate-400">No. Surat</span> · ${d.nomor_surat||'-'}</p>
          <p><span class="font-semibold text-slate-400">Jenis</span> · ${d.jenis_litmas||'-'}</p>
          <p class="line-clamp-2" title="${(d.jenis_perkara||'').replace(/"/g,'&quot;')}"><span class="font-semibold text-slate-400">Perkara</span> · ${d.jenis_perkara||'-'}</p>
          <p><span class="font-semibold text-slate-400">Wilayah</span> · ${d.wilayah_asal||'-'}</p>
          <p><span class="font-semibold text-slate-400">Kepolisian</span> · ${d.kepolisian||'-'}</p>
          <p><span class="font-semibold text-slate-400">PK</span> · ${d.nama_pk||'-'}</p>
        </div>
        <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
          ${d.registrasi?`<span class="badge badge-indigo">${d.registrasi.nomor}</span>`:`<span class="badge badge-slate">Belum registrasi</span>`}
          ${permintaanActionBtns(d)}
        </div>
      </div>`).join('') : `<div class="col-span-full text-center py-12 text-slate-400">
        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
        <p class="font-semibold">Tidak ada data permintaan</p>
      </div>`;
  }

  renderPagination('pg-permintaan', 'permintaan', pg.total, pg.pages, pg.page);
  lucide.createIcons();
}

function exportPermintaanCSV(){
  const rows = getFilteredPermintaan();
  if(!rows.length){ showToast('Tidak ada data untuk diekspor','error'); return; }
  const headers = ['nomor_surat','tanggal_surat','tanggal_diterima','nama_anak','jenis_kelamin','jenis_litmas','jenis_perkara','wilayah_asal','kepolisian','nama_pk','status_jenis','nomor_registrasi','keterangan'];
  const esc = v => {
    const s = v==null ? '' : String(v);
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  };
  const lines = [headers.join(',')].concat(rows.map(d=>headers.map(h=>{
    if(h==='nomor_registrasi') return esc(d.registrasi?.nomor||'');
    return esc(d[h]);
  }).join(',')));
  const blob = new Blob(['\ufeff'+lines.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'permintaan-litmas-'+toYMD(new Date())+'.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('CSV berhasil diunduh','success');
}

// ==================== 2. REGISTRASI ====================
function toRomanMonth(dateStr){
  const m = new Date(dateStr).getMonth();
  return ROMAN[m>=0&&m<12?m:0];
}
function registrasiAnak(id){
  if(guardWrite())return;
  const item = allData.find(d=>d.id===id); if(!item) return;
  const now = new Date().toISOString().split('T')[0];
  const year = new Date(now).getFullYear();
  // Nomor urut dilanjutkan dari nomor TERBESAR yang sudah pernah dipakai tahun ini
  // (bukan sekadar jumlah anak yang sudah teregistrasi), supaya urutan tetap
  // berkesinambungan lintas bulan walau ada registrasi yang dibatalkan sebelumnya.
  let maxSeq = 0;
  allData.forEach(d=>{
    if(d.registrasi && d.registrasi.tahun===year){
      const m = String(d.registrasi.nomor||'').match(/^(\d+)\//);
      if(m){ const n = parseInt(m[1],10); if(n>maxSeq) maxSeq = n; }
    }
  });
  const seq = String(maxSeq+1).padStart(4,'0');
  const nomor = `${seq}/AN/${toRomanMonth(now)}/${year}`;
  item.registrasi = { nomor, tanggal: now, tahun: year };
  sendToSheet('update_registrasi', {id: item.id, nomor_registrasi: nomor, tanggal_registrasi: now});
  saveAll(); renderAllViews();
  showToast(`Anak diregistrasi dengan nomor ${nomor}`,'success');
}
function batalRegistrasi(id){
  if(guardWrite())return;
  if(!confirm('Batalkan registrasi anak ini?')) return;
  const item = allData.find(d=>d.id===id); if(!item) return;
  item.registrasi = null;
  sendToSheet('update_registrasi', {id:item.id, nomor_registrasi:'', tanggal_registrasi:''});
  saveAll(); renderAllViews();
  showSuccessPopup('Registrasi anak dibatalkan');
}
let regTab = localStorage.getItem('CICL_REGTAB') || 'belum';

function setRegTab(tab){
  regTab = tab;
  localStorage.setItem('CICL_REGTAB', tab);
  document.getElementById('reg-panel-belum')?.classList.toggle('hidden', tab==='sudah');
  document.getElementById('reg-panel-sudah')?.classList.toggle('hidden', tab==='belum');
  document.getElementById('rtab-belum')?.classList.toggle('active', tab==='belum' || tab==='all');
  document.getElementById('rtab-sudah')?.classList.toggle('active', tab==='sudah' || tab==='all');
  document.getElementById('rtab-all')?.classList.toggle('active', tab==='all');
  if(tab==='all'){
    document.getElementById('reg-panel-belum')?.classList.remove('hidden');
    document.getElementById('reg-panel-sudah')?.classList.remove('hidden');
  }
  renderRegistrasiTables();
}

function onRegFilterChange(){
  if(typeof pageState !== 'undefined'){
    pageState['reg-belum'] = 1;
    pageState['reg-sudah'] = 1;
  }
  renderRegistrasiTables();
}

function resetRegFilters(){
  ['q-registrasi','f-reg-jenis','f-reg-wilayah','f-reg-pk','f-reg-tahun'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value = '';
  });
  onRegFilterChange();
}

function populateRegFilterOptions(){
  const wil = document.getElementById('f-reg-wilayah');
  if(wil){
    const cur = wil.value;
    wil.innerHTML = '<option value="">Semua Wilayah</option>' + WILAYAH.map(w=>`<option>${w}</option>`).join('');
    wil.value = cur;
  }
  const pk = document.getElementById('f-reg-pk');
  if(pk){
    const cur = pk.value;
    pk.innerHTML = '<option value="">Semua PK</option>' + PK_LIST.map(p=>`<option>${p}</option>`).join('');
    pk.value = cur;
  }
  const th = document.getElementById('f-reg-tahun');
  if(th){
    const years = [...new Set(allData.filter(d=>d.registrasi?.tahun).map(d=>String(d.registrasi.tahun)))].sort((a,b)=>b-a);
    const cur = th.value;
    th.innerHTML = '<option value="">Semua Tahun Reg.</option>' + years.map(y=>`<option value="${y}">${y}</option>`).join('');
    th.value = cur;
  }
}

function previewNextRegNomor(){
  const now = new Date();
  const year = now.getFullYear();
  const ymd = toYMD(now);
  let maxSeq = 0;
  allData.forEach(d=>{
    if(d.registrasi && d.registrasi.tahun===year){
      const m = String(d.registrasi.nomor||'').match(/^(\d+)\//);
      if(m){ const n = parseInt(m[1],10); if(n>maxSeq) maxSeq = n; }
    }
  });
  const seq = String(maxSeq+1).padStart(4,'0');
  const nomor = `${seq}/AN/${toRomanMonth(ymd)}/${year}`;
  const el = document.getElementById('reg-next-nomor');
  if(el) el.textContent = nomor;
  return nomor;
}

function getFilteredRegistrasi(){
  const q = (document.getElementById('q-registrasi')?.value||'').toLowerCase().trim();
  const jl = document.getElementById('f-reg-jenis')?.value||'';
  const wl = document.getElementById('f-reg-wilayah')?.value||'';
  const pk = document.getElementById('f-reg-pk')?.value||'';
  const th = document.getElementById('f-reg-tahun')?.value||'';
  return allData.filter(d=>{
    if(q){
      const hay = [d.nama_anak, d.nomor_surat, d.registrasi?.nomor, d.nama_pk, d.wilayah_asal, d.kepolisian]
        .map(x=>(x||'').toLowerCase()).join(' ');
      if(!hay.includes(q)) return false;
    }
    if(jl && d.jenis_litmas!==jl) return false;
    if(wl && d.wilayah_asal!==wl) return false;
    if(pk && d.nama_pk!==pk) return false;
    if(th && String(d.registrasi?.tahun||'') !== th) return false;
    return true;
  });
}

function regGetter(d,key){
  if(key==='reg_nomor') return d.registrasi?.nomor||'';
  if(key==='reg_tanggal') return d.registrasi?.tanggal||'';
  return d[key];
}

function renderRegistrasiTables(){
  populateRegFilterOptions();
  previewNextRegNomor();
  const data = getFilteredRegistrasi();
  const year = new Date().getFullYear();
  const belumAll = data.filter(d=>!d.registrasi);
  const sudahAll = data.filter(d=>d.registrasi);

  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = v; };
  set('rkpi-total', data.length);
  set('rkpi-belum', belumAll.length);
  set('rkpi-sudah', sudahAll.length);
  set('rkpi-tahun', allData.filter(d=>d.registrasi && d.registrasi.tahun===year).length);
  set('rtab-belum-n', belumAll.length);
  set('rtab-sudah-n', sudahAll.length);
  set('reg-belum-count', belumAll.length ? belumAll.length + ' anak' : '');
  set('reg-sudah-count', sudahAll.length ? sudahAll.length + ' anak' : '');

  // Tab visibility
  document.getElementById('reg-panel-belum')?.classList.toggle('hidden', regTab==='sudah');
  document.getElementById('reg-panel-sudah')?.classList.toggle('hidden', regTab==='belum');
  if(regTab==='all'){
    document.getElementById('reg-panel-belum')?.classList.remove('hidden');
    document.getElementById('reg-panel-sudah')?.classList.remove('hidden');
  }
  document.getElementById('rtab-belum')?.classList.toggle('active', regTab==='belum');
  document.getElementById('rtab-sudah')?.classList.toggle('active', regTab==='sudah');
  document.getElementById('rtab-all')?.classList.toggle('active', regTab==='all');

  let belum = sortByTable(belumAll, 'reg-belum', regGetter);
  let sudah = tableSort['reg-sudah']
    ? sortByTable(sudahAll, 'reg-sudah', regGetter)
    : sudahAll.slice().sort((a,b)=> new Date(b.registrasi.tanggal) - new Date(a.registrasi.tanggal));

  const pgB = paginate(belum, 'reg-belum');
  const pgS = paginate(sudah, 'reg-sudah');

  const tbBelum = document.getElementById('tb-reg-belum');
  if(tbBelum){
    tbBelum.innerHTML = pgB.slice.length ? pgB.slice.map(d=>`
      <tr class="align-top">
        <td>
          <div class="flex items-start gap-2.5 min-w-[200px]">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-amber-400 text-white flex items-center justify-center text-[11px] font-extrabold shrink-0">${initials(d.nama_anak)}</div>
            <div class="min-w-0">
              <p class="font-bold text-sm leading-snug truncate">${d.nama_anak||'-'}</p>
              <p class="text-[11px] text-slate-400 truncate">${d.nomor_surat||'-'} · ${d.jenis_kelamin||'-'}</p>
            </div>
          </div>
        </td>
        <td class="text-sm whitespace-nowrap">${fmtDate(d.tanggal_diterima)}</td>
        <td><span class="badge ${d.jenis_litmas==='Litmas Integrasi'?'badge-blue':'badge-indigo'}">${shortText(d.jenis_litmas,26)}</span></td>
        <td class="text-sm">${shortText((d.wilayah_asal||'').replace('Kabupaten ','Kab. '),24)}</td>
        <td class="text-sm">${shortText(d.nama_pk,22)}</td>
        <td class="text-center">
          ${isAdmin()
            ? `<button class="btn btn-gold btn-sm" onclick="registrasiAnak('${d.id}')"><i data-lucide="hash" class="w-3.5 h-3.5"></i> Registrasi</button>`
            : `<span class="text-slate-400 text-xs">View</span>`}
        </td>
      </tr>`).join('') : `<tr><td colspan="6" class="text-center py-12 text-slate-400">
        <div class="flex flex-col items-center gap-2">
          <i data-lucide="check-circle-2" class="w-8 h-8 opacity-40 text-emerald-500"></i>
          <p class="font-semibold">Tidak ada yang menunggu registrasi</p>
          <p class="text-xs">Semua anak pada filter ini sudah punya nomor</p>
        </div>
      </td></tr>`;
  }

  const tbSudah = document.getElementById('tb-reg-sudah');
  if(tbSudah){
    tbSudah.innerHTML = pgS.slice.length ? pgS.slice.map(d=>`
      <tr class="align-top">
        <td>
          <span class="font-extrabold text-sm text-amber-600 dark:text-amber-400 tracking-tight">${d.registrasi.nomor}</span>
        </td>
        <td class="text-sm whitespace-nowrap">${fmtDate(d.registrasi.tanggal)}</td>
        <td>
          <div class="flex items-start gap-2.5 min-w-[180px]">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f2744] to-[#1a3d66] text-amber-300 flex items-center justify-center text-[11px] font-extrabold shrink-0">${initials(d.nama_anak)}</div>
            <div class="min-w-0">
              <p class="font-bold text-sm leading-snug truncate">${d.nama_anak||'-'}</p>
              <p class="text-[11px] text-slate-400 truncate">${d.jenis_kelamin||'-'} · ${d.nomor_surat||'-'}</p>
            </div>
          </div>
        </td>
        <td><span class="badge ${d.jenis_litmas==='Litmas Integrasi'?'badge-blue':'badge-indigo'}">${shortText(d.jenis_litmas,26)}</span></td>
        <td class="text-sm">${shortText((d.wilayah_asal||'').replace('Kabupaten ','Kab. '),24)}</td>
        <td class="text-sm">${shortText(d.nama_pk,22)}</td>
        <td class="text-center">
          ${isAdmin()
            ? `<button class="btn btn-danger btn-sm" onclick="batalRegistrasi('${d.id}')" title="Batalkan registrasi"><i data-lucide="undo-2" class="w-3.5 h-3.5"></i></button>`
            : `<span class="text-slate-400 text-xs">View</span>`}
        </td>
      </tr>`).join('') : `<tr><td colspan="7" class="text-center py-12 text-slate-400">
        <div class="flex flex-col items-center gap-2">
          <i data-lucide="inbox" class="w-8 h-8 opacity-40"></i>
          <p class="font-semibold">Belum ada anak teregistrasi</p>
        </div>
      </td></tr>`;
  }

  renderPagination('pg-reg-belum', 'reg-belum', pgB.total, pgB.pages, pgB.page);
  renderPagination('pg-reg-sudah', 'reg-sudah', pgS.total, pgS.pages, pgS.page);
  lucide.createIcons();
}

function exportRegistrasiCSV(){
  const rows = getFilteredRegistrasi().filter(d=>d.registrasi);
  if(!rows.length){ showToast('Tidak ada data registrasi untuk diekspor','error'); return; }
  const headers = ['nomor_registrasi','tanggal_registrasi','nama_anak','jenis_kelamin','jenis_litmas','nomor_surat','wilayah_asal','kepolisian','nama_pk','status_jenis'];
  const esc = v => {
    const s = v==null ? '' : String(v);
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  };
  const lines = [headers.join(',')].concat(rows.map(d=>[
    esc(d.registrasi?.nomor), esc(d.registrasi?.tanggal), esc(d.nama_anak), esc(d.jenis_kelamin),
    esc(d.jenis_litmas), esc(d.nomor_surat), esc(d.wilayah_asal), esc(d.kepolisian),
    esc(d.nama_pk), esc(d.status_jenis)
  ].join(',')));
  const blob = new Blob(['\ufeff'+lines.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'registrasi-anak-'+toYMD(new Date())+'.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('CSV registrasi diunduh','success');
}

// ==================== 3. ADJUDIKASI ====================
function getAdjTahapLabel(item){
  const a = item.adjudikasi; if(!a) return 'Belum Ditentukan';
  if(!a.jalur) return 'Belum Ditentukan Jalur';
  if(a.jalur==='Diversi'){
    const d = a.diversi;
    if(d.kepolisian?.hasil==='Berhasil') return 'Selesai - Diversi Berhasil (Kepolisian)';
    if(d.kepolisian?.hasil==='Gagal'){
      if(d.kejaksaan?.hasil==='Berhasil') return 'Selesai - Diversi Berhasil (Kejaksaan)';
      if(d.kejaksaan?.hasil==='Gagal'){
        if(d.pengadilan?.hasil==='Berhasil') return 'Selesai - Diversi Berhasil (Pengadilan)';
        if(d.pengadilan?.hasil==='Gagal') return 'Lanjut Persidangan (Diversi Gagal Total)';
        return 'Diversi Tingkat Pengadilan';
      }
      return 'Diversi Tingkat Kejaksaan';
    }
    return 'Diversi Tingkat Kepolisian';
  }
  if(a.jalur==='Persidangan'){
    if(a.persidangan?.putusan?.tanggal) return 'Selesai - Putusan Hakim Terbit';
    const n = (a.persidangan?.sidang||[]).length;
    return n>0 ? `Persidangan ke-${n} (Berjalan)` : 'Menunggu Sidang Pertama';
  }
  return 'Belum Ditentukan';
}
function getAdjStatus(item){
  return getAdjTahapLabel(item).startsWith('Selesai') ? 'Selesai' : 'Berjalan';
}
let adjTab = localStorage.getItem('CICL_ADJTAB') || 'all';

function setAdjTab(tab){
  adjTab = tab;
  localStorage.setItem('CICL_ADJTAB', tab);
  ['all','belum','berjalan','selesai'].forEach(t=>{
    document.getElementById('atab-'+t)?.classList.toggle('active', t===tab);
  });
  if(typeof pageState !== 'undefined') pageState.adjudikasi = 1;
  renderAdjudikasiTable();
}

function onAdjFilterChange(){
  if(typeof pageState !== 'undefined') pageState.adjudikasi = 1;
  renderAdjudikasiTable();
}

function resetAdjFilters(){
  ['q-adjudikasi','f-adj-jalur','f-adj-status','f-adj-wilayah','f-adj-pk'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.value = '';
  });
  adjTab = 'all';
  localStorage.setItem('CICL_ADJTAB', 'all');
  onAdjFilterChange();
}

function populateAdjFilterOptions(){
  const wil = document.getElementById('f-adj-wilayah');
  if(wil){
    const cur = wil.value;
    wil.innerHTML = '<option value="">Semua Wilayah</option>' + WILAYAH.map(w=>`<option>${w}</option>`).join('');
    wil.value = cur;
  }
  const pk = document.getElementById('f-adj-pk');
  if(pk){
    const cur = pk.value;
    pk.innerHTML = '<option value="">Semua PK</option>' + PK_LIST.map(p=>`<option>${p}</option>`).join('');
    pk.value = cur;
  }
}

function getFilteredAdjudikasi(){
  const q = (document.getElementById('q-adjudikasi')?.value||'').toLowerCase().trim();
  const jalur = document.getElementById('f-adj-jalur')?.value||'';
  const st = document.getElementById('f-adj-status')?.value||'';
  const wl = document.getElementById('f-adj-wilayah')?.value||'';
  const pk = document.getElementById('f-adj-pk')?.value||'';
  return allData.filter(d=>d.registrasi).filter(d=>{
    if(q){
      const hay = [d.nama_anak, d.registrasi?.nomor, d.nama_pk, d.wilayah_asal, d.kepolisian, d.jenis_perkara]
        .map(x=>(x||'').toLowerCase()).join(' ');
      if(!hay.includes(q)) return false;
    }
    if(jalur){
      if(jalur==='Belum'){ if(d.adjudikasi?.jalur) return false; }
      else if(d.adjudikasi?.jalur!==jalur) return false;
    }
    if(st && getAdjStatus(d)!==st) return false;
    if(wl && d.wilayah_asal!==wl) return false;
    if(pk && d.nama_pk!==pk) return false;
    // tab
    if(adjTab==='belum' && d.adjudikasi?.jalur) return false;
    if(adjTab==='berjalan' && (getAdjStatus(d)!=='Berjalan' || !d.adjudikasi?.jalur)) return false;
    if(adjTab==='selesai' && getAdjStatus(d)!=='Selesai') return false;
    return true;
  });
}

function adjudikasiGetter(d,key){
  if(key==='reg_nomor') return d.registrasi?.nomor||'';
  if(key==='jalur') return d.adjudikasi?.jalur||'';
  if(key==='tahap') return getAdjTahapLabel(d);
  if(key==='status') return getAdjStatus(d);
  return d[key];
}

/** Mini progress dots for Diversi / Persidangan */
function adjProgressHtml(d){
  const a = d.adjudikasi;
  if(!a || !a.jalur){
    return `<div class="flex items-center gap-1 text-[10px] text-slate-400"><span class="w-2 h-2 rounded-full bg-slate-300"></span> Belum dipilih</div>`;
  }
  if(a.jalur==='Diversi'){
    const tiers = [
      {k:'kepolisian', l:'Pol'},
      {k:'kejaksaan', l:'Jks'},
      {k:'pengadilan', l:'PN'}
    ];
    const dots = tiers.map(t=>{
      const h = a.diversi?.[t.k]?.hasil;
      let cls = 'bg-slate-300 dark:bg-slate-600';
      if(h==='Berhasil') cls = 'bg-emerald-500';
      else if(h==='Gagal') cls = 'bg-red-500';
      else if(h) cls = 'bg-amber-400';
      return `<span class="inline-flex items-center gap-0.5" title="${t.l}: ${h||'Belum'}"><span class="w-2.5 h-2.5 rounded-full ${cls}"></span><span class="text-[9px] text-slate-400">${t.l}</span></span>`;
    }).join('<span class="text-slate-300 text-[9px]">›</span>');
    return `<div class="flex items-center gap-1 flex-wrap">${dots}</div>`;
  }
  // Persidangan
  const n = (a.persidangan?.sidang||[]).length;
  const put = !!a.persidangan?.putusan?.tanggal;
  return `<div class="flex items-center gap-1.5 text-[10px]">
    <span class="badge badge-blue" style="font-size:10px;padding:2px 7px">${n} sidang</span>
    <span class="w-2.5 h-2.5 rounded-full ${put?'bg-emerald-500':'bg-slate-300'}" title="${put?'Putusan terbit':'Belum putusan'}"></span>
    <span class="text-slate-400">${put?'Putusan':'Menunggu putusan'}</span>
  </div>`;
}

function jalurBadge(jalur){
  if(jalur==='Diversi') return 'badge-indigo';
  if(jalur==='Persidangan') return 'badge-pink';
  return 'badge-slate';
}

function renderAdjudikasiTable(){
  populateAdjFilterOptions();
  const tbody = document.getElementById('tb-adjudikasi'); if(!tbody) return;

  // KPI from all registered (ignore tab, respect light search filters except tab)
  const base = allData.filter(d=>d.registrasi);
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent = v; };
  set('akpi-total', base.length);
  set('akpi-berjalan', base.filter(d=>d.adjudikasi?.jalur && getAdjStatus(d)==='Berjalan').length);
  set('akpi-selesai', base.filter(d=>getAdjStatus(d)==='Selesai').length);
  set('akpi-diversi', base.filter(d=>d.adjudikasi?.jalur==='Diversi').length);
  set('akpi-sidang', base.filter(d=>d.adjudikasi?.jalur==='Persidangan').length);

  // Tab counts (respect filters except tab itself)
  const prevTab = adjTab;
  adjTab = 'all';
  const forCount = getFilteredAdjudikasi();
  adjTab = prevTab;
  set('atab-all-n', forCount.length);
  set('atab-belum-n', forCount.filter(d=>!d.adjudikasi?.jalur).length);
  set('atab-berjalan-n', forCount.filter(d=>d.adjudikasi?.jalur && getAdjStatus(d)==='Berjalan').length);
  set('atab-selesai-n', forCount.filter(d=>getAdjStatus(d)==='Selesai').length);

  ['all','belum','berjalan','selesai'].forEach(t=>{
    document.getElementById('atab-'+t)?.classList.toggle('active', t===adjTab);
  });

  let data = getFilteredAdjudikasi();
  data = sortByTable(data, 'adjudikasi', adjudikasiGetter);
  const pg = paginate(data, 'adjudikasi');
  const countEl = document.getElementById('adj-count');
  if(countEl) countEl.textContent = data.length ? data.length + ' anak ditampilkan' : 'Tidak ada data';

  tbody.innerHTML = pg.slice.length ? pg.slice.map(d=>{
    const tahap = getAdjTahapLabel(d);
    const status = getAdjStatus(d);
    const jalur = d.adjudikasi?.jalur || '';
    return `<tr class="align-top">
      <td>
        <div class="flex items-start gap-2.5 min-w-[200px]">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0f2744] to-[#1a3d66] text-amber-300 flex items-center justify-center text-[11px] font-extrabold shrink-0">${initials(d.nama_anak)}</div>
          <div class="min-w-0">
            <p class="font-bold text-sm leading-snug truncate">${d.nama_anak||'-'}</p>
            <p class="text-[11px] font-semibold text-amber-600/90 truncate">${d.registrasi?.nomor||'-'}</p>
            <p class="text-[10px] text-slate-400 truncate">${shortText((d.wilayah_asal||'').replace('Kabupaten ','Kab. '),28)}</p>
          </div>
        </div>
      </td>
      <td><span class="badge ${jalurBadge(jalur)}">${jalur||'Belum'}</span></td>
      <td class="min-w-[120px]">${adjProgressHtml(d)}</td>
      <td class="text-xs max-w-[200px]">${tahap}</td>
      <td><span class="badge ${status==='Selesai'?'badge-green':'badge-amber'}">${status}</span></td>
      <td class="text-sm">${shortText(d.nama_pk,20)}</td>
      <td class="text-center whitespace-nowrap">
        ${status==='Selesai'
          ? `<button class="btn btn-ghost btn-sm" onclick="openAdjudikasiModal('${d.id}')"><i data-lucide="eye" class="w-3.5 h-3.5"></i> Lihat</button>`
          : `<button class="btn btn-gold btn-sm" onclick="openAdjudikasiModal('${d.id}')"><i data-lucide="scale" class="w-3.5 h-3.5"></i> Kelola</button>`}
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="text-center py-12 text-slate-400">
    <div class="flex flex-col items-center gap-2">
      <i data-lucide="scale" class="w-8 h-8 opacity-40"></i>
      <p class="font-semibold">Tidak ada data adjudikasi</p>
      <p class="text-xs">Pastikan anak sudah teregistrasi, atau longgarkan filter</p>
    </div>
  </td></tr>`;

  renderPagination('pg-adjudikasi', 'adjudikasi', pg.total, pg.pages, pg.page);
  lucide.createIcons();
}

function exportAdjudikasiCSV(){
  const rows = getFilteredAdjudikasi();
  if(!rows.length){ showToast('Tidak ada data untuk diekspor','error'); return; }
  const headers = ['nomor_registrasi','nama_anak','jalur','tahap','status','jenis_litmas','wilayah_asal','nama_pk','jenis_perkara'];
  const esc = v => {
    const s = v==null ? '' : String(v);
    return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  };
  const lines = [headers.join(',')].concat(rows.map(d=>[
    esc(d.registrasi?.nomor), esc(d.nama_anak), esc(d.adjudikasi?.jalur||'Belum'),
    esc(getAdjTahapLabel(d)), esc(getAdjStatus(d)), esc(d.jenis_litmas),
    esc(d.wilayah_asal), esc(d.nama_pk), esc(d.jenis_perkara)
  ].join(',')));
  const blob = new Blob(['\ufeff'+lines.join('\n')], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'tracking-adjudikasi-'+toYMD(new Date())+'.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('CSV adjudikasi diunduh','success');
}

function openAdjudikasiModal(id){
  const item = allData.find(d=>d.id===id); if(!item) return;
  if(editSidangState && editSidangState.itemId!==id) editSidangState=null;
  if(editPutusanState && editPutusanState!==id) editPutusanState=null;
  const a = item.adjudikasi;
  let body = '';
  if(!a.jalur){
    body = isAdmin() ? `
      <p class="text-sm mb-4">Tentukan jalur adjudikasi untuk <b>${item.nama_anak}</b>:</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button class="btn btn-primary" onclick="setJalur('${id}','Diversi')"><i data-lucide="handshake" class="w-4 h-4"></i>Jalur Diversi</button>
        <button class="btn bg-pink-600 text-white hover:bg-pink-700" onclick="setJalur('${id}','Persidangan')"><i data-lucide="landmark" class="w-4 h-4"></i>Jalur Persidangan</button>
      </div>` : `<p class="text-sm text-slate-500">Jalur adjudikasi belum ditentukan.</p>`;
  } else if(a.jalur==='Diversi'){
    body = renderDiversiForm(item);
  } else {
    body = renderPersidanganForm(item);
  }
  openModal(`
    <div class="flex justify-between items-center mb-4">
      <div><h3 class="font-bold text-lg">Tracking Adjudikasi</h3><p class="text-xs text-slate-500">${item.nama_anak} - ${item.registrasi?.nomor||''}</p></div>
      <button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    ${a.jalur && isAdmin() ? `<p class="text-xs mb-3"><button class="btn btn-ghost btn-sm" onclick="if(confirm('Ganti jalur adjudikasi? Data tahapan sebelumnya akan direset.')) resetJalur('${id}')"><i data-lucide='refresh-ccw' class='w-3 h-3'></i> Ganti Jalur</button></p>`:''}
    <div id="adj-body">${body}</div>
  `);
}
function setJalur(id, jalur){
  if(guardWrite())return;
  const item = allData.find(d=>d.id===id);
  item.adjudikasi.jalur = jalur;
  persistAdj(item); openAdjudikasiModal(id);
  showSuccessPopup(`Jalur adjudikasi ditetapkan: ${jalur}`);
}
function resetJalur(id){
  if(guardWrite())return;
  const item = allData.find(d=>d.id===id);
  item.adjudikasi = {jalur:null,status:'Berjalan',diversi:{kepolisian:{},kejaksaan:{},pengadilan:{}},persidangan:{sidang:[],putusan:{}}};
  persistAdj(item); openAdjudikasiModal(id);
  showSuccessPopup('Jalur adjudikasi direset');
}
function persistAdj(item){
  sendToSheet('update_adjudikasi', {id:item.id, adjudikasi:item.adjudikasi});
  saveAll(); renderAllViews();
}

function renderDiversiForm(item){
  const d = item.adjudikasi.diversi;
  const tierHtml = (key, label, unlocked) => `
    <div class="p-3 rounded-xl border ${unlocked?'border-slate-200 dark:border-slate-700':'border-slate-100 dark:border-slate-800 opacity-50'} mb-3">
      <p class="font-semibold text-sm mb-2">${label}</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div><label class="fl">Tanggal Pelaksanaan</label><input type="date" class="form-input" id="adj-${key}-tgl" value="${d[key]?.tanggal||''}" ${unlocked&&isAdmin()?'':'disabled'}></div>
        <div><label class="fl">Hasil</label><select class="form-input" id="adj-${key}-hasil" ${unlocked&&isAdmin()?'':'disabled'}>
          <option value="">Belum Ada</option>
          <option value="Berhasil" ${d[key]?.hasil==='Berhasil'?'selected':''}>Berhasil (Kesepakatan Diversi)</option>
          <option value="Gagal" ${d[key]?.hasil==='Gagal'?'selected':''}>Gagal / Tidak Sepakat</option>
        </select></div>
        <div><label class="fl">Catatan</label><input class="form-input" id="adj-${key}-cat" value="${d[key]?.catatan||''}" ${unlocked&&isAdmin()?'':'disabled'}></div>
      </div>
      ${unlocked&&isAdmin()?`<button class="btn btn-primary btn-sm mt-2" onclick="saveDiversiTier('${item.id}','${key}')">Simpan ${label}</button>`:''}
    </div>`;
  const kepolisianUnlocked = true;
  const kejaksaanUnlocked = d.kepolisian?.hasil==='Gagal';
  const pengadilanUnlocked = d.kejaksaan?.hasil==='Gagal';
  let html = tierHtml('kepolisian','Diversi Tingkat Kepolisian', kepolisianUnlocked);
  html += tierHtml('kejaksaan','Diversi Tingkat Kejaksaan', kejaksaanUnlocked);
  html += tierHtml('pengadilan','Diversi Tingkat Pengadilan', pengadilanUnlocked);
  if(d.pengadilan?.hasil==='Gagal'){
    html += `<div class="p-3 rounded-xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-900 text-sm">
      Diversi gagal di seluruh tingkatan. Kasus otomatis dilanjutkan ke jalur <b>Persidangan</b>.
      ${isAdmin()?`<button class="btn bg-pink-600 text-white btn-sm mt-2" onclick="setJalur('${item.id}','Persidangan')">Lanjutkan ke Persidangan</button>`:''}
    </div>`;
  }
  return html;
}
function saveDiversiTier(id, key){
  if(guardWrite())return;
  const item = allData.find(d=>d.id===id);
  item.adjudikasi.diversi[key] = {
    tanggal: document.getElementById(`adj-${key}-tgl`).value,
    hasil: document.getElementById(`adj-${key}-hasil`).value,
    catatan: document.getElementById(`adj-${key}-cat`).value
  };
  persistAdj(item);
  showToast('Tahap diversi disimpan','success');
  openAdjudikasiModal(id);
}

function renderPersidanganForm(item){
  const p = item.adjudikasi.persidangan;
  const editing = editSidangState && editSidangState.itemId===item.id ? editSidangState.idx : -1;
  const sidangRows = (p.sidang||[]).map((s,idx)=>{
    if(idx===editing){
      return `<tr class="bg-amber-50 dark:bg-amber-950/30">
        <td class="font-semibold">Sidang ke-${s.ke}</td>
        <td><input type="date" class="form-input" id="esd-tgl" value="${s.tanggal||''}"></td>
        <td><input class="form-input" id="esd-perkara" value="${s.nomor_perkara||''}" placeholder="mis. 12/Pid.Sus-Anak/2026/PN Lht"></td>
        <td><input class="form-input" id="esd-agenda" value="${s.agenda||''}" placeholder="mis. Pembacaan Dakwaan"></td>
        <td><input class="form-input" id="esd-cat" value="${s.catatan||''}"></td>
        <td class="text-center whitespace-nowrap">
          <button class="btn btn-primary btn-sm" onclick="saveEditSidang('${item.id}',${idx})"><i data-lucide="check" class="w-3.5 h-3.5"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="cancelEditSidang('${item.id}')"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
        </td>
      </tr>`;
    }
    return `<tr>
      <td>Sidang ke-${s.ke}</td><td>${fmtDate(s.tanggal)}</td><td>${s.nomor_perkara||'-'}</td><td>${s.agenda||'-'}</td><td>${s.catatan||'-'}</td>
      <td class="text-center">${isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="startEditSidang('${item.id}',${idx})" title="Edit"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>` : ''}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="text-center text-slate-400 py-3">Belum ada sidang.</td></tr>`;
  const putusanDone = !!p.putusan?.tanggal;
  const editingPutusan = editPutusanState===item.id;
  return `
    <div class="table-wrap rounded-xl border border-slate-200 dark:border-slate-700 mb-3">
      <table><thead class="bg-slate-50 dark:bg-slate-800/60"><tr><th>Sidang</th><th>Tanggal</th><th>No. Perkara</th><th>Agenda</th><th>Catatan</th><th class="text-center">Aksi</th></tr></thead><tbody>${sidangRows}</tbody></table>
    </div>
    ${!putusanDone && isAdmin() ? `
    <div class="p-3 rounded-xl border border-slate-200 dark:border-slate-700 mb-3">
      <p class="font-semibold text-sm mb-2">Tambah Jadwal Sidang ke-${(p.sidang||[]).length+1}</p>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <div><label class="fl">Tanggal</label><input type="date" class="form-input" id="sd-tgl"></div>
        <div><label class="fl">Nomor Perkara</label><input class="form-input" id="sd-perkara" placeholder="mis. 12/Pid.Sus-Anak/2026/PN Lht"></div>
        <div><label class="fl">Agenda</label><input class="form-input" id="sd-agenda" placeholder="mis. Pembacaan Dakwaan"></div>
        <div><label class="fl">Catatan</label><input class="form-input" id="sd-cat"></div>
      </div>
      <button class="btn btn-primary btn-sm mt-2" onclick="addSidang('${item.id}')">Tambah Sidang</button>
    </div>
    <div class="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30">
      <p class="font-semibold text-sm mb-2">Input Putusan Hakim (Menyelesaikan Adjudikasi)</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div><label class="fl">Tanggal Putusan</label><input type="date" class="form-input" id="pt-tgl"></div>
        <div><label class="fl">Nomor Putusan</label><input class="form-input" id="pt-nomor"></div>
        <div><label class="fl">Isi Putusan Singkat</label><input class="form-input" id="pt-isi"></div>
      </div>
      <button class="btn btn-gold btn-sm mt-2" onclick="savePutusan('${item.id}')">Simpan Putusan</button>
    </div>` : (!putusanDone ? `<p class="text-sm text-slate-500">Putusan belum tersedia.</p>` : (editingPutusan ? `
    <div class="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30">
      <p class="font-semibold text-sm mb-2">Edit Putusan Hakim</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div><label class="fl">Tanggal Putusan</label><input type="date" class="form-input" id="ept-tgl" value="${p.putusan.tanggal||''}"></div>
        <div><label class="fl">Nomor Putusan</label><input class="form-input" id="ept-nomor" value="${p.putusan.nomor||''}"></div>
        <div><label class="fl">Isi Putusan Singkat</label><input class="form-input" id="ept-isi" value="${p.putusan.isi||''}"></div>
      </div>
      <div class="flex gap-2 mt-2">
        <button class="btn btn-gold btn-sm" onclick="saveEditPutusan('${item.id}')">Simpan Perubahan</button>
        <button class="btn btn-ghost btn-sm" onclick="cancelEditPutusan('${item.id}')">Batal</button>
      </div>
    </div>` : `<div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm">
      <div class="flex justify-between items-start gap-2">
        <div><b>Putusan Hakim:</b> ${p.putusan.nomor||'-'} tanggal ${fmtDate(p.putusan.tanggal)}<br>${p.putusan.isi||''}</div>
        ${isAdmin() ? `<button class="btn btn-ghost btn-sm shrink-0" onclick="toggleEditPutusan('${item.id}')" title="Edit"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>` : ''}
      </div>
    </div>`))}
  `;
}
function startEditSidang(id, idx){
  if(guardWrite())return;
  editSidangState = {itemId:id, idx};
  openAdjudikasiModal(id);
}
function cancelEditSidang(id){
  editSidangState = null;
  openAdjudikasiModal(id);
}
function saveEditSidang(id, idx){
  if(guardWrite())return;
  const item = allData.find(d=>d.id===id);
  const p = item.adjudikasi.persidangan;
  const tgl = document.getElementById('esd-tgl').value;
  if(!tgl){ showToast('Isi tanggal sidang','error'); return; }
  p.sidang[idx] = { ...p.sidang[idx], tanggal: tgl, nomor_perkara: document.getElementById('esd-perkara').value, agenda: document.getElementById('esd-agenda').value, catatan: document.getElementById('esd-cat').value };
  editSidangState = null;
  persistAdj(item); openAdjudikasiModal(id); showToast('Data sidang diperbarui','success');
}
function toggleEditPutusan(id){
  if(guardWrite())return;
  editPutusanState = id;
  openAdjudikasiModal(id);
}
function cancelEditPutusan(id){
  editPutusanState = null;
  openAdjudikasiModal(id);
}
function saveEditPutusan(id){
  if(guardWrite())return;
  const item = allData.find(d=>d.id===id);
  const tgl = document.getElementById('ept-tgl').value;
  if(!tgl){ showToast('Isi tanggal putusan','error'); return; }
  item.adjudikasi.persidangan.putusan = { tanggal: tgl, nomor: document.getElementById('ept-nomor').value, isi: document.getElementById('ept-isi').value };
  editPutusanState = null;
  persistAdj(item); openAdjudikasiModal(id); showToast('Putusan hakim diperbarui','success');
}
function addSidang(id){
  if(guardWrite())return;
  const item = allData.find(d=>d.id===id);
  const p = item.adjudikasi.persidangan;
  const tgl = document.getElementById('sd-tgl').value;
  if(!tgl){ showToast('Isi tanggal sidang','error'); return; }
  p.sidang.push({ ke: (p.sidang||[]).length+1, tanggal: tgl, nomor_perkara: document.getElementById('sd-perkara').value, agenda: document.getElementById('sd-agenda').value, catatan: document.getElementById('sd-cat').value });
  persistAdj(item); openAdjudikasiModal(id); showToast('Jadwal sidang ditambahkan','success');
}
function savePutusan(id){
  if(guardWrite())return;
  const item = allData.find(d=>d.id===id);
  const tgl = document.getElementById('pt-tgl').value;
  if(!tgl){ showToast('Isi tanggal putusan','error'); return; }
  item.adjudikasi.persidangan.putusan = { tanggal: tgl, nomor: document.getElementById('pt-nomor').value, isi: document.getElementById('pt-isi').value };
  persistAdj(item); openAdjudikasiModal(id); showToast('Putusan hakim disimpan, adjudikasi selesai','success');
}

// ==================== 4. PASCA ADJUDIKASI ====================
function eligibleForPasca(){ return allData.filter(d=>d.registrasi && getAdjStatus(d)==='Selesai'); }
function getPascaList(){ return allData.filter(d=>d.pasca_adjudikasi); }
function openPascaModal(id){
  const item = allData.find(d=>d.id===id); if(!item) return;
  const p = item.pasca_adjudikasi || {};
  openModal(`
    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">Data Bimbingan Pasca Adjudikasi</h3><button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <form class="grid grid-cols-1 sm:grid-cols-2 gap-3" onsubmit="event.preventDefault(); savePasca('${id}')">
      <div class="sm:col-span-2"><p class="font-semibold">${item.nama_anak}</p></div>
      <div><label class="fl">Jenis Bimbingan</label><select class="form-input" id="ps-jenis" ${isAdmin()?'':'disabled'}>
        <option value="Pembebasan Bersyarat (PB)" ${p.jenis==='Pembebasan Bersyarat (PB)'?'selected':''}>Pembebasan Bersyarat (PB)</option>
        <option value="Cuti Bersyarat (CB)" ${p.jenis==='Cuti Bersyarat (CB)'?'selected':''}>Cuti Bersyarat (CB)</option>
      </select></div>
      <div><label class="fl">Asal LPKA</label><input class="form-input" id="ps-lpka" value="${p.asal_lpka||''}" ${isAdmin()?'':'disabled'}></div>
      <div><label class="fl">Tanggal Mulai Bimbingan</label><input type="date" class="form-input" id="ps-mulai" value="${p.tanggal_mulai||''}" ${isAdmin()?'':'disabled'}></div>
      <div><label class="fl">Tanggal Selesai Bimbingan</label><input type="date" class="form-input" id="ps-selesai" value="${p.tanggal_selesai||''}" ${isAdmin()?'':'disabled'}></div>
      <div><label class="fl">PK Pembimbing</label><select class="form-input" id="ps-pk" ${isAdmin()?'':'disabled'}>${PK_LIST.map(x=>`<option ${p.pk_pembimbing===x?'selected':''}>${x}</option>`).join('')}</select></div>
      <div><label class="fl">Status</label><select class="form-input" id="ps-status" ${isAdmin()?'':'disabled'}>
        <option ${p.status==='Dalam Bimbingan'?'selected':''}>Dalam Bimbingan</option>
        <option ${p.status==='Selesai'?'selected':''}>Selesai</option>
        <option ${p.status==='Dicabut'?'selected':''}>Dicabut</option>
      </select></div>
      <div class="sm:col-span-2"><label class="fl">Keterangan</label><textarea class="form-input" id="ps-ket" rows="2" ${isAdmin()?'':'disabled'}>${p.keterangan||''}</textarea></div>
      <div class="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" class="btn btn-ghost" onclick="closeModal()">${isAdmin()?'Batal':'Tutup'}</button>${isAdmin()?'<button class="btn btn-primary">Simpan</button>':''}</div>
    </form>
  `);
}
function savePasca(id){
  if(guardWrite())return;
  const item = allData.find(d=>d.id===id);
  item.pasca_adjudikasi = {
    jenis: val('ps-jenis'), asal_lpka: val('ps-lpka'), tanggal_mulai: val('ps-mulai'), tanggal_selesai: val('ps-selesai'),
    pk_pembimbing: val('ps-pk'), status: val('ps-status'), keterangan: val('ps-ket')
  };
  sendToSheet('update_pasca', {id:item.id, pasca_adjudikasi:item.pasca_adjudikasi});
  saveAll(); closeModal(); renderAllViews();
  showToast('Data bimbingan pasca adjudikasi disimpan','success');
}
function openPascaManualModal(){
  if(guardWrite())return;
  const eligible = eligibleForPasca().filter(d=>!d.pasca_adjudikasi);
  openModal(`
    <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">Tambah Klien Bimbingan</h3><button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    ${eligible.length ? `
    <p class="text-sm mb-3">Pilih anak yang telah selesai proses adjudikasi:</p>
    <select class="form-input mb-3" id="ps-pilih-anak">${eligible.map(d=>`<option value="${d.id}">${d.nama_anak} (${d.registrasi.nomor})</option>`).join('')}</select>
    <div class="flex justify-end gap-2"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="openPascaModal(document.getElementById('ps-pilih-anak').value)">Lanjutkan</button></div>
    ` : `<p class="text-sm text-slate-500">Belum ada anak dengan status adjudikasi Selesai yang siap dimasukkan ke bimbingan pasca adjudikasi. Selesaikan proses adjudikasi terlebih dahulu di menu Tracking Adjudikasi.</p>
    <div class="flex justify-end pt-3"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>`}
  `);
}
function getFilteredPasca(){
  const q = (document.getElementById('q-pasca')?.value||'').toLowerCase();
  const jn = document.getElementById('f-pasca-jenis')?.value;
  const st = document.getElementById('f-pasca-status')?.value;
  return getPascaList().filter(d=>{
    const mq = !q || (d.nama_anak||'').toLowerCase().includes(q);
    return mq && (!jn||d.pasca_adjudikasi.jenis===jn) && (!st||d.pasca_adjudikasi.status===st);
  });
}
function pascaGetter(d,key){
  if(key==='nama_anak') return d.nama_anak||'';
  return (d.pasca_adjudikasi||{})[key];
}
function renderPascaTable(){
  const tbody = document.getElementById('tb-pasca'); if(!tbody) return;
  let data = getFilteredPasca();
  data = sortByTable(data, 'pasca', pascaGetter);
  const pg = paginate(data, 'pasca');
  tbody.innerHTML = pg.slice.length ? pg.slice.map(d=>{ const p = d.pasca_adjudikasi; return `
    <tr><td class="font-semibold">${d.nama_anak}</td><td><span class="badge ${p.jenis.includes('PB')?'badge-blue':'badge-indigo'}">${p.jenis}</span></td>
    <td>${p.asal_lpka||'-'}</td><td>${fmtDate(p.tanggal_mulai)}</td><td>${fmtDate(p.tanggal_selesai)}</td><td>${p.pk_pembimbing||'-'}</td>
    <td><span class="badge ${p.status==='Selesai'?'badge-green':p.status==='Dicabut'?'badge-amber':'badge-blue'}">${p.status}</span></td>
    <td class="text-center">${isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="openPascaModal('${d.id}')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>` : `<button class="btn btn-ghost btn-sm" onclick="openPascaModal('${d.id}')" title="Lihat"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>`}</td></tr>
  `;}).join('') : `<tr><td colspan="8" class="text-center py-8 text-slate-400">Belum ada klien bimbingan pasca adjudikasi.</td></tr>`;
  renderPagination('pg-pasca', 'pasca', pg.total, pg.pages, pg.page);
  lucide.createIcons();
}

// ==================== 5-7. MASTER DATA (PK / WILAYAH / KEPOLISIAN) ====================
// ==================== DATA PK (lokal + Google Sheet MasterPK) ====================
function pkInitials(name){
  if(!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if(parts.length===1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
}
function pkAvatarColor(name){
  const palette = ['#1e3a5f','#0f766e','#7c3aed','#b45309','#be185d','#0369a1','#15803d','#9a3412'];
  let h=0; for(let i=0;i<(name||'').length;i++) h=(h*31+name.charCodeAt(i))>>>0;
  return palette[h%palette.length];
}
function getPkStats(name){
  const casesForPk = allData.filter(d=>d.nama_pk===name);
  return {
    int: casesForPk.filter(d=>d.jenis_litmas==='Litmas Integrasi').length,
    pnd: casesForPk.filter(d=>d.jenis_litmas==='Litmas Pendampingan ABH').length,
    total: casesForPk.length,
    cases: casesForPk
  };
}
function getPkRows(){
  return PK_MASTER.map(p=>{
    const st = getPkStats(p.name);
    return { ...p, int: st.int, pnd: st.pnd, total: st.total };
  });
}
function openPkModal(oldName){
  if(guardWrite())return;
  const item = oldName ? PK_MASTER.find(p=>p.name===oldName) : null;
  const wilOpts = ['',...WILAYAH].map(w=>`<option value="${w}" ${item&&item.wilayah_fokus===w?'selected':''}>${w||'— Tidak ditentukan —'}</option>`).join('');
  const jabatanList = ['PK Ahli Pertama','PK Ahli Muda','PK Ahli Madya','PK Ahli Utama','PK','Kepala Subseksi Bimbingan Klien','Staf PK'];
  const jabOpts = jabatanList.map(j=>`<option ${item&&item.jabatan===j?'selected':''}>${j}</option>`).join('');
  openModal(`
    <div class="flex justify-between items-start mb-4 gap-3">
      <div>
        <h3 class="font-bold text-lg">${oldName?'Edit Profil PK':'Tambah Pembimbing Kemasyarakatan'}</h3>
        <p class="text-xs text-slate-500 mt-0.5">Data disimpan lokal dan ke Google Sheet (tab MasterPK).</p>
      </div>
      <button onclick="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="sm:col-span-2"><label class="fl">Nama Lengkap *</label>
        <input class="form-input" id="pk-name" value="${item?item.name.replace(/"/g,'&quot;'):''}" placeholder="Contoh: Firman Syahri"></div>
      <div><label class="fl">NIP</label>
        <input class="form-input" id="pk-nip" value="${item?(item.nip||'').replace(/"/g,'&quot;'):''}"></div>
      <div><label class="fl">Jabatan</label>
        <select class="form-input" id="pk-jabatan">${jabOpts}</select></div>
      <div><label class="fl">Status</label>
        <select class="form-input" id="pk-status">
          <option value="Aktif" ${!item||item.status==='Aktif'?'selected':''}>Aktif</option>
          <option value="Nonaktif" ${item&&item.status==='Nonaktif'?'selected':''}>Nonaktif</option>
        </select></div>
      <div><label class="fl">Wilayah Fokus</label>
        <select class="form-input" id="pk-wilayah">${wilOpts}</select></div>
      <div><label class="fl">Telepon / WA</label>
        <input class="form-input" id="pk-telepon" value="${item?(item.telepon||'').replace(/"/g,'&quot;'):''}"></div>
      <div><label class="fl">Email</label>
        <input class="form-input" id="pk-email" type="email" value="${item?(item.email||'').replace(/"/g,'&quot;'):''}"></div>
      <div><label class="fl">Tanggal Masuk</label>
        <input class="form-input" id="pk-tanggal" type="date" value="${item?item.tanggal_masuk||'':''}"></div>
      <div class="sm:col-span-2"><label class="fl">Catatan</label>
        <textarea class="form-input" id="pk-catatan" rows="2">${item?item.catatan||'':''}</textarea></div>
    </div>
    <div class="flex justify-end gap-2 pt-5">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-save-pk" onclick="savePk('${(oldName||'').replace(/'/g,"\\\\'")}')"><i data-lucide="save" class="w-4 h-4"></i> Simpan</button>
    </div>
  `);
}
async function savePk(oldName){
  if(guardWrite())return;
  const name = (document.getElementById('pk-name')?.value||'').trim();
  if(!name){ showToast('Nama PK wajib diisi','error'); return; }
  const payload = {
    name,
    nip: (document.getElementById('pk-nip')?.value||'').trim(),
    jabatan: document.getElementById('pk-jabatan')?.value || 'PK',
    status: document.getElementById('pk-status')?.value || 'Aktif',
    wilayah_fokus: document.getElementById('pk-wilayah')?.value || '',
    telepon: (document.getElementById('pk-telepon')?.value||'').trim(),
    email: (document.getElementById('pk-email')?.value||'').trim(),
    tanggal_masuk: document.getElementById('pk-tanggal')?.value || '',
    catatan: (document.getElementById('pk-catatan')?.value||'').trim()
  };
  if(oldName){
    const i = PK_MASTER.findIndex(p=>p.name===oldName);
    if(i>-1) PK_MASTER[i] = payload;
    if(oldName !== name){
      allData.forEach(d=>{ if(d.nama_pk===oldName) d.nama_pk=name; });
      allData.forEach(d=>{
        if(d.pasca_adjudikasi && d.pasca_adjudikasi.pk_pembimbing===oldName){
          d.pasca_adjudikasi.pk_pembimbing = name;
        }
      });
    }
  } else {
    if(PK_MASTER.some(p=>p.name.toLowerCase()===name.toLowerCase())){
      showToast('Nama PK sudah ada','error'); return;
    }
    PK_MASTER.push(payload);
  }
  saveMaster(); saveAll();
  const btn = document.getElementById('btn-save-pk');
  if(btn){ btn.disabled=true; btn.innerHTML='Menyimpan ke Sheet…'; }
  try{
    await pushPkUpsertToSheet(payload, oldName||'');
    showSuccessPopup('Data PK disimpan (lokal + Google Sheet)');
  }catch(e){
    showToast('Tersimpan lokal. Gagal ke Sheet: '+(e.message||e),'error');
  }
  closeModal(); renderAllViews();
}
async function deletePk(name){
  if(guardWrite())return;
  const st = getPkStats(name);
  const msg = st.total
    ? `Hapus PK "${name}"?\nMasih terhubung ke ${st.total} kasus. Nama di kasus tidak diubah otomatis.`
    : `Hapus PK "${name}"?`;
  if(!confirm(msg)) return;
  PK_MASTER = PK_MASTER.filter(p=>p.name!==name);
  saveMaster();
  try{
    await pushPkDeleteToSheet(name);
    showToast('PK dihapus dari lokal + Google Sheet','success');
  }catch(e){
    showToast('Dihapus lokal. Gagal hapus di Sheet: '+(e.message||e),'error');
  }
  renderAllViews();
}
async function pushAllPkToSheet(){
  if(guardWrite())return;
  if(!gsheetUrl){ showToast('Isi URL Google Apps Script di Pengaturan','error'); return; }
  try{
    showToast('Mengunggah daftar PK ke Google Sheet…','info');
    await pushPkListToSheet();
    showSuccessPopup('Seluruh master PK berhasil diunggah ke Sheet (tab MasterPK)');
  }catch(e){
    showToast('Gagal unggah PK: '+(e.message||e),'error');
  }
}
function showPkDetail(name){
  const p = PK_MASTER.find(x=>x.name===name);
  if(!p) return;
  const st = getPkStats(name);
  const cases = st.cases.slice().sort((a,b)=>String(b.tanggal_diterima||'').localeCompare(String(a.tanggal_diterima||'')));
  const rows = cases.length ? cases.map(d=>`
    <tr>
      <td class="font-medium">${d.nama_anak||'-'}</td>
      <td><span class="badge ${d.jenis_litmas==='Litmas Integrasi'?'badge-blue':'badge-indigo'}">${(d.jenis_litmas||'-').replace('Litmas ','')}</span></td>
      <td>${d.wilayah_asal||'-'}</td>
      <td><span class="badge ${d.status_jenis==='Selesai'?'badge-green':d.status_jenis==='Proses'?'badge-blue':'badge-amber'}">${d.status_jenis||'-'}</span></td>
      <td class="text-xs text-slate-500">${fmtDate(d.tanggal_diterima)}</td>
    </tr>`).join('') : `<tr><td colspan="5" class="text-center py-6 text-slate-400">Belum ada kasus.</td></tr>`;
  openModal(`
    <div class="flex justify-between items-start mb-4 gap-3">
      <div class="flex items-center gap-3">
        <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-lg" style="background:${pkAvatarColor(p.name)}">${pkInitials(p.name)}</div>
        <div>
          <h3 class="font-bold text-lg leading-tight">${p.name}</h3>
          <p class="text-xs text-slate-500">${p.jabatan||'PK'}${p.nip?` · NIP ${p.nip}`:''}</p>
          <div class="flex flex-wrap gap-1.5 mt-1.5">
            <span class="badge ${p.status==='Aktif'?'badge-green':'badge-slate'}">${p.status||'Aktif'}</span>
            ${p.wilayah_fokus?`<span class="badge badge-blue">${p.wilayah_fokus}</span>`:''}
          </div>
        </div>
      </div>
      <button onclick="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
      <div class="rounded-xl bg-slate-50 dark:bg-white/5 p-3 text-center"><p class="text-[10px] uppercase font-bold text-slate-400">Total</p><p class="text-xl font-extrabold">${st.total}</p></div>
      <div class="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 text-center"><p class="text-[10px] uppercase font-bold text-slate-400">Integrasi</p><p class="text-xl font-extrabold text-blue-600 dark:text-blue-400">${st.int}</p></div>
      <div class="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3 text-center"><p class="text-[10px] uppercase font-bold text-slate-400">Pendampingan</p><p class="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">${st.pnd}</p></div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-4">
      <p><span class="text-slate-400 text-xs font-semibold uppercase">Telepon</span><br>${p.telepon||'-'}</p>
      <p><span class="text-slate-400 text-xs font-semibold uppercase">Email</span><br>${p.email||'-'}</p>
      <p><span class="text-slate-400 text-xs font-semibold uppercase">Tanggal Masuk</span><br>${fmtDate(p.tanggal_masuk)}</p>
      <p><span class="text-slate-400 text-xs font-semibold uppercase">Catatan</span><br>${p.catatan||'-'}</p>
    </div>
    <h4 class="font-bold text-sm mb-2">Daftar Kasus (${cases.length})</h4>
    <div class="table-wrap rounded-xl max-h-[40vh] overflow-y-auto">
      <table><thead><tr><th>Anak</th><th>Jenis</th><th>Wilayah</th><th>Status</th><th>Diterima</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>
    <div class="flex flex-wrap justify-end gap-2 pt-4">
      ${isAdmin()?`<button class="btn btn-ghost btn-sm" onclick="closeModal(); openPkModal('${p.name.replace(/'/g,"\\\\'")}')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i> Edit</button>`:''}
      <button class="btn btn-primary btn-sm" onclick="closeModal()">Tutup</button>
    </div>
  `);
}
function exportPkCSV(){
  const rows = getPkRows();
  let csv = 'No,Nama,NIP,Jabatan,Status,Wilayah Fokus,Telepon,Email,Tanggal Masuk,Integrasi,Pendampingan,Total,Catatan\n';
  rows.forEach((r,i)=>{
    const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
    csv += [i+1,r.name,r.nip,r.jabatan,r.status,r.wilayah_fokus,r.telepon,r.email,r.tanggal_masuk,r.int,r.pnd,r.total,r.catatan].map(esc).join(',') + '\n';
  });
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`DIGIT-CICL_DataPK_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast('CSV Data PK diunduh','success');
}
function renderPkKpi(){
  const rows = getPkRows();
  const aktif = rows.filter(r=>r.status!=='Nonaktif').length;
  const non = rows.length - aktif;
  const totalKasus = rows.reduce((s,r)=>s+r.total,0);
  const avg = rows.length ? (totalKasus / rows.length) : 0;
  const top = rows.slice().sort((a,b)=>b.total-a.total)[0];
  const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('pkkpi-total', rows.length);
  set('pkkpi-aktif', aktif);
  set('pkkpi-nonaktif', non);
  set('pkkpi-kasus', totalKasus);
  set('pkkpi-avg', avg.toFixed(1));
  set('pkkpi-top', top ? `${top.name.split(' ')[0]} (${top.total})` : '-');
}
function renderPkCharts(){
  if(typeof Chart === 'undefined') return;
  if(typeof charts === 'undefined') window.charts = {};
  const store = (typeof charts !== 'undefined' && charts) ? charts : window.charts;
  const rows = getPkRows().slice().sort((a,b)=>b.total-a.total);
  const isDark = document.documentElement.classList.contains('dark');
  const tick = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';

  const ctx1 = document.getElementById('ch-pk-beban');
  if(ctx1){
    if(store['ch-pk-beban']) store['ch-pk-beban'].destroy();
    const labels = rows.map(r=>r.name.length>18?r.name.slice(0,16)+'…':r.name);
    store['ch-pk-beban'] = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label:'Integrasi', data: rows.map(r=>r.int), backgroundColor:'#3b82f6', borderRadius:4, stack:'s' },
          { label:'Pendampingan', data: rows.map(r=>r.pnd), backgroundColor:'#6366f1', borderRadius:4, stack:'s' }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position:'bottom', labels:{ color:tick, boxWidth:12, font:{size:11} } } },
        scales: {
          x: { stacked:true, ticks:{ color:tick }, grid:{ color:grid } },
          y: { stacked:true, ticks:{ color:tick, font:{size:10} }, grid:{ display:false } }
        },
        onClick: (evt, els) => {
          if(!els.length) return;
          const r = rows[els[0].index];
          if(r) showPkDetail(r.name);
        }
      }
    });
  }

  const ctx2 = document.getElementById('ch-pk-status');
  if(ctx2){
    if(store['ch-pk-status']) store['ch-pk-status'].destroy();
    const aktif = rows.filter(r=>r.status!=='Nonaktif').length;
    const non = rows.length - aktif;
    store['ch-pk-status'] = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Aktif','Nonaktif'],
        datasets: [{ data:[aktif, non], backgroundColor:['#10b981','#94a3b8'], borderWidth:0, hoverOffset:6 }]
      },
      options: {
        cutout: '62%',
        plugins: { legend: { position:'bottom', labels:{ color:tick, boxWidth:12, font:{size:11} } } }
      }
    });
  }

  const leg = document.getElementById('pk-workload-legend');
  if(leg){
    const tinggi = rows.filter(r=>r.total>=8).length;
    const sedang = rows.filter(r=>r.total>=3 && r.total<8).length;
    const rendah = rows.filter(r=>r.total<3).length;
    leg.innerHTML = `
      <div class="flex items-center justify-between text-xs"><span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Beban Tinggi (≥8)</span><b>${tinggi}</b></div>
      <div class="flex items-center justify-between text-xs"><span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Beban Sedang (3–7)</span><b>${sedang}</b></div>
      <div class="flex items-center justify-between text-xs"><span class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Beban Rendah (0–2)</span><b>${rendah}</b></div>`;
  }
}

function renderPkTable(){
  const tbody = document.getElementById('tb-pk'); if(!tbody) return;
  if(typeof renderPkKpi==='function') renderPkKpi();
  if(typeof renderPkCharts==='function') renderPkCharts();
  let rows = getPkRows();
  rows = sortByTable(rows, 'pk', (r,key)=>r[key]);
  const pg = paginate(rows, 'pk');
  tbody.innerHTML = pg.slice.length ? pg.slice.map((r,i)=>{
    const safe = r.name.replace(/'/g,"\\\\'");
    return `<tr>
      <td class="text-slate-400 text-xs">${pg.start+i+1}</td>
      <td>
        <button type="button" class="flex items-center gap-2.5 text-left group" onclick="showPkDetail('${safe}')">
          <span class="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style="background:${pkAvatarColor(r.name)}">${pkInitials(r.name)}</span>
          <span>
            <span class="block font-semibold text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400">${r.name}</span>
            <span class="block text-[11px] text-slate-400">${r.jabatan||'PK'}${r.wilayah_fokus?` · ${r.wilayah_fokus}`:''}</span>
          </span>
        </button>
      </td>
      <td><span class="badge ${r.status==='Nonaktif'?'badge-slate':'badge-green'}">${r.status||'Aktif'}</span></td>
      <td class="text-center"><span class="badge badge-blue" style="cursor:pointer" onclick="showStatDetail('Litmas Integrasi — PK ${safe}', allData.filter(d=>d.nama_pk==='${safe}' && d.jenis_litmas==='Litmas Integrasi'))">${r.int}</span></td>
      <td class="text-center"><span class="badge badge-indigo" style="cursor:pointer" onclick="showStatDetail('Litmas Pendampingan ABH — PK ${safe}', allData.filter(d=>d.nama_pk==='${safe}' && d.jenis_litmas==='Litmas Pendampingan ABH'))">${r.pnd}</span></td>
      <td class="font-bold text-center">${r.total}</td>
      <td class="text-center whitespace-nowrap">
        <button class="btn btn-ghost btn-sm" title="Detail" onclick="showPkDetail('${safe}')"><i data-lucide="eye" class="w-3.5 h-3.5"></i></button>
        ${isAdmin() ? `
          <button class="btn btn-ghost btn-sm" onclick="openPkModal('${safe}')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deletePk('${safe}')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        ` : ''}
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada data PK.</td></tr>`;
  renderPagination('pg-pk', 'pk', pg.total, pg.pages, pg.page);
  lucide.createIcons();
}

function openWilayahModal(oldName){
  if(guardWrite())return;
  const item = oldName ? WILAYAH_MASTER.find(w=>w.name===oldName) : null;
  openModal(`
    <div class="flex justify-between items-start mb-4 gap-3">
      <div>
        <h3 class="font-bold text-lg">${oldName?'Edit':'Tambah'} Wilayah Kerja</h3>
        <p class="text-xs text-slate-500 mt-0.5">Data disimpan lokal + Google Sheet (tab MasterWilayah).</p>
      </div>
      <button onclick="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div class="sm:col-span-2"><label class="fl">Nama Wilayah *</label>
        <input class="form-input" id="wil-name" value="${item?item.name.replace(/"/g,'&quot;'):''}" placeholder="Contoh: Kabupaten Lahat"></div>
      <div><label class="fl">Kode</label>
        <input class="form-input" id="wil-kode" value="${item?(item.kode||'').replace(/"/g,'&quot;'):''}" placeholder="Opsional"></div>
      <div><label class="fl">Status</label>
        <select class="form-input" id="wil-status">
          <option value="Aktif" ${!item||item.status==='Aktif'?'selected':''}>Aktif</option>
          <option value="Nonaktif" ${item&&item.status==='Nonaktif'?'selected':''}>Nonaktif</option>
        </select></div>
      <div class="sm:col-span-2"><label class="fl">Catatan</label>
        <textarea class="form-input" id="wil-catatan" rows="2">${item?item.catatan||'':''}</textarea></div>
    </div>
    <div class="flex justify-end gap-2 pt-5">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-save-wil" onclick="saveWilayah('${(oldName||'').replace(/'/g,"\\\\'")}')"><i data-lucide="save" class="w-4 h-4"></i> Simpan</button>
    </div>
  `);
}
async function saveWilayah(oldName){
  if(guardWrite())return;
  const name = (document.getElementById('wil-name')?.value||'').trim();
  if(!name){ showToast('Nama wilayah wajib','error'); return; }
  const payload = {
    name,
    kode: (document.getElementById('wil-kode')?.value||'').trim(),
    status: document.getElementById('wil-status')?.value || 'Aktif',
    catatan: (document.getElementById('wil-catatan')?.value||'').trim()
  };
  if(oldName){
    const i = WILAYAH_MASTER.findIndex(w=>w.name===oldName);
    if(i>-1) WILAYAH_MASTER[i] = payload;
    if(oldName !== name){
      // pindahkan unit polisi
      KEPOLISIAN_MASTER.forEach(p=>{ if(p.wilayah===oldName) p.wilayah=name; });
      allData.forEach(d=>{ if(d.wilayah_asal===oldName) d.wilayah_asal=name; });
    }
  } else {
    if(WILAYAH_MASTER.some(w=>w.name.toLowerCase()===name.toLowerCase())){
      showToast('Wilayah sudah ada','error'); return;
    }
    WILAYAH_MASTER.push(payload);
  }
  saveMaster(); saveAll();
  try{
    await pushWilayahUpsertToSheet(payload, oldName||'');
    if(oldName && oldName!==name){
      // re-push kepolisian map changes
      try{ await pushKepolisianListToSheet(); }catch(_){}
    }
    showSuccessPopup('Wilayah disimpan (lokal + Sheet)');
  }catch(e){
    showToast('Tersimpan lokal. Gagal Sheet: '+(e.message||e),'error');
  }
  closeModal(); renderAllViews();
}
async function deleteWilayah(name){
  if(guardWrite())return;
  const nPol = KEPOLISIAN_MASTER.filter(p=>p.wilayah===name).length;
  const nKas = allData.filter(d=>d.wilayah_asal===name).length;
  if(!confirm(`Hapus wilayah "${name}"?\n${nPol} unit polisi & ${nKas} kasus terkait (nama di kasus tidak dihapus).`)) return;
  WILAYAH_MASTER = WILAYAH_MASTER.filter(w=>w.name!==name);
  KEPOLISIAN_MASTER = KEPOLISIAN_MASTER.filter(p=>p.wilayah!==name);
  saveMaster();
  try{
    await pushWilayahDeleteToSheet(name);
    await pushKepolisianListToSheet();
    showToast('Wilayah dihapus dari lokal + Sheet','success');
  }catch(e){
    showToast('Dihapus lokal. Gagal Sheet: '+(e.message||e),'error');
  }
  renderAllViews();
}
async function pushAllWilayahToSheet(){
  if(guardWrite())return;
  if(!gsheetUrl){ showToast('Isi URL Apps Script di Pengaturan','error'); return; }
  try{
    showToast('Mengunggah wilayah…','info');
    await pushWilayahListToSheet();
    showSuccessPopup('Master wilayah diunggah ke Sheet (tab MasterWilayah)');
  }catch(e){ showToast('Gagal: '+(e.message||e),'error'); }
}
function exportWilayahCSV(){
  const rows = getWilayahRows();
  let csv = 'No,Nama,Kode,Status,Unit Polisi,Total Kasus,Catatan\n';
  rows.forEach((r,i)=>{
    const esc = v=>`"${String(v??'').replace(/"/g,'""')}"`;
    csv += [i+1,r.name,r.kode,r.status,r.polisi,r.total,r.catatan].map(esc).join(',')+'\n';
  });
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`DIGIT-CICL_Wilayah_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}
function getWilayahRows(){
  return WILAYAH_MASTER.map(w=>{
    const polisi = KEPOLISIAN_MASTER.filter(p=>p.wilayah===w.name).length;
    const total = allData.filter(d=>d.wilayah_asal===w.name).length;
    return { ...w, polisi, total };
  });
}
function renderWilayahKpi(){
  const rows = getWilayahRows();
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('wilkpi-total', rows.length);
  set('wilkpi-aktif', rows.filter(r=>r.status!=='Nonaktif').length);
  set('wilkpi-kasus', rows.reduce((s,r)=>s+r.total,0));
  set('wilkpi-polisi', KEPOLISIAN_MASTER.length);
}
function renderWilayahCharts(){
  if(typeof Chart==='undefined') return;
  if(typeof charts==='undefined') window.charts={};
  const store = charts || window.charts;
  const rows = getWilayahRows().slice().sort((a,b)=>b.total-a.total);
  const isDark = document.documentElement.classList.contains('dark');
  const tick = isDark?'#94a3b8':'#64748b';
  const grid = isDark?'rgba(255,255,255,0.06)':'rgba(15,23,42,0.06)';
  const palette = ['#3b82f6','#6366f1','#10b981','#f59e0b','#ec4899','#14b8a6','#8b5cf6','#ef4444'];

  const ctx1 = document.getElementById('ch-wilayah-bar');
  if(ctx1){
    if(store['ch-wilayah-bar']) store['ch-wilayah-bar'].destroy();
    store['ch-wilayah-bar'] = new Chart(ctx1,{
      type:'bar',
      data:{ labels: rows.map(r=>r.name.replace('Kabupaten ','Kab. ').replace('Kota ','')),
        datasets:[{ label:'Kasus', data:rows.map(r=>r.total), backgroundColor:palette, borderRadius:8, borderSkipped:false }]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{ x:{ ticks:{ color:tick, font:{size:10} }, grid:{ display:false } }, y:{ ticks:{ color:tick }, grid:{ color:grid } } },
        onClick:(evt,els)=>{ if(!els.length) return; showStatDetail('Wilayah: '+rows[els[0].index].name, allData.filter(d=>d.wilayah_asal===rows[els[0].index].name)); }
      }
    });
  }
  const ctx2 = document.getElementById('ch-wilayah-pie');
  if(ctx2){
    if(store['ch-wilayah-pie']) store['ch-wilayah-pie'].destroy();
    store['ch-wilayah-pie'] = new Chart(ctx2,{
      type:'doughnut',
      data:{ labels: rows.map(r=>r.name.replace('Kabupaten ','Kab. ').replace('Kota ','')),
        datasets:[{ data:rows.map(r=>r.total), backgroundColor:palette, borderWidth:0, hoverOffset:6 }]},
      options:{ cutout:'55%', plugins:{ legend:{ position:'bottom', labels:{ color:tick, boxWidth:10, font:{size:10} } } },
        onClick:(evt,els)=>{ if(!els.length) return; showStatDetail('Wilayah: '+rows[els[0].index].name, allData.filter(d=>d.wilayah_asal===rows[els[0].index].name)); }
      }
    });
  }
}
function renderWilayahTable(){
  const tbody = document.getElementById('tb-wilayah'); if(!tbody) return;
  renderWilayahKpi(); renderWilayahCharts();
  const q = (document.getElementById('q-wilayah')?.value||'').trim().toLowerCase();
  let rows = getWilayahRows().filter(r=>!q || r.name.toLowerCase().includes(q) || (r.kode||'').toLowerCase().includes(q));
  rows = sortByTable(rows, 'wilayah', (r,key)=>r[key]);
  const pg = paginate(rows, 'wilayah');
  tbody.innerHTML = pg.slice.length ? pg.slice.map((r,i)=>{
    const safe = r.name.replace(/'/g,"\\\\'");
    return `<tr>
      <td class="text-slate-400 text-xs">${pg.start+i+1}</td>
      <td class="font-semibold">${r.name}</td>
      <td class="text-sm text-slate-500">${r.kode||'-'}</td>
      <td><span class="badge ${r.status==='Nonaktif'?'badge-slate':'badge-green'}">${r.status||'Aktif'}</span></td>
      <td class="text-center"><span class="badge badge-indigo">${r.polisi}</span></td>
      <td class="text-center font-bold"><span class="badge badge-blue" style="cursor:pointer" onclick="showStatDetail('Wilayah: ${safe}', allData.filter(d=>d.wilayah_asal==='${safe}'))">${r.total}</span></td>
      <td class="text-center whitespace-nowrap">
        ${isAdmin()?`
          <button class="btn btn-ghost btn-sm" onclick="openWilayahModal('${safe}')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteWilayah('${safe}')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        `:`<span class="text-slate-400 text-xs">-</span>`}
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada data wilayah.</td></tr>`;
  renderPagination('pg-wilayah', 'wilayah', pg.total, pg.pages, pg.page);
  lucide.createIcons();
}

function openKepolisianModal(wil, oldName){
  if(guardWrite())return;
  const item = (wil && oldName) ? KEPOLISIAN_MASTER.find(p=>p.wilayah===wil && p.nama===oldName) : null;
  const wilOpts = WILAYAH_MASTER.map(w=>`<option value="${w.name}" ${(item?item.wilayah:wil)===w.name?'selected':''}>${w.name}</option>`).join('');
  openModal(`
    <div class="flex justify-between items-start mb-4 gap-3">
      <div>
        <h3 class="font-bold text-lg">${oldName?'Edit':'Tambah'} Kepolisian Mitra</h3>
        <p class="text-xs text-slate-500 mt-0.5">Data disimpan lokal + Google Sheet (tab MasterKepolisian).</p>
      </div>
      <button onclick="closeModal()" class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div><label class="fl">Wilayah *</label>
        <select class="form-input" id="pol-wil">${wilOpts}</select></div>
      <div><label class="fl">Nama Unit *</label>
        <input class="form-input" id="pol-name" value="${item?(item.nama||'').replace(/"/g,'&quot;'):(oldName||'').replace(/"/g,'&quot;')}" placeholder="Polsek / Polres …"></div>
      <div><label class="fl">Jenis</label>
        <select class="form-input" id="pol-jenis">
          <option value="Polres" ${item&&item.jenis==='Polres'?'selected':''}>Polres</option>
          <option value="Polsek" ${!item||item.jenis==='Polsek'?'selected':''}>Polsek</option>
          <option value="Lainnya" ${item&&item.jenis==='Lainnya'?'selected':''}>Lainnya</option>
        </select></div>
      <div><label class="fl">Status</label>
        <select class="form-input" id="pol-status">
          <option value="Aktif" ${!item||item.status==='Aktif'?'selected':''}>Aktif</option>
          <option value="Nonaktif" ${item&&item.status==='Nonaktif'?'selected':''}>Nonaktif</option>
        </select></div>
      <div class="sm:col-span-2"><label class="fl">Catatan</label>
        <textarea class="form-input" id="pol-catatan" rows="2">${item?item.catatan||'':''}</textarea></div>
    </div>
    <div class="flex justify-end gap-2 pt-5">
      <button class="btn btn-ghost" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveKepolisian('${(wil||'').replace(/'/g,"\\\\'")}','${(oldName||'').replace(/'/g,"\\\\'")}')"><i data-lucide="save" class="w-4 h-4"></i> Simpan</button>
    </div>
  `);
}
async function saveKepolisian(oldWil, oldName){
  if(guardWrite())return;
  const wilayah = (document.getElementById('pol-wil')?.value||'').trim();
  const nama = (document.getElementById('pol-name')?.value||'').trim();
  if(!wilayah || !nama){ showToast('Wilayah dan nama wajib','error'); return; }
  const payload = {
    wilayah, nama,
    jenis: document.getElementById('pol-jenis')?.value || inferJenisPolisi(nama),
    status: document.getElementById('pol-status')?.value || 'Aktif',
    catatan: (document.getElementById('pol-catatan')?.value||'').trim()
  };
  if(oldName){
    const i = KEPOLISIAN_MASTER.findIndex(p=>p.wilayah===oldWil && p.nama===oldName);
    if(i>-1) KEPOLISIAN_MASTER[i] = payload;
    if(oldName !== nama || oldWil !== wilayah){
      allData.forEach(d=>{ if(d.kepolisian===oldName && d.wilayah_asal===oldWil) d.kepolisian=nama; });
    }
  } else {
    if(KEPOLISIAN_MASTER.some(p=>p.wilayah===wilayah && p.nama.toLowerCase()===nama.toLowerCase())){
      showToast('Unit sudah ada di wilayah ini','error'); return;
    }
    KEPOLISIAN_MASTER.push(payload);
  }
  saveMaster(); saveAll();
  try{
    await pushKepolisianUpsertToSheet(payload, oldWil||'', oldName||'');
    showSuccessPopup('Kepolisian disimpan (lokal + Sheet)');
  }catch(e){
    showToast('Tersimpan lokal. Gagal Sheet: '+(e.message||e),'error');
  }
  closeModal(); renderAllViews();
}
async function deleteKepolisian(wil, name){
  if(guardWrite())return;
  if(!confirm(`Hapus "${name}" di ${wil}?`)) return;
  KEPOLISIAN_MASTER = KEPOLISIAN_MASTER.filter(p=>!(p.wilayah===wil && p.nama===name));
  saveMaster();
  try{
    await pushKepolisianDeleteToSheet(wil, name);
    showToast('Dihapus dari lokal + Sheet','success');
  }catch(e){
    showToast('Dihapus lokal. Gagal Sheet: '+(e.message||e),'error');
  }
  renderAllViews();
}
async function pushAllKepolisianToSheet(){
  if(guardWrite())return;
  if(!gsheetUrl){ showToast('Isi URL Apps Script di Pengaturan','error'); return; }
  try{
    showToast('Mengunggah kepolisian…','info');
    await pushKepolisianListToSheet();
    showSuccessPopup('Master kepolisian diunggah ke Sheet (tab MasterKepolisian)');
  }catch(e){ showToast('Gagal: '+(e.message||e),'error'); }
}
function exportKepolisianCSV(){
  const rows = getKepolisianRows();
  let csv = 'No,Wilayah,Nama,Jenis,Status,Total Masuk,Catatan\n';
  rows.forEach((r,i)=>{
    const esc = v=>`"${String(v??'').replace(/"/g,'""')}"`;
    csv += [i+1,r.wilayah,r.nama,r.jenis,r.status,r.total,r.catatan].map(esc).join(',')+'\n';
  });
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`DIGIT-CICL_Kepolisian_${new Date().toISOString().slice(0,10)}.csv`; a.click();
}
function getKepolisianRows(){
  return KEPOLISIAN_MASTER.map(p=>({
    ...p,
    total: allData.filter(d=>d.kepolisian===p.nama).length
  }));
}
function renderKepolisianKpi(){
  const rows = getKepolisianRows();
  const set=(id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('polkpi-total', rows.length);
  set('polkpi-polres', rows.filter(r=>r.jenis==='Polres').length);
  set('polkpi-polsek', rows.filter(r=>r.jenis==='Polsek').length);
  set('polkpi-kasus', rows.reduce((s,r)=>s+r.total,0));
}
function renderKepolisianCharts(){
  if(typeof Chart==='undefined') return;
  if(typeof charts==='undefined') window.charts={};
  const store = charts || window.charts;
  const rows = getKepolisianRows().slice().sort((a,b)=>b.total-a.total);
  const isDark = document.documentElement.classList.contains('dark');
  const tick = isDark?'#94a3b8':'#64748b';
  const grid = isDark?'rgba(255,255,255,0.06)':'rgba(15,23,42,0.06)';
  const top = rows.slice(0,10);

  const ctx1 = document.getElementById('ch-polisi-bar');
  if(ctx1){
    if(store['ch-polisi-bar']) store['ch-polisi-bar'].destroy();
    store['ch-polisi-bar'] = new Chart(ctx1,{
      type:'bar',
      data:{ labels: top.map(r=>r.nama.length>22?r.nama.slice(0,20)+'…':r.nama),
        datasets:[{ label:'Kasus', data:top.map(r=>r.total), backgroundColor:'#3b82f6', borderRadius:6, borderSkipped:false }]},
      options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:false } },
        scales:{ x:{ ticks:{ color:tick }, grid:{ color:grid } }, y:{ ticks:{ color:tick, font:{size:10} }, grid:{ display:false } } },
        onClick:(evt,els)=>{ if(!els.length) return; const r=top[els[0].index]; showStatDetail(r.nama, allData.filter(d=>d.kepolisian===r.nama)); }
      }
    });
  }
  const ctx2 = document.getElementById('ch-polisi-jenis');
  if(ctx2){
    if(store['ch-polisi-jenis']) store['ch-polisi-jenis'].destroy();
    const labels = ['Polres','Polsek','Lainnya'];
    const data = labels.map(j=>rows.filter(r=>r.jenis===j).length);
    store['ch-polisi-jenis'] = new Chart(ctx2,{
      type:'doughnut',
      data:{ labels, datasets:[{ data, backgroundColor:['#6366f1','#10b981','#94a3b8'], borderWidth:0, hoverOffset:6 }]},
      options:{ cutout:'58%', plugins:{ legend:{ position:'bottom', labels:{ color:tick, boxWidth:12, font:{size:11} } } } }
    });
  }
}
function renderKepolisianTable(){
  const tbody = document.getElementById('tb-kepolisian'); if(!tbody) return;
  renderKepolisianKpi(); renderKepolisianCharts();

  // populate filter wilayah
  const fWil = document.getElementById('f-pol-wilayah');
  if(fWil){
    const cur = fWil.value;
    fWil.innerHTML = '<option value="">Semua Wilayah</option>' + WILAYAH_MASTER.map(w=>`<option>${w.name}</option>`).join('');
    fWil.value = cur;
  }

  const q = (document.getElementById('q-kepolisian')?.value||'').trim().toLowerCase();
  const fw = document.getElementById('f-pol-wilayah')?.value||'';
  const fj = document.getElementById('f-pol-jenis')?.value||'';
  let rows = getKepolisianRows().filter(r=>{
    if(fw && r.wilayah!==fw) return false;
    if(fj && r.jenis!==fj) return false;
    if(q && !(r.nama||'').toLowerCase().includes(q) && !(r.wilayah||'').toLowerCase().includes(q)) return false;
    return true;
  });
  rows = sortByTable(rows, 'kepolisian', (r,key)=>r[key]);
  const pg = paginate(rows, 'kepolisian');
  tbody.innerHTML = pg.slice.length ? pg.slice.map((r,i)=>{
    const safeWil = r.wilayah.replace(/'/g,"\\\\'");
    const safeNama = r.nama.replace(/'/g,"\\\\'");
    return `<tr>
      <td class="text-slate-400 text-xs">${pg.start+i+1}</td>
      <td class="text-sm">${r.wilayah}</td>
      <td class="font-semibold">${r.nama}</td>
      <td><span class="badge ${r.jenis==='Polres'?'badge-indigo':r.jenis==='Polsek'?'badge-green':'badge-slate'}">${r.jenis||'-'}</span></td>
      <td><span class="badge ${r.status==='Nonaktif'?'badge-slate':'badge-green'}">${r.status||'Aktif'}</span></td>
      <td class="text-center font-bold"><span class="badge badge-blue" style="cursor:pointer" onclick="showStatDetail('${safeNama}', allData.filter(d=>d.kepolisian==='${safeNama}'))">${r.total}</span></td>
      <td class="text-center whitespace-nowrap">
        ${isAdmin()?`
          <button class="btn btn-ghost btn-sm" onclick="openKepolisianModal('${safeWil}','${safeNama}')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteKepolisian('${safeWil}','${safeNama}')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
        `:`<span class="text-slate-400 text-xs">-</span>`}
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada data kepolisian.</td></tr>`;
  renderPagination('pg-kepolisian', 'kepolisian', pg.total, pg.pages, pg.page);
  lucide.createIcons();
}

// ==================== 8. REKAP PK ====================
function renderRekapTable(){
  const head = document.getElementById('rekap-head'); const tbody = document.getElementById('tb-rekap');
  if(!head||!tbody) return;
  head.innerHTML = '<th class="sortable" data-table="rekap" data-key="pk">PK<span class="sort-arrow"></span></th>'
    + WILAYAH.map(w=>`<th>${w}</th>`).join('')
    + '<th class="sortable font-extrabold" data-table="rekap" data-key="total">TOTAL<span class="sort-arrow"></span></th>';
  let rows = PK_LIST.map(pk=>{
    let total=0;
    const perWilayah = WILAYAH.map(w=>{ const c = allData.filter(d=>d.nama_pk===pk && d.wilayah_asal===w).length; total+=c; return c; });
    return { pk, perWilayah, total };
  });
  rows = sortByTable(rows, 'rekap', (r,key)=>key==='pk'?r.pk:r.total);
  tbody.innerHTML = rows.map(r=>{
    const cells = r.perWilayah.map(c=>`<td>${c}</td>`).join('');
    return `<tr><td class="font-semibold">${r.pk}</td>${cells}<td class="font-extrabold text-brand-navy dark:text-amber-400">${r.total}</td></tr>`;
  }).join('');
  updateSortIndicators();
}
function exportCSV(){
  let csv = "No Registrasi,Nomor Surat,Nama Anak,JK,Jenis Litmas,Wilayah,PK,Status Litmas,Jalur Adjudikasi,Tahap Adjudikasi\n";
  allData.forEach(d=>{
    csv += `"${d.registrasi?.nomor||''}","${d.nomor_surat||''}","${d.nama_anak||''}","${d.jenis_kelamin||''}","${d.jenis_litmas||''}","${d.wilayah_asal||''}","${d.nama_pk||''}","${d.status_jenis||''}","${d.adjudikasi?.jalur||''}","${getAdjTahapLabel(d)}"\n`;
  });
  const blob = new Blob([csv],{type:'text/csv'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = `DIGIT-CICL_${new Date().toISOString().split('T')[0]}.csv`; a.click();
}

// ==================== 9. STATISTIK & DASHBOARD CHARTS ====================

let charts = {};

// ==================== GLOBAL DATE FILTER ====================
// Filter berdasarkan tanggal_diterima (fallback tanggal_surat / registrasi).
let dateFilter = { from: null, to: null, preset: 'all' };

function toYMD(d){
  if(!(d instanceof Date) || isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function parseDay(s){
  if(!s) return null;
  const d = new Date(s);
  if(isNaN(d)) return null;
  d.setHours(0,0,0,0);
  return d;
}
function itemDate(d){
  return parseDay(d.tanggal_diterima) || parseDay(d.tanggal_surat) || parseDay(d.tanggal_registrasi);
}
/** Data aktif untuk KPI + grafik (menghormati filter tanggal global). */
function getScopedData(){
  if(!dateFilter.from && !dateFilter.to) return allData;
  return allData.filter(d=>{
    const dt = itemDate(d);
    if(!dt) return false;
    if(dateFilter.from && dt < dateFilter.from) return false;
    if(dateFilter.to){
      const end = new Date(dateFilter.to);
      end.setHours(23,59,59,999);
      if(dt > end) return false;
    }
    return true;
  });
}
function syncDateInputs(){
  const fromVal = dateFilter.from ? toYMD(dateFilter.from) : '';
  const toVal = dateFilter.to ? toYMD(dateFilter.to) : '';
  ['df-from','df-from-st'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value = fromVal; });
  ['df-to','df-to-st'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value = toVal; });
  document.querySelectorAll('.df-preset').forEach(btn=>{
    btn.classList.toggle('active', btn.getAttribute('data-preset') === dateFilter.preset);
  });
  const n = getScopedData().length;
  let summary = 'Menampilkan semua data';
  if(dateFilter.from || dateFilter.to){
    summary = `Periode ${fromVal || '…'} s/d ${toVal || '…'} · ${n} dari ${allData.length} data`;
  } else {
    summary = `Menampilkan semua data · ${allData.length} data`;
  }
  const s1 = document.getElementById('df-summary');
  if(s1) s1.textContent = summary;
  document.querySelectorAll('.df-summary-st').forEach(el=>{ el.textContent = summary; });
}
function applyDatePreset(preset){
  const now = new Date(); now.setHours(0,0,0,0);
  dateFilter.preset = preset;
  if(preset === 'all'){
    dateFilter.from = null; dateFilter.to = null;
  } else if(preset === 'thisMonth'){
    dateFilter.from = new Date(now.getFullYear(), now.getMonth(), 1);
    dateFilter.to = new Date(now.getFullYear(), now.getMonth()+1, 0);
  } else if(preset === 'lastMonth'){
    dateFilter.from = new Date(now.getFullYear(), now.getMonth()-1, 1);
    dateFilter.to = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if(preset === 'thisYear'){
    dateFilter.from = new Date(now.getFullYear(), 0, 1);
    dateFilter.to = new Date(now.getFullYear(), 11, 31);
  } else if(preset === 'last30'){
    dateFilter.to = new Date(now);
    dateFilter.from = new Date(now); dateFilter.from.setDate(dateFilter.from.getDate()-29);
  } else if(preset === 'last90'){
    dateFilter.to = new Date(now);
    dateFilter.from = new Date(now); dateFilter.from.setDate(dateFilter.from.getDate()-89);
  }
  syncDateInputs();
  renderKpi();
  renderAllCharts();
  if(typeof lucide !== 'undefined') lucide.createIcons();
}
function onDateRangeChange(){
  const fromEl = document.getElementById('df-from');
  const toEl = document.getElementById('df-to');
  dateFilter.from = fromEl && fromEl.value ? parseDay(fromEl.value) : null;
  dateFilter.to = toEl && toEl.value ? parseDay(toEl.value) : null;
  dateFilter.preset = 'custom';
  syncDateInputs();
  renderKpi();
  renderAllCharts();
}
function syncDateFromStat(which){
  const fromSt = document.getElementById('df-from-st');
  const toSt = document.getElementById('df-to-st');
  if(which === 'from' && fromSt){
    const main = document.getElementById('df-from');
    if(main) main.value = fromSt.value;
  }
  if(which === 'to' && toSt){
    const main = document.getElementById('df-to');
    if(main) main.value = toSt.value;
  }
  onDateRangeChange();
}

const JENIS_LITMAS_LIST = ['Litmas Integrasi','Litmas Pendampingan ABH'];
const JENIS_COLORS = {'Litmas Integrasi':'#1e3a5f','Litmas Pendampingan ABH':'#8b5cf6'};

// Popup detail data saat item statistik diklik
function showStatDetail(title, list){
  const rows = list.length ? list.map(d=>`
    <tr>
      <td class="font-semibold">${d.nomor_surat||'-'}</td>
      <td>${d.nama_anak||'-'}</td>
      <td>${d.jenis_kelamin||'-'}</td>
      <td><span class="badge ${d.jenis_litmas==='Litmas Integrasi'?'badge-blue':'badge-indigo'}">${d.jenis_litmas||'-'}</span></td>
      <td>${d.wilayah_asal||'-'}</td>
      <td>${d.nama_pk||'-'}</td>
      <td><span class="badge ${d.status_jenis==='Selesai'?'badge-green':d.status_jenis==='Pending'?'badge-amber':'badge-blue'}">${d.status_jenis||'-'}</span></td>
      <td>${d.registrasi?`<span class="badge badge-slate">${d.registrasi.nomor}</span>`:'-'}</td>
    </tr>`).join('') : `<tr><td colspan="8" class="text-center py-8 text-slate-400">Tidak ada data untuk kategori ini.</td></tr>`;
  openModal(`
    <div class="flex justify-between items-center mb-4">
      <div><h3 class="font-bold text-lg">${title}</h3><p class="text-xs text-slate-500">${list.length} data ditemukan</p></div>
      <button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    <div class="table-wrap rounded-xl border border-slate-200 dark:border-slate-700" style="max-height:60vh;overflow-y:auto">
      <table><thead class="bg-slate-50 dark:bg-slate-800/60" style="position:sticky;top:0"><tr>
        <th>No Surat</th><th>Nama Anak</th><th>JK</th><th>Jenis Litmas</th><th>Wilayah</th><th>PK</th><th>Status</th><th>Reg.</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </div>
    <div class="flex justify-end pt-3"><button class="btn btn-ghost" onclick="closeModal()">Tutup</button></div>
  `);
  lucide.createIcons();
}
function clickedEl(evt, chart){
  const pts = chart.getElementsAtEventForMode(evt, 'nearest', {intersect:true}, true);
  return pts.length ? pts[0] : null;
}

function renderAllCharts(){
  const data = getScopedData();
  const isDark = document.documentElement.classList.contains('dark');
  const tc = isDark ? '#e2e8f0' : '#334155';
  const gridC = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)';
  const palette = ['#0f2744','#c9a227','#10b981','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#14b8a6','#6366f1','#ef4444'];
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  const baseOpts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 750, easing: 'easeOutQuart' },
    plugins: {
      legend: {
        labels: { color: tc, usePointStyle: true, pointStyle: 'circle', padding: 14, font: { size: 11, weight: '600' } }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15,28,48,0.95)' : 'rgba(15,39,68,0.92)',
        titleFont: { weight: '700', size: 12 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 10,
        displayColors: true
      }
    }
  };
  const scaleOpts = {
    x: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gridC, drawBorder: false } },
    y: { ticks: { color: tc, font: { size: 10 } }, grid: { color: gridC, drawBorder: false } }
  };

  const mk = (id, type, data, opts = {}) => {
    const el = document.getElementById(id);
    if (!el) return;
    const ctx = el.getContext('2d');
    if (charts[id]) charts[id].destroy();
    el.style.cursor = 'pointer';
    const merged = {
      ...baseOpts,
      ...opts,
      plugins: { ...baseOpts.plugins, ...(opts.plugins || {}) },
      scales: (type === 'bar' || type === 'line')
        ? { ...scaleOpts, ...(opts.scales || {}) }
        : opts.scales
    };
    charts[id] = new Chart(ctx, { type, data, options: merged });
  };

  // Shared aggregates
  const divCount = data.filter(d => d.adjudikasi?.jalur === 'Diversi').length;
  const sidCount = data.filter(d => d.adjudikasi?.jalur === 'Persidangan').length;
  const belumJalur = data.filter(d => d.registrasi && !d.adjudikasi?.jalur).length;
  const adjSelesai = data.filter(d => d.registrasi && getAdjStatus(d) === 'Selesai').length;
  const adjBerjalan = data.filter(d => d.registrasi && getAdjStatus(d) === 'Berjalan').length;
  const jkL = data.filter(d => (d.jenis_kelamin || '').toLowerCase().includes('laki')).length;
  const jkP = data.filter(d => (d.jenis_kelamin || '').toLowerCase().includes('perempuan')).length;
  const statusLabels = ['Proses', 'Selesai', 'Pending'];
  const statusData = statusLabels.map(s => data.filter(d => d.status_jenis === s).length);
  const trendByJenis = { 'Litmas Integrasi': new Array(12).fill(0), 'Litmas Pendampingan ABH': new Array(12).fill(0) };
  data.forEach(d => {
    if (d.tanggal_diterima && trendByJenis[d.jenis_litmas]) {
      const m = new Date(d.tanggal_diterima).getMonth();
      if (m >= 0 && m < 12) trendByJenis[d.jenis_litmas][m]++;
    }
  });
  const trendTotal = months.map((_, i) =>
    (trendByJenis['Litmas Integrasi'][i] || 0) + (trendByJenis['Litmas Pendampingan ABH'][i] || 0)
  );
  const pkRanked = PK_LIST.map(p => ({
    name: p,
    total: data.filter(d => d.nama_pk === p).length,
    int: data.filter(d => d.nama_pk === p && d.jenis_litmas === 'Litmas Integrasi').length,
    pnd: data.filter(d => d.nama_pk === p && d.jenis_litmas === 'Litmas Pendampingan ABH').length
  })).sort((a, b) => b.total - a.total);
  const topPk = pkRanked.slice(0, 8);

  // ===== DASHBOARD CHARTS =====
  mk('ch-jenis', 'doughnut', {
    labels: JENIS_LITMAS_LIST,
    datasets: [{
      data: JENIS_LITMAS_LIST.map(j => data.filter(d => d.jenis_litmas === j).length),
      backgroundColor: [JENIS_COLORS['Litmas Integrasi'], JENIS_COLORS['Litmas Pendampingan ABH']],
      borderWidth: 0, hoverOffset: 8
    }]
  }, {
    cutout: '62%',
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const jenis = JENIS_LITMAS_LIST[el.index];
      showStatDetail(jenis, data.filter(d => d.jenis_litmas === jenis));
    }
  });

  const jalurLabels = ['Diversi', 'Persidangan', 'Belum Ditentukan'];
  mk('ch-jalur', 'doughnut', {
    labels: jalurLabels,
    datasets: [{ data: [divCount, sidCount, belumJalur], backgroundColor: ['#3b82f6', '#ec4899', '#94a3b8'], borderWidth: 0, hoverOffset: 8 }]
  }, {
    cutout: '58%',
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const label = jalurLabels[el.index];
      const list = label === 'Belum Ditentukan'
        ? data.filter(d => d.registrasi && !d.adjudikasi?.jalur)
        : data.filter(d => d.adjudikasi?.jalur === label);
      showStatDetail('Jalur: ' + label, list);
    }
  });

  mk('ch-status', 'doughnut', {
    labels: statusLabels,
    datasets: [{ data: statusData, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 8 }]
  }, {
    cutout: '58%',
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const s = statusLabels[el.index];
      showStatDetail('Status Litmas: ' + s, data.filter(d => d.status_jenis === s));
    }
  });

  mk('ch-trend', 'line', {
    labels: months,
    datasets: [
      {
        label: 'Total',
        data: trendTotal,
        borderColor: '#c9a227',
        backgroundColor: 'rgba(201,162,39,0.12)',
        fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 6, borderWidth: 2.5
      },
      {
        label: 'Integrasi',
        data: trendByJenis['Litmas Integrasi'],
        borderColor: JENIS_COLORS['Litmas Integrasi'],
        backgroundColor: 'transparent',
        fill: false, tension: 0.35, pointRadius: 2, borderWidth: 2
      },
      {
        label: 'Pendampingan ABH',
        data: trendByJenis['Litmas Pendampingan ABH'],
        borderColor: JENIS_COLORS['Litmas Pendampingan ABH'],
        backgroundColor: 'transparent',
        fill: false, tension: 0.35, pointRadius: 2, borderWidth: 2
      }
    ]
  }, {
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const m = el.index;
      showStatDetail('Permintaan — ' + months[m], data.filter(d => d.tanggal_diterima && new Date(d.tanggal_diterima).getMonth() === m));
    }
  });

  mk('ch-wil', 'bar', {
    labels: WILAYAH.map(w => w.replace('Kabupaten ', 'Kab. ').replace('Kota ', '')),
    datasets: [{
      label: 'Kasus',
      data: WILAYAH.map(w => data.filter(d => d.wilayah_asal === w).length),
      backgroundColor: palette,
      borderRadius: 8, borderSkipped: false
    }]
  }, {
    plugins: { legend: { display: false } },
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const wil = WILAYAH[el.index];
      showStatDetail('Wilayah: ' + wil, data.filter(d => d.wilayah_asal === wil));
    }
  });

  mk('ch-pk', 'bar', {
    labels: topPk.map(p => p.name.split(' ')[0] + (p.name.split(' ').length > 1 ? '…' : '')),
    datasets: [
      { label: 'Integrasi', data: topPk.map(p => p.int), backgroundColor: JENIS_COLORS['Litmas Integrasi'], borderRadius: 5 },
      { label: 'Pendampingan', data: topPk.map(p => p.pnd), backgroundColor: JENIS_COLORS['Litmas Pendampingan ABH'], borderRadius: 5 }
    ]
  }, {
    indexAxis: 'y',
    scales: { x: { stacked: true, ticks: { color: tc }, grid: { color: gridC } }, y: { stacked: true, ticks: { color: tc }, grid: { display: false } } },
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const pk = topPk[el.index].name;
      showStatDetail('PK: ' + pk, data.filter(d => d.nama_pk === pk));
    }
  });

  mk('ch-jk', 'doughnut', {
    labels: ['Laki-laki', 'Perempuan'],
    datasets: [{ data: [jkL, jkP], backgroundColor: ['#3b82f6', '#ec4899'], borderWidth: 0, hoverOffset: 10 }]
  }, {
    cutout: '55%',
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const labels = ['Laki-laki', 'Perempuan'];
      const key = labels[el.index];
      showStatDetail('JK: ' + key, data.filter(d => (d.jenis_kelamin || '').includes(key.includes('Laki') ? 'Laki' : 'Perempuan')));
    }
  });

  // ===== STATISTIK PAGE =====
  mk('st-pk', 'bar', {
    labels: PK_LIST,
    datasets: JENIS_LITMAS_LIST.map(jenis => ({
      label: jenis,
      data: PK_LIST.map(p => data.filter(d => d.nama_pk === p && d.jenis_litmas === jenis).length),
      backgroundColor: JENIS_COLORS[jenis],
      borderRadius: 5
    }))
  }, {
    indexAxis: 'y',
    scales: { x: { stacked: true, ticks: { color: tc }, grid: { color: gridC } }, y: { stacked: true, ticks: { color: tc, font: { size: 10 } }, grid: { display: false } } },
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const pk = PK_LIST[el.index]; const jenis = JENIS_LITMAS_LIST[el.datasetIndex];
      showStatDetail(jenis + ' — PK ' + pk, data.filter(d => d.nama_pk === pk && d.jenis_litmas === jenis));
    }
  });

  mk('st-trend', 'line', {
    labels: months,
    datasets: [
      { label: 'Litmas Integrasi', data: trendByJenis['Litmas Integrasi'], borderColor: JENIS_COLORS['Litmas Integrasi'], backgroundColor: 'rgba(30,58,95,.12)', fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 3 },
      { label: 'Litmas Pendampingan ABH', data: trendByJenis['Litmas Pendampingan ABH'], borderColor: JENIS_COLORS['Litmas Pendampingan ABH'], backgroundColor: 'rgba(139,92,246,.12)', fill: true, tension: 0.35, borderWidth: 2.5, pointRadius: 3 }
    ]
  }, {
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const monthIdx = el.index; const jenis = JENIS_LITMAS_LIST[el.datasetIndex];
      showStatDetail(jenis + ' — ' + months[monthIdx], data.filter(d => d.jenis_litmas === jenis && d.tanggal_diterima && new Date(d.tanggal_diterima).getMonth() === monthIdx));
    }
  });

  mk('st-jenis', 'doughnut', {
    labels: JENIS_LITMAS_LIST,
    datasets: [{ data: JENIS_LITMAS_LIST.map(j => data.filter(d => d.jenis_litmas === j).length), backgroundColor: [JENIS_COLORS['Litmas Integrasi'], JENIS_COLORS['Litmas Pendampingan ABH']], borderWidth: 0, hoverOffset: 8 }]
  }, {
    cutout: '60%',
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const jenis = JENIS_LITMAS_LIST[el.index];
      showStatDetail(jenis, data.filter(d => d.jenis_litmas === jenis));
    }
  });

  mk('st-adj', 'doughnut', {
    labels: ['Selesai', 'Berjalan'],
    datasets: [{ data: [adjSelesai, adjBerjalan], backgroundColor: ['#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 8 }]
  }, {
    cutout: '60%',
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const label = ['Selesai', 'Berjalan'][el.index];
      showStatDetail('Adjudikasi ' + label, data.filter(d => d.registrasi && getAdjStatus(d) === label));
    }
  });

  const perkaraMap = {};
  data.forEach(d => {
    let p = (d.jenis_perkara || '').trim();
    if (!p) return;
    if (p.length > 42) p = p.slice(0, 40) + '…';
    (perkaraMap[p] = perkaraMap[p] || []).push(d);
  });
  const perkaraLabels = Object.keys(perkaraMap).sort((a, b) => perkaraMap[b].length - perkaraMap[a].length).slice(0, 15);
  mk('st-perkara', 'bar', {
    labels: perkaraLabels,
    datasets: [{ label: 'Jumlah', data: perkaraLabels.map(p => perkaraMap[p].length), backgroundColor: '#c9a227', borderRadius: 6, borderSkipped: false }]
  }, {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const p = perkaraLabels[el.index];
      showStatDetail('Perkara: ' + p, perkaraMap[p]);
    }
  });

  const sidangByMonth = new Array(12).fill(0).map(() => []);
  data.forEach(d => {
    (d.adjudikasi?.persidangan?.sidang || []).forEach(s => {
      if (!s.tanggal) return;
      const m = new Date(s.tanggal).getMonth();
      if (m >= 0 && m < 12) sidangByMonth[m].push(d);
    });
  });
  mk('st-sidang', 'bar', {
    labels: months,
    datasets: [{ label: 'Sidang', data: sidangByMonth.map(l => l.length), backgroundColor: '#3b82f6', borderRadius: 8, borderSkipped: false }]
  }, {
    plugins: { legend: { display: false } },
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const uniq = Array.from(new Map(sidangByMonth[el.index].map(d => [d.id, d])).values());
      showStatDetail('Sidang — ' + months[el.index], uniq);
    }
  });

  const putusanByMonth = new Array(12).fill(0).map(() => []);
  data.forEach(d => {
    const tgl = d.adjudikasi?.persidangan?.putusan?.tanggal;
    if (!tgl) return;
    const m = new Date(tgl).getMonth();
    if (m >= 0 && m < 12) putusanByMonth[m].push(d);
  });
  mk('st-putusan', 'bar', {
    labels: months,
    datasets: [{ label: 'Putusan', data: putusanByMonth.map(l => l.length), backgroundColor: '#ec4899', borderRadius: 8, borderSkipped: false }]
  }, {
    plugins: { legend: { display: false } },
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      showStatDetail('Putusan — ' + months[el.index], putusanByMonth[el.index]);
    }
  });

  const diversiOkByMonth = new Array(12).fill(0).map(() => []);
  data.forEach(d => {
    const dv = d.adjudikasi?.diversi; if (!dv) return;
    ['kepolisian', 'kejaksaan', 'pengadilan'].forEach(tier => {
      const t = dv[tier];
      if (t && t.hasil === 'Berhasil' && t.tanggal) {
        const m = new Date(t.tanggal).getMonth();
        if (m >= 0 && m < 12) diversiOkByMonth[m].push(d);
      }
    });
  });
  mk('st-diversi-berhasil', 'bar', {
    labels: months,
    datasets: [{ label: 'Diversi OK', data: diversiOkByMonth.map(l => l.length), backgroundColor: '#10b981', borderRadius: 8, borderSkipped: false }]
  }, {
    plugins: { legend: { display: false } },
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const uniq = Array.from(new Map(diversiOkByMonth[el.index].map(d => [d.id, d])).values());
      showStatDetail('Diversi Berhasil — ' + months[el.index], uniq);
    }
  });

  mk('st-jk', 'pie', {
    labels: ['Laki-laki', 'Perempuan'],
    datasets: [{ data: [jkL, jkP], backgroundColor: ['#3b82f6', '#ec4899'], borderWidth: 0, hoverOffset: 8 }]
  }, {
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const key = el.index === 0 ? 'Laki' : 'Perempuan';
      showStatDetail('JK: ' + (el.index === 0 ? 'Laki-laki' : 'Perempuan'), data.filter(d => (d.jenis_kelamin || '').includes(key)));
    }
  });

  mk('st-status-litmas', 'doughnut', {
    labels: statusLabels,
    datasets: [{ data: statusData, backgroundColor: ['#3b82f6', '#10b981', '#f59e0b'], borderWidth: 0, hoverOffset: 8 }]
  }, {
    cutout: '55%',
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const s = statusLabels[el.index];
      showStatDetail('Status: ' + s, data.filter(d => d.status_jenis === s));
    }
  });

  mk('st-wilayah', 'bar', {
    labels: WILAYAH.map(w => w.replace('Kabupaten ', 'Kab. ').replace('Kota ', '')),
    datasets: [{ label: 'Kasus', data: WILAYAH.map(w => data.filter(d => d.wilayah_asal === w).length), backgroundColor: palette, borderRadius: 8, borderSkipped: false }]
  }, {
    plugins: { legend: { display: false } },
    onClick: (evt, els, chart) => {
      const el = els[0] || clickedEl(evt, chart); if (!el) return;
      const wil = WILAYAH[el.index];
      showStatDetail('Wilayah: ' + wil, data.filter(d => d.wilayah_asal === wil));
    }
  });
}

function fmtDate(s){ if(!s) return '-'; const d = new Date(s); if(isNaN(d)) return s; return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}); }

// ==================== GOOGLE SHEET SYNC ====================
// Penting: Apps Script Web App TIDAK mendukung preflight CORS.
// Selalu kirim body sebagai text/plain (bukan application/json) agar request
// tetap "simple request" dan response JSON bisa dibaca di browser.

function normalizeGasUrl(url){
  if(!url) return '';
  url = String(url).trim();
  // Pastikan pakai /exec (bukan /dev) untuk deployment produksi
  return url.replace(/\/dev$/, '/exec');
}

async function sendToSheet(action, payload){
  if(!gsheetUrl) return;
  try{
    await postToSheetJSON(action, payload);
  }catch(e){
    console.error('Gagal sinkron ke sheet:', e);
    // Jangan ganggu UX dengan toast di setiap write; status dot diganti merah
    const dot = document.getElementById('sheet-status-dot');
    const text = document.getElementById('sheet-status-text');
    if(dot){ dot.classList.remove('bg-emerald-500'); dot.classList.add('bg-red-500'); }
    if(text) text.textContent = 'Gagal tulis ke Google Sheet';
  }
}

async function postToSheetJSON(action, payload){
  const url = normalizeGasUrl(gsheetUrl);
  if(!url) throw new Error('URL Google Apps Script belum diisi di menu Pengaturan.');
  const res = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
  // Apps Script kadang mengembalikan HTML error page (401/403/404)
  const raw = await res.text();
  let json;
  try {
    json = JSON.parse(raw);
  } catch (parseErr) {
    throw new Error(
      'Server tidak mengembalikan JSON. Cek: (1) Web App di-deploy ulang, ' +
      '(2) akses "Anyone", (3) URL /exec benar. Respons: ' + raw.slice(0, 120)
    );
  }
  if (json.status === 'error') throw new Error(json.message || 'Gagal memproses di server.');
  return json;
}

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(String(reader.result).split(',')[1]);
    reader.onerror = ()=> reject(new Error('Gagal membaca berkas.'));
    reader.readAsDataURL(file);
  });
}

async function uploadFileToDrive(file, folderId){
  const base64 = await fileToBase64(file);
  return postToSheetJSON('upload_file', {
    fileData: base64,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    folderId
  });
}

async function syncDataFromSheets(manual){
  const dot = document.getElementById('sheet-status-dot');
  const text = document.getElementById('sheet-status-text');
  const url = normalizeGasUrl(gsheetUrl);
  if(!url){
    if(manual) showToast('Isi URL Google Apps Script dulu di menu Pengaturan','error');
    return;
  }
  try{
    if(text) text.textContent = 'Menyinkronkan...';
    const res = await fetch(url, { method: 'GET', redirect: 'follow', cache: 'no-store' });
    const raw = await res.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      throw new Error(
        'Respons bukan JSON. Biasanya Web App belum di-deploy sebagai "Anyone" ' +
        'atau URL salah. Cuplikan: ' + raw.slice(0, 100)
      );
    }
    if(!Array.isArray(data)){
      throw new Error(
        data && data.message
          ? ('Server error: ' + data.message)
          : 'Format data tidak valid (bukan array).'
      );
    }
    allData = data.map(d=>({
      ...d,
      registrasi: d.nomor_registrasi
        ? {
            nomor: d.nomor_registrasi,
            tanggal: d.tanggal_registrasi,
            tahun: d.tanggal_registrasi ? new Date(d.tanggal_registrasi).getFullYear() : null
          }
        : null,
      adjudikasi: d.adjudikasi || {
        jalur: null,
        status: 'Berjalan',
        diversi: { kepolisian:{}, kejaksaan:{}, pengadilan:{} },
        persidangan: { sidang:[], putusan:{} }
      },
      pasca_adjudikasi: d.pasca_adjudikasi || null
    }));
    saveAll();

    // Sinkron master: PK + Wilayah + Kepolisian
    let masterNote = '';
    try{
      const pkRemote = await fetchPkFromSheet();
      if(Array.isArray(pkRemote) && pkRemote.length){
        PK_MASTER = normalizePkMaster(pkRemote);
        masterNote += ', ' + PK_MASTER.length + ' PK';
      } else if(Array.isArray(pkRemote) && pkRemote.length === 0 && PK_MASTER.length && manual){
        try{ await pushPkListToSheet(); masterNote += ', PK diunggah'; }
        catch(upErr){ console.warn('seed PK', upErr); }
      }
    }catch(pkErr){ console.warn('Sinkron PK:', pkErr); masterNote += ', PK lokal'; }

    try{
      const wilRemote = await fetchWilayahFromSheet();
      if(Array.isArray(wilRemote) && wilRemote.length){
        WILAYAH_MASTER = normalizeWilayahMaster(wilRemote);
        masterNote += ', ' + WILAYAH_MASTER.length + ' wilayah';
      } else if(Array.isArray(wilRemote) && wilRemote.length === 0 && WILAYAH_MASTER.length && manual){
        try{ await pushWilayahListToSheet(); masterNote += ', wilayah diunggah'; }
        catch(upErr){ console.warn('seed wilayah', upErr); }
      }
    }catch(wErr){ console.warn('Sinkron wilayah:', wErr); masterNote += ', wilayah lokal'; }

    try{
      const polRemote = await fetchKepolisianFromSheet();
      if(Array.isArray(polRemote) && polRemote.length){
        KEPOLISIAN_MASTER = normalizeKepolisianMaster(polRemote);
        masterNote += ', ' + KEPOLISIAN_MASTER.length + ' polisi';
      } else if(Array.isArray(polRemote) && polRemote.length === 0 && KEPOLISIAN_MASTER.length && manual){
        try{ await pushKepolisianListToSheet(); masterNote += ', polisi diunggah'; }
        catch(upErr){ console.warn('seed polisi', upErr); }
      }
    }catch(pErr){ console.warn('Sinkron kepolisian:', pErr); masterNote += ', polisi lokal'; }

    saveMaster();

    if(dot){ dot.classList.remove('bg-red-500'); dot.classList.add('bg-emerald-500'); }
    if(text) text.textContent = 'Sinkron Google Sheet (' + allData.length + ' litmas' + masterNote + ')';
    if(manual) showToast('Sinkron berhasil: ' + allData.length + ' litmas' + masterNote, 'success');
    renderAllViews();
  }catch(e){
    console.error('syncDataFromSheets:', e);
    if(dot){ dot.classList.remove('bg-emerald-500'); dot.classList.add('bg-red-500'); }
    if(text) text.textContent = 'Gagal sinkron ke Google Sheet';
    if(manual) showToast('Gagal sinkron: ' + (e.message || e), 'error');
  }
}

// ==================== LIVE STATUS TICKER ====================
function updateRunningText(){
  const track = document.getElementById('running-text-track'); if(!track) return;
  const total = allData.length;
  const belumReg = allData.filter(d=>!d.registrasi).length;
  const sudahReg = allData.filter(d=>d.registrasi).length;
  const dalamAdj = allData.filter(d=>d.registrasi && getAdjStatus(d)==='Berjalan').length;
  const adjSelesai = allData.filter(d=>d.registrasi && getAdjStatus(d)==='Selesai').length;
  const bimbinganPasca = getPascaList().filter(d=>d.pasca_adjudikasi && d.pasca_adjudikasi.status==='Dalam Bimbingan').length;
  const divCount = allData.filter(d=>d.adjudikasi?.jalur==='Diversi').length;
  const sidCount = allData.filter(d=>d.adjudikasi?.jalur==='Persidangan').length;
  const litInt = allData.filter(d=>d.jenis_litmas==='Litmas Integrasi').length;
  const litPnd = allData.filter(d=>d.jenis_litmas==='Litmas Pendampingan ABH').length;
  const sidangBerjalan = getSidangBerjalanList().length;
  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  const jam = now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});

  // tone: info | warn | ok | accent | neutral
  const items = [
    { icon:'calendar', label: tgl, value: jam, tone:'neutral' },
    { icon:'folder-open', label:'Total Litmas', value: total, key:'total', tone:'info' },
    { icon:'layers', label:'Integrasi', value: litInt, key:'litInt', tone:'info' },
    { icon:'compass', label:'Pendampingan ABH', value: litPnd, key:'litPnd', tone:'accent' },
    { icon:'clock', label:'Belum Registrasi', value: belumReg, key:'belumReg', tone: belumReg>0?'warn':'ok' },
    { icon:'badge-check', label:'Teregistrasi', value: sudahReg, key:'sudahReg', tone:'ok' },
    { icon:'scale', label:'Adjudikasi Berjalan', value: dalamAdj, key:'dalamAdj', tone: dalamAdj>0?'warn':'ok' },
    { icon:'check-circle', label:'Adjudikasi Selesai', value: adjSelesai, key:'adjSelesai', tone:'ok' },
    { icon:'handshake', label:'Jalur Diversi', value: divCount, key:'divCount', tone:'info' },
    { icon:'landmark', label:'Jalur Persidangan', value: sidCount, key:'sidCount', tone:'accent' },
    { icon:'gavel', label:'Sidang Berjalan', value: sidangBerjalan, key:'sidangBerjalan', tone: sidangBerjalan>0?'warn':'neutral' },
    { icon:'heart-handshake', label:'Bimbingan Aktif', value: bimbinganPasca, key:'bimbinganPasca', tone: bimbinganPasca>0?'ok':'neutral' },
    { icon:'map-pin', label:'Wilayah', value: WILAYAH.length, key:'wilayah', tone:'neutral' },
    { icon:'users', label:'PK Aktif', value: PK_LIST.length, key:'pk', tone:'neutral' }
  ];

  const pill = (t) => {
    const clickable = t.key ? `type="button" onclick="showRunningTextDetail('${t.key}')"` : 'type="button" tabindex="-1"';
    const cls = t.key ? 'rt-pill rt-pill-click' : 'rt-pill';
    return `<button ${clickable} class="${cls} rt-tone-${t.tone||'neutral'}">
      <i data-lucide="${t.icon}" class="rt-pill-icon"></i>
      <span class="rt-pill-label">${t.label}</span>
      <span class="rt-pill-value">${t.value}</span>
    </button>`;
  };

  const group = items.map(pill).join('');
  // Duplikasi untuk seamless infinite scroll
  track.innerHTML = `<div class="rt-group">${group}</div><div class="rt-group" aria-hidden="true">${group}</div>`;
  lucide.createIcons();

  // Durasi proporsional dengan jumlah item (lebih banyak = lebih lambat)
  const secs = Math.max(28, items.length * 3.2);
  track.style.setProperty('--rt-duration', secs + 's');
}

// Kasus jalur Persidangan yang sudah punya minimal 1 jadwal sidang tapi putusan hakim belum terbit.
function getSidangBerjalanList(){
  return allData.filter(d=>{
    const p = d.adjudikasi?.persidangan;
    const sidangCount = (p?.sidang||[]).length;
    const putusanDone = !!p?.putusan?.tanggal;
    return d.adjudikasi?.jalur==='Persidangan' && sidangCount>=1 && !putusanDone;
  });
}

function getRunningTextDetailConfig(key){
  const withReg = d=>({name:d.nama_anak, extra:d.registrasi?.nomor||''});
  const cfg = {
    total: {title:'Total Permintaan Litmas', list: allData.map(d=>({name:d.nama_anak, extra:d.jenis_litmas||''}))},
    litInt: {title:'Litmas Integrasi', list: allData.filter(d=>d.jenis_litmas==='Litmas Integrasi').map(withReg)},
    litPnd: {title:'Litmas Pendampingan ABH', list: allData.filter(d=>d.jenis_litmas==='Litmas Pendampingan ABH').map(withReg)},
    belumReg: {title:'Belum Registrasi', list: allData.filter(d=>!d.registrasi).map(d=>({name:d.nama_anak, extra:d.jenis_litmas||''}))},
    sudahReg: {title:'Sudah Registrasi', list: allData.filter(d=>d.registrasi).map(withReg)},
    dalamAdj: {title:'Dalam Proses Adjudikasi', list: allData.filter(d=>d.registrasi && getAdjStatus(d)==='Berjalan').map(d=>({name:d.nama_anak, extra:getAdjTahapLabel(d)}))},
    adjSelesai: {title:'Adjudikasi Selesai', list: allData.filter(d=>d.registrasi && getAdjStatus(d)==='Selesai').map(d=>({name:d.nama_anak, extra:getAdjTahapLabel(d)}))},
    divCount: {title:'Jalur Diversi', list: allData.filter(d=>d.adjudikasi?.jalur==='Diversi').map(d=>({name:d.nama_anak, extra:getAdjTahapLabel(d)}))},
    sidCount: {title:'Jalur Persidangan', list: allData.filter(d=>d.adjudikasi?.jalur==='Persidangan').map(d=>({name:d.nama_anak, extra:getAdjTahapLabel(d)}))},
    sidangBerjalan: {title:'Sidang Sedang Berjalan', desc:'Anak dengan jalur Persidangan yang sudah dijadwalkan sidang namun putusan hakim belum terbit.', list: getSidangBerjalanList().map(d=>{
      const s = d.adjudikasi.persidangan.sidang; const last = s[s.length-1];
      return {name:d.nama_anak, extra:`Sidang ke-${last.ke} • ${fmtDate(last.tanggal)}`};
    })},
    bimbinganPasca: {title:'Bimbingan Pasca Adjudikasi (Aktif)', list: getPascaList().filter(d=>d.pasca_adjudikasi.status==='Dalam Bimbingan').map(d=>({name:d.nama_anak, extra:d.pasca_adjudikasi.pk_pembimbing||''}))},
    wilayah: {title:'Wilayah Kerja', list: WILAYAH.map(w=>({name:w}))},
    pk: {title:'Total PK', list: PK_LIST.map(p=>({name:p}))}
  };
  return cfg[key];
}

function showRunningTextDetail(key){
  const conf = getRunningTextDetailConfig(key); if(!conf) return;
  const rows = conf.list.length ? conf.list.map(x=>`
    <li class="py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 text-sm flex justify-between items-center gap-3">
      <span class="font-medium">${x.name||'-'}</span>${x.extra?`<span class="text-xs text-slate-400 shrink-0">${x.extra}</span>`:''}
    </li>`).join('') : `<li class="py-6 text-center text-slate-400 text-sm">Tidak ada data.</li>`;
  openModal(`
    <div class="flex justify-between items-center mb-3">
      <div><h3 class="font-bold text-lg">${conf.title}</h3><p class="text-xs text-slate-500">${conf.list.length} data</p></div>
      <button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button>
    </div>
    ${conf.desc?`<p class="text-xs text-slate-500 mb-3">${conf.desc}</p>`:''}
    <ul class="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">${rows}</ul>
  `);
}

// ==================== RENDER ALL ====================
function renderKpi(){
  const el = (id) => document.getElementById(id);
  const data = getScopedData();
  if (el('k-total')) el('k-total').textContent = data.length;
  if (el('k-belumreg')) el('k-belumreg').textContent = data.filter(d=>!d.registrasi).length;
  if (el('k-reg')) el('k-reg').textContent = data.filter(d=>d.registrasi).length;
  if (el('k-adj')) el('k-adj').textContent = data.filter(d=>d.registrasi && getAdjStatus(d)==='Berjalan').length;
  const pascaScoped = data.filter(d=>d.pasca_adjudikasi && d.pasca_adjudikasi.status==='Dalam Bimbingan');
  if (el('k-pasca')) el('k-pasca').textContent = pascaScoped.length;
  const upd = el('dash-updated');
  if (upd) {
    const now = new Date();
    const scopeNote = (dateFilter.from || dateFilter.to) ? (` · filter ${data.length}/${allData.length}`) : '';
    upd.textContent = 'Diperbarui ' + now.toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) + ' · ' + data.length + ' data' + scopeNote;
  }
  syncDateInputs();
}
function renderAllViews(){
  initDropdowns();
  renderKpi();
  updateRunningText();
  renderPermintaanTable();
  renderRegistrasiTables();
  renderAdjudikasiTable();
  renderPascaTable();
  renderPkTable();
  renderWilayahTable();
  renderKepolisianTable();
  renderRekapTable();
  renderAllCharts();
  lucide.createIcons();
  updateSortIndicators();
}

// ==================== PWA ====================
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const bar = document.getElementById('pwa-install-bar');
  if (bar) bar.classList.add('show');
});
function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then(() => {
    deferredInstallPrompt = null;
    const bar = document.getElementById('pwa-install-bar');
    if (bar) bar.classList.remove('show');
  });
}
function dismissPWABar() {
  const bar = document.getElementById('pwa-install-bar');
  if (bar) bar.classList.remove('show');
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW register failed', err));
  });
}

window.onload = function(){
  renderAllViews();
  if(gsheetUrl) syncDataFromSheets(false);
  lucide.createIcons();
  initAuth();
};
