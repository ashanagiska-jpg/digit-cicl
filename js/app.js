// ==================== DATA MASTER ====================
let WILAYAH = JSON.parse(localStorage.getItem('CICL_WILAYAH')||'null') || ['Kabupaten Lahat','Kabupaten Muara Enim','Kabupaten PALI','Kabupaten Empat Lawang','Kota Pagar Alam'];
let KEPOLISIAN = JSON.parse(localStorage.getItem('CICL_POLISI')||'null') || {
  'Kabupaten Lahat':['Polres Lahat','Polsek Kota Lahat','Polsek Merapi','Polsek Kikim Barat','Polsek Kikim Timur','Polsek Kikim Tengah','Polsek Kikim Selatan','Polsek Jarai','Polsek Pajar Bulan','Polsek Pulau Pinang','Polsek Tanjung Sakti','Polsek Mulak Ulu','Polsek Gumay Talang','Polsek Pseksu'],
  'Kabupaten Muara Enim':['Polres Muara Enim','Polsek Lawang Kidul','Polsek Muara Enim','Polsek Gelumbang','Polsek Tanjung Agung','Polsek Rambang Dangku','Polsek Benakat','Polsek Lembak','Polsek Sungai Rotan','Polsek Semende','Polsek Rambang','Polsek Rambang Lubai','Polsek Gunung Megang'],
  'Kabupaten PALI':['Polres PALI','Polsek Talang Ubi','Polsek Penukal Abab','Polsek Tanah Abang'],
  'Kabupaten Empat Lawang':['Polres Empat Lawang','Polsek Tebing Tinggi','Polsek Pendopo','Polsek Ulu Musi','Polsek Pasemah Air Keruh','Polsek Saling'],
  'Kota Pagar Alam':['Polres Pagar Alam','Polsek Pagar Alam Utara','Polsek Pagar Alam Selatan','Polsek Dempo Utara','Polsek Dempo Selatan']
};
let PK_LIST = JSON.parse(localStorage.getItem('CICL_PK')||'null') || ['Firman Syahri','Sarnudi','Merwandi','Rinto Harahap','Darwind Sepriyansyah','M. Habibur Rozak','M. Eryzal Qarnein','Revan Kurniadi','Marendi Pusaka','Armicho Roy Jaka Suma',
'Henry Manumpak','Simamora','Arief Tri Hantoro','Choirul Muslimah','Pinesthi Laksa Ambawani'];

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
  localStorage.setItem('CICL_WILAYAH', JSON.stringify(WILAYAH));
  localStorage.setItem('CICL_POLISI', JSON.stringify(KEPOLISIAN));
  localStorage.setItem('CICL_PK', JSON.stringify(PK_LIST));
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
  const t = document.getElementById('page-'+pageId); if(t) t.classList.add('active');
  document.querySelectorAll('.sidebar-link').forEach(l=>l.classList.toggle('active', l.getAttribute('data-page')===pageId));
  const titles = {dashboard:'Dashboard Monitoring', permintaan:'Permintaan Litmas ABH', registrasi:'Registrasi Anak', adjudikasi:'Tracking Adjudikasi', pasca:'Pasca Adjudikasi (Bimbingan)', pk:'Data PK', wilayah:'Wilayah Kerja', kepolisian:'Data Kepolisian', rekap:'Rekapitulasi PK', statistik:'Statistik & Visualisasi'};
  document.getElementById('nav-title').textContent = titles[pageId] || 'DIGIT-CICL';
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
  const q = (document.getElementById('q-permintaan')?.value||'').toLowerCase();
  const jl = document.getElementById('f-jenislitmas')?.value||'';
  const wl = document.getElementById('f-wilayah-p')?.value||'';
  const st = document.getElementById('f-status-p')?.value||'';
  return allData.filter(d=>{
    const mq = !q || (d.nama_anak||'').toLowerCase().includes(q) || (d.nomor_surat||'').toLowerCase().includes(q);
    return mq && (!jl||d.jenis_litmas===jl) && (!wl||d.wilayah_asal===wl) && (!st||d.status_jenis===st);
  });
}
function renderPermintaanTable(){
  const tbody = document.getElementById('tb-permintaan'); if(!tbody) return;
  let data = getFilteredPermintaan();
  data = sortByTable(data, 'permintaan', (d,key)=> key==='registrasi' ? (d.registrasi?d.registrasi.nomor:'') : d[key]);
  const pg = paginate(data, 'permintaan');
  tbody.innerHTML = pg.slice.length ? pg.slice.map(d=>`
    <tr>
      <td class="font-semibold">${d.nomor_surat||'-'}</td><td>${fmtDate(d.tanggal_surat)}</td><td>${fmtDate(d.tanggal_diterima)}</td>
      <td>${d.nama_anak||'-'}</td><td>${d.jenis_kelamin||'-'}</td><td>${d.jenis_litmas||'-'}</td>
      <td>${d.jenis_perkara||'-'}</td><td>${d.wilayah_asal||'-'}</td><td>${d.kepolisian||'-'}</td><td>${d.nama_pk||'-'}</td>
      <td><span class="badge ${d.status_jenis==='Selesai'?'badge-green':d.status_jenis==='Pending'?'badge-amber':'badge-blue'}">${d.status_jenis||'-'}</span></td>
      <td>${d.registrasi?`<span class="badge badge-indigo">${d.registrasi.nomor}</span>`:'<span class="badge badge-slate">Belum</span>'}</td>
      <td class="text-center whitespace-nowrap">
        ${d.link_surat_permintaan ? `<a href="${d.link_surat_permintaan}" target="_blank" class="btn btn-ghost btn-sm" title="Lihat Berkas Surat"><i data-lucide="file-text" class="w-3.5 h-3.5"></i></a>` : ''}
        ${d.link_berkas_litmas ? `<a href="${d.link_berkas_litmas}" target="_blank" class="btn btn-ghost btn-sm" title="Lihat Berkas Litmas"><i data-lucide="file-check-2" class="w-3.5 h-3.5"></i></a>` : ''}
        ${isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="openLitmasModal('${d.id}')" title="Edit"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteLitmas('${d.id}')" title="Hapus"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : `<span class="text-slate-400 text-xs">Lihat saja</span>`}
      </td>
    </tr>`).join('') : `<tr><td colspan="13" class="text-center py-8 text-slate-400">Tidak ada data.</td></tr>`;
  renderPagination('pg-permintaan', 'permintaan', pg.total, pg.pages, pg.page);
  lucide.createIcons();
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
function getFilteredRegistrasi(){
  const q = (document.getElementById('q-registrasi')?.value||'').toLowerCase();
  return allData.filter(d => !q || (d.nama_anak||'').toLowerCase().includes(q) || (d.registrasi?.nomor||'').toLowerCase().includes(q));
}
function regGetter(d,key){
  if(key==='reg_nomor') return d.registrasi?.nomor||'';
  if(key==='reg_tanggal') return d.registrasi?.tanggal||'';
  return d[key];
}
function renderRegistrasiTables(){
  const data = getFilteredRegistrasi();
  const stF = document.getElementById('f-reg-status')?.value||'';
  let belum = data.filter(d=>!d.registrasi && stF!=='sudah');
  let sudah = data.filter(d=>d.registrasi && stF!=='belum');
  belum = sortByTable(belum, 'reg-belum', regGetter);
  sudah = tableSort['reg-sudah'] ? sortByTable(sudah, 'reg-sudah', regGetter) : sudah.sort((a,b)=> new Date(b.registrasi.tanggal) - new Date(a.registrasi.tanggal));
  const pgB = paginate(belum, 'reg-belum');
  const pgS = paginate(sudah, 'reg-sudah');
  const tbBelum = document.getElementById('tb-reg-belum');
  if(tbBelum) tbBelum.innerHTML = pgB.slice.length ? pgB.slice.map(d=>`
    <tr><td class="font-semibold">${d.nomor_surat||'-'}</td><td>${d.nama_anak||'-'}</td><td>${d.jenis_kelamin||'-'}</td><td>${d.jenis_litmas||'-'}</td><td>${d.wilayah_asal||'-'}</td><td>${d.nama_pk||'-'}</td>
    <td class="text-center">${isAdmin() ? `<button class="btn btn-gold btn-sm" onclick="registrasiAnak('${d.id}')"><i data-lucide="hash" class="w-3.5 h-3.5"></i>Registrasi</button>` : `<span class="text-slate-400 text-xs">-</span>`}</td></tr>
  `).join('') : `<tr><td colspan="7" class="text-center py-6 text-slate-400">Tidak ada data menunggu registrasi.</td></tr>`;
  const tbSudah = document.getElementById('tb-reg-sudah');
  if(tbSudah) tbSudah.innerHTML = pgS.slice.length ? pgS.slice.map(d=>`
    <tr><td class="font-bold text-brand-navy dark:text-amber-400">${d.registrasi.nomor}</td><td>${fmtDate(d.registrasi.tanggal)}</td><td>${d.nama_anak||'-'}</td><td>${d.jenis_kelamin||'-'}</td><td>${d.jenis_litmas||'-'}</td><td>${d.wilayah_asal||'-'}</td><td>${d.nama_pk||'-'}</td>
    <td class="text-center">${isAdmin() ? `<button class="btn btn-danger btn-sm" onclick="batalRegistrasi('${d.id}')" title="Batalkan"><i data-lucide="undo-2" class="w-3.5 h-3.5"></i></button>` : `<span class="text-slate-400 text-xs">-</span>`}</td></tr>
  `).join('') : `<tr><td colspan="8" class="text-center py-6 text-slate-400">Belum ada anak yang teregistrasi.</td></tr>`;
  renderPagination('pg-reg-belum', 'reg-belum', pgB.total, pgB.pages, pgB.page);
  renderPagination('pg-reg-sudah', 'reg-sudah', pgS.total, pgS.pages, pgS.page);
  lucide.createIcons();
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
function getFilteredAdjudikasi(){
  const q = (document.getElementById('q-adjudikasi')?.value||'').toLowerCase();
  const jalur = document.getElementById('f-adj-jalur')?.value||'';
  const st = document.getElementById('f-adj-status')?.value||'';
  return allData.filter(d=>d.registrasi).filter(d=>{
    const mq = !q || (d.nama_anak||'').toLowerCase().includes(q) || (d.registrasi?.nomor||'').toLowerCase().includes(q);
    const mj = !jalur || (jalur==='Belum' ? !d.adjudikasi?.jalur : d.adjudikasi?.jalur===jalur);
    const ms = !st || getAdjStatus(d)===st;
    return mq && mj && ms;
  });
}
function adjudikasiGetter(d,key){
  if(key==='reg_nomor') return d.registrasi?.nomor||'';
  if(key==='jalur') return d.adjudikasi?.jalur||'';
  if(key==='tahap') return getAdjTahapLabel(d);
  if(key==='status') return getAdjStatus(d);
  return d[key];
}
function renderAdjudikasiTable(){
  const tbody = document.getElementById('tb-adjudikasi'); if(!tbody) return;
  let data = getFilteredAdjudikasi();
  data = sortByTable(data, 'adjudikasi', adjudikasiGetter);
  const pg = paginate(data, 'adjudikasi');
  tbody.innerHTML = pg.slice.length ? pg.slice.map(d=>{
    const tahap = getAdjTahapLabel(d); const status = getAdjStatus(d);
    return `<tr>
      <td class="font-semibold">${d.registrasi.nomor}</td><td>${d.nama_anak}</td>
      <td><span class="badge ${d.adjudikasi?.jalur==='Diversi'?'badge-indigo':d.adjudikasi?.jalur==='Persidangan'?'badge-pink':'badge-slate'}">${d.adjudikasi?.jalur||'Belum Ditentukan'}</span></td>
      <td class="text-xs">${tahap}</td>
      <td><span class="badge ${status==='Selesai'?'badge-green':'badge-amber'}">${status}</span></td>
      <td>${d.nama_pk||'-'}</td>
      <td class="text-center">${status==='Selesai'
        ? `<button class="btn btn-ghost btn-sm" onclick="openAdjudikasiModal('${d.id}')"><i data-lucide="eye" class="w-3.5 h-3.5"></i>View</button>`
        : `<button class="btn btn-gold btn-sm" onclick="openAdjudikasiModal('${d.id}')"><i data-lucide="scale" class="w-3.5 h-3.5"></i>Kelola</button>`}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada anak teregistrasi untuk ditracking adjudikasinya.</td></tr>`;
  renderPagination('pg-adjudikasi', 'adjudikasi', pg.total, pg.pages, pg.page);
  lucide.createIcons();
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
function openPkModal(oldName){
  if(guardWrite())return;
  openModal(`<div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">${oldName?'Edit':'Tambah'} PK</h3><button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button></div>
  <div><label class="fl">Nama PK</label><input class="form-input" id="pk-name" value="${oldName||''}"></div>
  <div class="flex justify-end gap-2 pt-4"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="savePk('${oldName||''}')">Simpan</button></div>`);
}
function savePk(oldName){
  if(guardWrite())return;
  const name = val('pk-name'); if(!name) return;
  if(oldName){ const i = PK_LIST.indexOf(oldName); if(i>-1) PK_LIST[i]=name; allData.forEach(d=>{ if(d.nama_pk===oldName) d.nama_pk=name; }); }
  else PK_LIST.push(name);
  saveMaster(); saveAll(); closeModal(); renderAllViews(); showToast('Data PK disimpan','success');
}
function deletePk(name){ if(guardWrite())return; if(!confirm('Hapus PK '+name+'?')) return; PK_LIST = PK_LIST.filter(p=>p!==name); saveMaster(); renderAllViews(); }
function renderPkTable(){
  const tbody = document.getElementById('tb-pk'); if(!tbody) return;
  let rows = PK_LIST.map(p=>{
    const casesForPk = allData.filter(d=>d.nama_pk===p);
    return {
      name: p,
      int: casesForPk.filter(d=>d.jenis_litmas==='Litmas Integrasi').length,
      pnd: casesForPk.filter(d=>d.jenis_litmas==='Litmas Pendampingan ABH').length,
      total: casesForPk.length
    };
  });
  rows = sortByTable(rows, 'pk', (r,key)=>r[key]);
  const pg = paginate(rows, 'pk');
  tbody.innerHTML = pg.slice.map((r,i)=>`<tr><td>${pg.start+i+1}</td><td>${r.name}</td>
    <td class="text-center"><span class="badge badge-blue" style="cursor:pointer" onclick="showStatDetail('Litmas Integrasi — PK ${r.name}', allData.filter(d=>d.nama_pk==='${r.name}' && d.jenis_litmas==='Litmas Integrasi'))">${r.int}</span></td>
    <td class="text-center"><span class="badge badge-indigo" style="cursor:pointer" onclick="showStatDetail('Litmas Pendampingan ABH — PK ${r.name}', allData.filter(d=>d.nama_pk==='${r.name}' && d.jenis_litmas==='Litmas Pendampingan ABH'))">${r.pnd}</span></td>
    <td class="font-bold text-center">${r.total}</td>
    <td class="text-center">${isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="openPkModal('${r.name}')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
    <button class="btn btn-danger btn-sm" onclick="deletePk('${r.name}')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : `<span class="text-slate-400 text-xs">-</span>`}</td></tr>`).join('');
  renderPagination('pg-pk', 'pk', pg.total, pg.pages, pg.page);
  lucide.createIcons();
}

function openWilayahModal(oldName){
  if(guardWrite())return;
  openModal(`<div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">${oldName?'Edit':'Tambah'} Wilayah</h3><button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button></div>
  <div><label class="fl">Nama Wilayah</label><input class="form-input" id="wil-name" value="${oldName||''}"></div>
  <div class="flex justify-end gap-2 pt-4"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="saveWilayah('${oldName||''}')">Simpan</button></div>`);
}
function saveWilayah(oldName){
  if(guardWrite())return;
  const name = val('wil-name'); if(!name) return;
  if(oldName){ const i=WILAYAH.indexOf(oldName); if(i>-1) WILAYAH[i]=name; KEPOLISIAN[name]=KEPOLISIAN[oldName]||[]; if(name!==oldName) delete KEPOLISIAN[oldName]; allData.forEach(d=>{ if(d.wilayah_asal===oldName) d.wilayah_asal=name; }); }
  else { WILAYAH.push(name); KEPOLISIAN[name]=[]; }
  saveMaster(); saveAll(); closeModal(); renderAllViews(); showToast('Data wilayah disimpan','success');
}
function deleteWilayah(name){ if(guardWrite())return; if(!confirm('Hapus wilayah '+name+'?')) return; WILAYAH=WILAYAH.filter(w=>w!==name); delete KEPOLISIAN[name]; saveMaster(); renderAllViews(); }
function renderWilayahTable(){
  const tbody = document.getElementById('tb-wilayah'); if(!tbody) return;
  let rows = WILAYAH.map(w=>({name:w, total: allData.filter(d=>d.wilayah_asal===w).length}));
  rows = sortByTable(rows, 'wilayah', (r,key)=>r[key]);
  const pg = paginate(rows, 'wilayah');
  tbody.innerHTML = pg.slice.map((r,i)=>`<tr><td>${pg.start+i+1}</td><td>${r.name}</td><td>${r.total}</td>
  <td class="text-center">${isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="openWilayahModal('${r.name}')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
  <button class="btn btn-danger btn-sm" onclick="deleteWilayah('${r.name}')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : `<span class="text-slate-400 text-xs">-</span>`}</td></tr>`).join('');
  renderPagination('pg-wilayah', 'wilayah', pg.total, pg.pages, pg.page);
  lucide.createIcons();
}

function openKepolisianModal(wil, oldName){
  if(guardWrite())return;
  openModal(`<div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg">${oldName?'Edit':'Tambah'} Kepolisian</h3><button onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button></div>
  <div class="space-y-3">
    <div><label class="fl">Wilayah</label><select class="form-input" id="pol-wil">${WILAYAH.map(w=>`<option ${wil===w?'selected':''}>${w}</option>`).join('')}</select></div>
    <div><label class="fl">Nama Kepolisian</label><input class="form-input" id="pol-name" value="${oldName||''}"></div>
  </div>
  <div class="flex justify-end gap-2 pt-4"><button class="btn btn-ghost" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="saveKepolisian('${wil||''}','${oldName||''}')">Simpan</button></div>`);
}
function saveKepolisian(oldWil, oldName){
  if(guardWrite())return;
  const wil = val('pol-wil'); const name = val('pol-name'); if(!name) return;
  if(!KEPOLISIAN[wil]) KEPOLISIAN[wil]=[];
  if(oldName){ KEPOLISIAN[oldWil] = (KEPOLISIAN[oldWil]||[]).filter(p=>p!==oldName); }
  KEPOLISIAN[wil].push(name);
  saveMaster(); closeModal(); renderAllViews(); showToast('Data kepolisian disimpan','success');
}
function deleteKepolisian(wil, name){ if(guardWrite())return; if(!confirm('Hapus '+name+'?')) return; KEPOLISIAN[wil] = (KEPOLISIAN[wil]||[]).filter(p=>p!==name); saveMaster(); renderAllViews(); }
function renderKepolisianTable(){
  const tbody = document.getElementById('tb-kepolisian'); if(!tbody) return;
  let items = [];
  WILAYAH.forEach(w=>{ (KEPOLISIAN[w]||[]).forEach(p=>{
    items.push({wilayah:w, nama:p, total: allData.filter(d=>d.kepolisian===p).length});
  });});
  items = sortByTable(items, 'kepolisian', (r,key)=>r[key]);
  const pg = paginate(items, 'kepolisian');
  tbody.innerHTML = pg.slice.length ? pg.slice.map((r,i)=>`<tr><td>${pg.start+i+1}</td><td>${r.wilayah}</td><td>${r.nama}</td><td>${r.total}</td>
    <td class="text-center">${isAdmin() ? `<button class="btn btn-ghost btn-sm" onclick="openKepolisianModal('${r.wilayah}','${r.nama}')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>
    <button class="btn btn-danger btn-sm" onclick="deleteKepolisian('${r.wilayah}','${r.nama}')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>` : `<span class="text-slate-400 text-xs">-</span>`}</td></tr>`).join('') : `<tr><td colspan="5" class="text-center py-6 text-slate-400">Belum ada data.</td></tr>`;
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
  const isDark = document.documentElement.classList.contains('dark');
  const tc = isDark ? '#e2e8f0' : '#334155';
  const mk = (id,type,data,opts={})=>{
    const ctx = document.getElementById(id)?.getContext('2d'); if(!ctx) return;
    if(charts[id]) charts[id].destroy();
    ctx.canvas.style.cursor = 'pointer';
    charts[id] = new Chart(ctx,{type,data,options:Object.assign({responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:tc}}},scales:type==='bar'||type==='line'?{x:{ticks:{color:tc}},y:{ticks:{color:tc}}}:{}},opts)});
  };

  // --- Distribusi Wilayah (klik untuk detail per wilayah) ---
  mk('ch-wil','doughnut',{labels:WILAYAH,datasets:[{data:WILAYAH.map(w=>allData.filter(d=>d.wilayah_asal===w).length),backgroundColor:['#1e3a5f','#d4a843','#10b981','#3b82f6','#8b5cf6','#ec4899']}]},{
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const wil = WILAYAH[el.index];
      showStatDetail(`Wilayah: ${wil}`, allData.filter(d=>d.wilayah_asal===wil)); }
  });

  // --- Jalur Adjudikasi (klik untuk detail per jalur) ---
  const divCount = allData.filter(d=>d.adjudikasi?.jalur==='Diversi').length;
  const sidCount = allData.filter(d=>d.adjudikasi?.jalur==='Persidangan').length;
  const belumCount = allData.filter(d=>d.registrasi && !d.adjudikasi?.jalur).length;
  const jalurLabels = ['Diversi','Persidangan','Belum Ditentukan'];
  mk('ch-jalur','pie',{labels:jalurLabels,datasets:[{data:[divCount,sidCount,belumCount],backgroundColor:['#3b82f6','#ec4899','#94a3b8']}]},{
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const label = jalurLabels[el.index];
      const list = label==='Belum Ditentukan' ? allData.filter(d=>d.registrasi && !d.adjudikasi?.jalur) : allData.filter(d=>d.adjudikasi?.jalur===label);
      showStatDetail(`Jalur Adjudikasi: ${label}`, list); }
  });

  // --- Beban Kerja PK, dipisah per Jenis Litmas ---
  mk('st-pk','bar',{labels:PK_LIST,datasets:JENIS_LITMAS_LIST.map(jenis=>({
    label:jenis,
    data:PK_LIST.map(p=>allData.filter(d=>d.nama_pk===p && d.jenis_litmas===jenis).length),
    backgroundColor:JENIS_COLORS[jenis],
    borderRadius:6
  }))},{
    indexAxis:'y',
    scales:{x:{stacked:true,ticks:{color:tc}},y:{stacked:true,ticks:{color:tc}}},
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const pk = PK_LIST[el.index]; const jenis = JENIS_LITMAS_LIST[el.datasetIndex];
      showStatDetail(`${jenis} — PK ${pk}`, allData.filter(d=>d.nama_pk===pk && d.jenis_litmas===jenis)); }
  });

  // --- Tren Bulanan Permintaan, dipisah per Jenis Litmas ---
  const months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const trendByJenis = {'Litmas Integrasi': new Array(12).fill(0), 'Litmas Pendampingan ABH': new Array(12).fill(0)};
  allData.forEach(d=>{ if(d.tanggal_diterima && trendByJenis[d.jenis_litmas]){ const m=new Date(d.tanggal_diterima).getMonth(); if(m>=0&&m<12) trendByJenis[d.jenis_litmas][m]++; } });
  mk('st-trend','line',{labels:months,datasets:[
    {label:'Litmas Integrasi',data:trendByJenis['Litmas Integrasi'],borderColor:JENIS_COLORS['Litmas Integrasi'],backgroundColor:'rgba(30,58,95,.15)',fill:true,tension:.3},
    {label:'Litmas Pendampingan ABH',data:trendByJenis['Litmas Pendampingan ABH'],borderColor:JENIS_COLORS['Litmas Pendampingan ABH'],backgroundColor:'rgba(139,92,246,.15)',fill:true,tension:.3}
  ]},{
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const monthIdx = el.index; const jenis = JENIS_LITMAS_LIST[el.datasetIndex];
      const list = allData.filter(d=>d.jenis_litmas===jenis && d.tanggal_diterima && new Date(d.tanggal_diterima).getMonth()===monthIdx);
      showStatDetail(`${jenis} — Bulan ${months[monthIdx]}`, list); }
  });

  // --- Jenis Litmas (klik untuk detail) ---
  mk('st-jenis','pie',{labels:JENIS_LITMAS_LIST,datasets:[{data:JENIS_LITMAS_LIST.map(j=>allData.filter(d=>d.jenis_litmas===j).length),backgroundColor:[JENIS_COLORS['Litmas Integrasi'],JENIS_COLORS['Litmas Pendampingan ABH']]}]},{
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const jenis = JENIS_LITMAS_LIST[el.index];
      showStatDetail(jenis, allData.filter(d=>d.jenis_litmas===jenis)); }
  });

  // --- Status Adjudikasi (klik untuk detail) ---
  const adjSelesai = allData.filter(d=>d.registrasi && getAdjStatus(d)==='Selesai').length;
  const adjBerjalan = allData.filter(d=>d.registrasi && getAdjStatus(d)==='Berjalan').length;
  const adjLabels = ['Selesai','Berjalan'];
  mk('st-adj','doughnut',{labels:adjLabels,datasets:[{data:[adjSelesai,adjBerjalan],backgroundColor:['#10b981','#f59e0b']}]},{
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const label = adjLabels[el.index];
      showStatDetail(`Adjudikasi ${label}`, allData.filter(d=>d.registrasi && getAdjStatus(d)===label)); }
  });

  // --- Statistik Jenis Tindak Pidana (berdasarkan field Jenis Perkara) ---
  const perkaraMap = {};
  allData.forEach(d=>{ const p = (d.jenis_perkara||'').trim(); if(!p) return; (perkaraMap[p] = perkaraMap[p]||[]).push(d); });
  const perkaraLabels = Object.keys(perkaraMap).sort((a,b)=> perkaraMap[b].length - perkaraMap[a].length);
  mk('st-perkara','bar',{labels:perkaraLabels,datasets:[{label:'Jumlah Kasus',data:perkaraLabels.map(p=>perkaraMap[p].length),backgroundColor:'#d4a843',borderRadius:6}]},{
    indexAxis:'y',
    plugins:{legend:{display:false}},
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const p = perkaraLabels[el.index];
      showStatDetail(`Jenis Tindak Pidana: ${p}`, perkaraMap[p]); }
  });

  // --- Jumlah Sidang per Bulan (dari seluruh jadwal sidang persidangan) ---
  const sidangByMonth = new Array(12).fill(0).map(()=>[]);
  allData.forEach(d=>{ (d.adjudikasi?.persidangan?.sidang||[]).forEach(s=>{
    if(!s.tanggal) return; const m = new Date(s.tanggal).getMonth(); if(m>=0&&m<12) sidangByMonth[m].push(d);
  }); });
  mk('st-sidang','bar',{labels:months,datasets:[{label:'Jumlah Sidang',data:sidangByMonth.map(l=>l.length),backgroundColor:'#3b82f6',borderRadius:6}]},{
    plugins:{legend:{display:false}},
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const m = el.index;
      const uniq = Array.from(new Map(sidangByMonth[m].map(d=>[d.id,d])).values());
      showStatDetail(`Sidang — Bulan ${months[m]}`, uniq); }
  });

  // --- Jumlah Putusan per Bulan ---
  const putusanByMonth = new Array(12).fill(0).map(()=>[]);
  allData.forEach(d=>{ const tgl = d.adjudikasi?.persidangan?.putusan?.tanggal; if(!tgl) return; const m = new Date(tgl).getMonth(); if(m>=0&&m<12) putusanByMonth[m].push(d); });
  mk('st-putusan','bar',{labels:months,datasets:[{label:'Jumlah Putusan',data:putusanByMonth.map(l=>l.length),backgroundColor:'#ec4899',borderRadius:6}]},{
    plugins:{legend:{display:false}},
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const m = el.index;
      showStatDetail(`Putusan — Bulan ${months[m]}`, putusanByMonth[m]); }
  });

  // --- Jumlah Diversi Berhasil per Bulan (dari tingkat kepolisian/kejaksaan/pengadilan) ---
  const diversiOkByMonth = new Array(12).fill(0).map(()=>[]);
  allData.forEach(d=>{
    const dv = d.adjudikasi?.diversi; if(!dv) return;
    ['kepolisian','kejaksaan','pengadilan'].forEach(tier=>{
      const t = dv[tier]; if(t && t.hasil==='Berhasil' && t.tanggal){ const m = new Date(t.tanggal).getMonth(); if(m>=0&&m<12) diversiOkByMonth[m].push(d); }
    });
  });
  mk('st-diversi-berhasil','bar',{labels:months,datasets:[{label:'Diversi Berhasil',data:diversiOkByMonth.map(l=>l.length),backgroundColor:'#10b981',borderRadius:6}]},{
    plugins:{legend:{display:false}},
    onClick:(evt,els,chart)=>{ const el = els[0]||clickedEl(evt,chart); if(!el) return; const m = el.index;
      const uniq = Array.from(new Map(diversiOkByMonth[m].map(d=>[d.id,d])).values());
      showStatDetail(`Diversi Berhasil — Bulan ${months[m]}`, uniq); }
  });
}

function fmtDate(s){ if(!s) return '-'; const d = new Date(s); if(isNaN(d)) return s; return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}); }

// ==================== GOOGLE SHEET SYNC (opsional) ====================
async function sendToSheet(action, payload){
  if(!gsheetUrl) return;
  try{
    await fetch(gsheetUrl,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
  }catch(e){ console.error('Gagal sinkron ke sheet',e); }
}
// Sama seperti sendToSheet, tapi RESPONSNYA BISA DIBACA (dipakai saat perlu URL hasil
// unggah berkas dari Drive). Content-Type text/plain dipakai agar tidak memicu
// preflight CORS yang tidak didukung Apps Script Web App.
async function postToSheetJSON(action, payload){
  if(!gsheetUrl) throw new Error('URL Google Apps Script belum diisi di menu Pengaturan.');
  const res = await fetch(gsheetUrl, {
    method:'POST',
    headers:{'Content-Type':'text/plain;charset=utf-8'},
    body: JSON.stringify({action, ...payload})
  });
  const json = await res.json();
  if(json.status === 'error') throw new Error(json.message || 'Gagal memproses permintaan di server.');
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
// Mengunggah berkas ke folder Google Drive tertentu lewat Apps Script, mengembalikan { url, fileId, fileName }.
async function uploadFileToDrive(file, folderId){
  const base64 = await fileToBase64(file);
  return postToSheetJSON('upload_file', { fileData: base64, fileName: file.name, mimeType: file.type || 'application/octet-stream', folderId });
}
async function syncDataFromSheets(manual){
  const dot = document.getElementById('sheet-status-dot'); const text = document.getElementById('sheet-status-text');
  if(!gsheetUrl){ if(manual) showToast('Isi URL Google Apps Script dulu di menu Pengaturan','error'); return; }
  try{
    if(text) text.textContent = 'Menyinkronkan...';
    const res = await fetch(gsheetUrl); const data = await res.json();
    if(Array.isArray(data)){
      allData = data.map(d=>({
        ...d,
        registrasi: d.nomor_registrasi ? {nomor:d.nomor_registrasi, tanggal:d.tanggal_registrasi, tahun:new Date(d.tanggal_registrasi).getFullYear()} : null,
        adjudikasi: d.adjudikasi || {jalur:null,status:'Berjalan',diversi:{kepolisian:{},kejaksaan:{},pengadilan:{}},persidangan:{sidang:[],putusan:{}}},
        pasca_adjudikasi: d.pasca_adjudikasi || null
      }));
      saveAll();
      if(dot) dot.classList.remove('bg-red-500'); if(dot) dot.classList.add('bg-emerald-500');
      if(text) text.textContent = 'Sinkron dengan Google Sheet';
      if(manual) showToast('Data berhasil disinkronkan','success');
      renderAllViews();
    }
  }catch(e){
    console.error(e);
    if(dot){ dot.classList.remove('bg-emerald-500'); dot.classList.add('bg-red-500'); }
    if(text) text.textContent = 'Gagal sinkron ke Google Sheet';
    if(manual) showToast('Gagal sinkron ke Google Sheet','error');
  }
}

// ==================== RUNNING TEXT (info ticker) ====================
function updateRunningText(){
  const track = document.getElementById('running-text-track'); if(!track) return;
  const total = allData.length;
  const belumReg = allData.filter(d=>!d.registrasi).length;
  const sudahReg = allData.filter(d=>d.registrasi).length;
  const dalamAdj = allData.filter(d=>d.registrasi && getAdjStatus(d)==='Berjalan').length;
  const adjSelesai = allData.filter(d=>d.registrasi && getAdjStatus(d)==='Selesai').length;
  const bimbinganPasca = getPascaList().filter(d=>d.pasca_adjudikasi.status==='Dalam Bimbingan').length;
  const divCount = allData.filter(d=>d.adjudikasi?.jalur==='Diversi').length;
  const sidCount = allData.filter(d=>d.adjudikasi?.jalur==='Persidangan').length;
  const litInt = allData.filter(d=>d.jenis_litmas==='Litmas Integrasi').length;
  const litPnd = allData.filter(d=>d.jenis_litmas==='Litmas Pendampingan ABH').length;
  const sidangBerjalan = getSidangBerjalanList().length;
  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  const items = [
    {label:`📅 ${tgl}`},
    {label:`📊 Total Permintaan Litmas: ${total}`, key:'total'},
    {label:`📥 Litmas Integrasi: ${litInt}`, key:'litInt'},
    {label:`🧭 Litmas Pendampingan ABH: ${litPnd}`, key:'litPnd'},
    {label:`⏳ Belum Registrasi: ${belumReg}`, key:'belumReg'},
    {label:`🔢 Sudah Registrasi: ${sudahReg}`, key:'sudahReg'},
    {label:`⚖️ Dalam Proses Adjudikasi: ${dalamAdj}`, key:'dalamAdj'},
    {label:`✅ Adjudikasi Selesai: ${adjSelesai}`, key:'adjSelesai'},
    {label:`🤝 Jalur Diversi: ${divCount}`, key:'divCount'},
    {label:`🏛️ Jalur Persidangan: ${sidCount}`, key:'sidCount'},
    {label:`🧑‍⚖️ Sidang Sedang Berjalan: ${sidangBerjalan}`, key:'sidangBerjalan'},
    {label:`❤️ Bimbingan Pasca Adjudikasi (Aktif): ${bimbinganPasca}`, key:'bimbinganPasca'},
    {label:`🏢 Wilayah Kerja: ${WILAYAH.length}`, key:'wilayah'},
    {label:`👥 Total PK: ${PK_LIST.length}`, key:'pk'},
    {label:`DIGIT-CICL — Sistem Litmas, Registrasi & Tracking Adjudikasi Anak, Bapas Kelas II Lahat`}
  ];
  const groupHtml = items.map(t=> t.key
    ? `<button type="button" class="running-text-item" onclick="showRunningTextDetail('${t.key}')">${t.label}<span class="rt-dot"></span></button>`
    : `<span class="running-text-item">${t.label}<span class="rt-dot"></span></span>`
  ).join('');
  // Konten digandakan 2x agar animasi scroll berputar mulus tanpa jeda (seamless loop).
  track.innerHTML = `<span class="running-text-group">${groupHtml}</span><span class="running-text-group">${groupHtml}</span>`;
  lucide.createIcons();
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
  document.getElementById('k-total').textContent = allData.length;
  document.getElementById('k-belumreg').textContent = allData.filter(d=>!d.registrasi).length;
  document.getElementById('k-reg').textContent = allData.filter(d=>d.registrasi).length;
  document.getElementById('k-adj').textContent = allData.filter(d=>d.registrasi && getAdjStatus(d)==='Berjalan').length;
  document.getElementById('k-pasca').textContent = getPascaList().filter(d=>d.pasca_adjudikasi.status==='Dalam Bimbingan').length;
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
