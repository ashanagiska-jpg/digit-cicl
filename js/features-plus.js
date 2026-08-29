/**
 * DIGIT-CICL — Fitur Plus
 * Prioritas tinggi & sedang:
 * 1. Kalender Sidang & Reminder
 * 2. Dashboard "Yang Perlu Ditindak Hari Ini"
 * 3. Beban Kerja PK real-time
 * 4. Timeline visual per anak
 * 5. Laporan otomatis (bulanan / triwulanan)
 * 6. Pencarian global Ctrl+K
 * 7. Audit log
 * 8. Monitoring masa bimbingan (PB/CB)
 */
(function () {
  'use strict';

  const AUDIT_KEY = 'CICL_AUDIT_LOG';
  const REMINDER_KEY = 'CICL_REMINDER_DISMISSED';
  const MAX_AUDIT = 400;

  // ==================== AUDIT LOG ====================
  function getAuditLog() {
    try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch (_) { return []; }
  }
  function pushAudit(action, detail, meta) {
    try {
      const user = (typeof currentRole !== 'undefined' && currentRole === 'admin')
        ? (document.getElementById('logged-user-label')?.textContent || 'Admin')
        : (currentRole || 'guest');
      const entry = {
        id: 'A' + Date.now() + Math.random().toString(36).slice(2, 6),
        at: new Date().toISOString(),
        user: String(user || 'system'),
        action: String(action || ''),
        detail: String(detail || ''),
        meta: meta || null
      };
      const log = getAuditLog();
      log.unshift(entry);
      while (log.length > MAX_AUDIT) log.pop();
      localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
    } catch (e) { console.warn('audit', e); }
  }
  window.pushAudit = pushAudit;
  window.getAuditLog = getAuditLog;

  function wrapSaveHooks() {
    if (typeof saveAll === 'function' && !saveAll._plusWrapped) {
      const orig = saveAll;
      window.saveAll = function () {
        const r = orig.apply(this, arguments);
        try { renderPlusViews(); } catch (_) {}
        return r;
      };
      window.saveAll._plusWrapped = true;
    }
    if (typeof persistAdj === 'function' && !persistAdj._plusWrapped) {
      const orig = persistAdj;
      window.persistAdj = function (item) {
        const r = orig.apply(this, arguments);
        try {
          pushAudit('update_adjudikasi', (item && item.nama_anak) || item?.id, { id: item?.id, jalur: item?.adjudikasi?.jalur });
        } catch (_) {}
        return r;
      };
      window.persistAdj._plusWrapped = true;
    }
    if (typeof renderAllViews === 'function' && !renderAllViews._plusWrapped) {
      const orig = renderAllViews;
      window.renderAllViews = function () {
        const r = orig.apply(this, arguments);
        try { renderPlusViews(); } catch (e) { console.warn('renderPlus', e); }
        return r;
      };
      window.renderAllViews._plusWrapped = true;
    }
    if (typeof navigateTo === 'function' && !navigateTo._plusWrapped) {
      const orig = navigateTo;
      window.navigateTo = function (pageId) {
        const r = orig.apply(this, arguments);
        try {
          if (pageId === 'kalender') renderKalender();
          if (pageId === 'laporan') renderLaporanPage();
          if (pageId === 'audit') renderAuditTable();
          if (pageId === 'dashboard') {
            renderActionQueue();
            renderWorkloadPanel();
            renderBimbinganAlerts();
          }
        } catch (e) { console.warn('nav plus', e); }
        return r;
      };
      // Extend titles map via patching text after navigate
      const _nav = window.navigateTo;
      window.navigateTo = function (pageId) {
        const r = _nav.apply(this, arguments);
        const titles = {
          kalender: 'Kalender Sidang',
          laporan: 'Laporan Otomatis',
          audit: 'Audit Log'
        };
        if (titles[pageId]) {
          const titleEl = document.getElementById('nav-title');
          if (titleEl) titleEl.textContent = titles[pageId];
        }
        return r;
      };
      window.navigateTo._plusWrapped = true;
    }
  }

  // ==================== HELPERS ====================
  function daysBetween(a, b) {
    const ms = 86400000;
    const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.round((db - da) / ms);
  }
  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function parseMaybe(s) {
    if (typeof parseDay === 'function') return parseDay(s);
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  function fmtMaybe(s) {
    if (typeof fmtDate === 'function') return fmtDate(s);
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString('id-ID'); } catch (_) { return String(s); }
  }
  function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function dataList() {
    if (typeof getAllIncludingArsip === 'function') return getAllIncludingArsip() || [];
    return (typeof allData !== 'undefined' && Array.isArray(allData)) ? allData : [];
  }

  // ==================== 1. KALENDER SIDANG ====================
  let calCursor = new Date();
  calCursor.setDate(1);

  function collectSidangEvents() {
    const events = [];
    dataList().forEach(d => {
      const list = d.adjudikasi?.persidangan?.sidang || [];
      list.forEach(s => {
        const dt = (typeof extractEventDate === 'function') ? extractEventDate(s) : parseMaybe(s.tanggal);
        if (!dt) return;
        events.push({
          date: dt,
          ymd: dt.toISOString().slice(0, 10),
          item: d,
          sidang: s,
          nama: d.nama_anak,
          perkara: s.nomor_perkara || '',
          agenda: s.agenda || '',
          ke: s.ke,
          pk: d.nama_pk || '',
          reg: d.registrasi?.nomor || ''
        });
      });
      // putusan as event
      const put = d.adjudikasi?.persidangan?.putusan;
      if (put) {
        const dt = (typeof extractEventDate === 'function') ? extractEventDate(put) : parseMaybe(put.tanggal);
        if (dt) {
          events.push({
            date: dt,
            ymd: dt.toISOString().slice(0, 10),
            item: d,
            sidang: null,
            putusan: put,
            nama: d.nama_anak,
            perkara: put.nomor || '',
            agenda: 'Putusan: ' + (put.jenis_putusan || put.isi || ''),
            ke: 'P',
            pk: d.nama_pk || '',
            reg: d.registrasi?.nomor || '',
            isPutusan: true
          });
        }
      }
    });
    return events;
  }

  function renderKalender() {
    const grid = document.getElementById('cal-grid');
    const label = document.getElementById('cal-month-label');
    const listEl = document.getElementById('cal-day-list');
    if (!grid) return;

    const y = calCursor.getFullYear();
    const m = calCursor.getMonth();
    if (label) {
      label.textContent = calCursor.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }

    const events = collectSidangEvents();
    const byDay = {};
    events.forEach(ev => {
      if (ev.date.getFullYear() !== y || ev.date.getMonth() !== m) return;
      const day = ev.date.getDate();
      (byDay[day] = byDay[day] || []).push(ev);
    });

    const firstDow = new Date(y, m, 1).getDay(); // 0 Sun
    const startOffset = (firstDow + 6) % 7; // Monday-first
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const today = startOfDay(new Date());

    let html = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d =>
      `<div class="text-center text-[10px] font-bold uppercase text-slate-400 py-1">${d}</div>`
    ).join('');

    for (let i = 0; i < startOffset; i++) {
      html += `<div class="cal-cell cal-empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(y, m, day);
      const isToday = cellDate.getTime() === today.getTime();
      const evs = byDay[day] || [];
      const dots = evs.slice(0, 3).map(e =>
        `<span class="cal-dot ${e.isPutusan ? 'cal-dot-put' : 'cal-dot-sid'}" title="${escHtml(e.nama)}"></span>`
      ).join('');
      html += `<button type="button" class="cal-cell ${isToday ? 'cal-today' : ''} ${evs.length ? 'cal-has' : ''}"
        data-day="${day}" onclick="selectCalDay(${y},${m},${day})">
        <span class="cal-day-num">${day}</span>
        <span class="cal-dots">${dots}</span>
        ${evs.length > 3 ? `<span class="cal-more">+${evs.length - 3}</span>` : ''}
      </button>`;
    }
    grid.innerHTML = html;

    // Default: today or first event day
    const prefer = byDay[today.getDate()] && today.getMonth() === m && today.getFullYear() === y
      ? today.getDate()
      : (Object.keys(byDay).map(Number).sort((a, b) => a - b)[0] || today.getDate());
    selectCalDay(y, m, prefer);

    // Upcoming list
    renderUpcomingSidang();
    updateReminderBanner();
  }
  window.renderKalender = renderKalender;

  window.calPrevMonth = function () {
    calCursor.setMonth(calCursor.getMonth() - 1);
    renderKalender();
  };
  window.calNextMonth = function () {
    calCursor.setMonth(calCursor.getMonth() + 1);
    renderKalender();
  };
  window.calGoToday = function () {
    calCursor = new Date();
    calCursor.setDate(1);
    renderKalender();
  };

  window.selectCalDay = function (y, m, day) {
    const listEl = document.getElementById('cal-day-list');
    const head = document.getElementById('cal-day-head');
    if (!listEl) return;
    const dt = new Date(y, m, day);
    if (head) head.textContent = dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const events = collectSidangEvents().filter(ev =>
      ev.date.getFullYear() === y && ev.date.getMonth() === m && ev.date.getDate() === day
    );
    listEl.innerHTML = events.length ? events.map(ev => `
      <div class="cal-event-card ${ev.isPutusan ? 'is-putusan' : ''}">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-bold text-sm truncate">${escHtml(ev.nama)}</p>
            <p class="text-[11px] text-slate-400">${escHtml(ev.reg)} · ${escHtml(ev.pk)}</p>
            ${ev.perkara ? `<p class="text-xs font-mono text-[#2457FF] mt-0.5">${escHtml(ev.perkara)}</p>` : ''}
            <p class="text-xs mt-1">${ev.isPutusan ? '⚖️' : '📅'} ${escHtml(ev.agenda || (ev.isPutusan ? 'Putusan hakim' : 'Sidang ke-' + (ev.ke || '?')))}</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm shrink-0" onclick="openAdjudikasiModal('${ev.item.id}')">
            <i data-lucide="scale" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `).join('') : `<p class="text-sm text-slate-400 text-center py-8">Tidak ada sidang/putusan pada tanggal ini.</p>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    document.querySelectorAll('.cal-cell[data-day]').forEach(el => {
      el.classList.toggle('cal-selected', Number(el.getAttribute('data-day')) === day);
    });
  };

  function renderUpcomingSidang() {
    const el = document.getElementById('cal-upcoming');
    if (!el) return;
    const today = startOfDay(new Date());
    const upcoming = collectSidangEvents()
      .filter(ev => !ev.isPutusan && ev.date >= today)
      .sort((a, b) => a.date - b.date)
      .slice(0, 12);
    el.innerHTML = upcoming.length ? upcoming.map(ev => {
      const diff = daysBetween(today, startOfDay(ev.date));
      const badge = diff === 0 ? 'Hari ini' : diff === 1 ? 'Besok' : 'H-' + diff;
      const urgent = diff <= 3;
      return `<div class="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <div class="text-center w-12 shrink-0">
          <p class="text-lg font-extrabold leading-none">${ev.date.getDate()}</p>
          <p class="text-[10px] uppercase text-slate-400">${ev.date.toLocaleDateString('id-ID', { month: 'short' })}</p>
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-sm truncate">${escHtml(ev.nama)}</p>
          <p class="text-[11px] text-slate-400 truncate">${escHtml(ev.perkara || ev.agenda || 'Sidang')}</p>
        </div>
        <span class="badge ${urgent ? 'badge-amber' : 'badge-slate'} shrink-0">${badge}</span>
        <button type="button" class="btn btn-ghost btn-sm" onclick="openAdjudikasiModal('${ev.item.id}')"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
      </div>`;
    }).join('') : `<p class="text-sm text-slate-400 py-4 text-center">Tidak ada sidang mendatang.</p>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function updateReminderBanner() {
    const banner = document.getElementById('sidang-reminder-banner');
    if (!banner) return;
    const today = startOfDay(new Date());
    const soon = collectSidangEvents().filter(ev => {
      if (ev.isPutusan) return false;
      const diff = daysBetween(today, startOfDay(ev.date));
      return diff >= 0 && diff <= 3;
    });
    const dismissed = sessionStorage.getItem(REMINDER_KEY) === '1';
    if (!soon.length || dismissed) {
      banner.classList.add('hidden');
      return;
    }
    banner.classList.remove('hidden');
    const names = [...new Set(soon.map(e => e.nama))].slice(0, 4).join(', ');
    const more = soon.length > 4 ? ` (+${soon.length - 4})` : '';
    const text = document.getElementById('sidang-reminder-text');
    if (text) text.textContent = `${soon.length} sidang dalam 3 hari ke depan: ${names}${more}`;
  }
  window.dismissSidangReminder = function () {
    sessionStorage.setItem(REMINDER_KEY, '1');
    document.getElementById('sidang-reminder-banner')?.classList.add('hidden');
  };

  // Browser notification permission + daily check
  function checkSidangNotifications() {
    if (!('Notification' in window)) return;
    const today = startOfDay(new Date());
    const key = 'CICL_NOTIF_' + today.toISOString().slice(0, 10);
    if (localStorage.getItem(key)) return;
    const soon = collectSidangEvents().filter(ev => {
      if (ev.isPutusan) return false;
      const diff = daysBetween(today, startOfDay(ev.date));
      return diff >= 0 && diff <= 1;
    });
    if (!soon.length) return;
    if (Notification.permission === 'granted') {
      new Notification('DIGIT-CICL — Pengingat Sidang', {
        body: `${soon.length} sidang hari ini / besok. Buka Kalender Sidang.`,
        icon: 'icons/icon-192.png'
      });
      localStorage.setItem(key, '1');
    }
  }
  window.enableSidangNotifications = function () {
    if (!('Notification' in window)) {
      if (typeof showToast === 'function') showToast('Browser tidak mendukung notifikasi', 'error');
      return;
    }
    Notification.requestPermission().then(p => {
      if (typeof showToast === 'function') {
        showToast(p === 'granted' ? 'Notifikasi sidang diaktifkan' : 'Notifikasi ditolak', p === 'granted' ? 'success' : 'info');
      }
      if (p === 'granted') checkSidangNotifications();
    });
  };

  // ==================== 2. ACTION QUEUE (Dashboard) ====================
  function buildActionQueue() {
    const items = [];
    const today = startOfDay(new Date());
    const data = dataList();

    data.forEach(d => {
      // Belum registrasi > 7 hari
      if (!d.registrasi) {
        const tgl = parseMaybe(d.tanggal_diterima) || parseMaybe(d.tanggal_surat);
        if (tgl) {
          const age = daysBetween(startOfDay(tgl), today);
          if (age >= 3) {
            items.push({
              priority: age >= 14 ? 1 : 2,
              type: 'registrasi',
              icon: 'hash',
              title: 'Belum registrasi',
              desc: `${d.nama_anak} · ${age} hari sejak diterima`,
              id: d.id,
              action: () => { if (typeof navigateTo === 'function') navigateTo('registrasi'); }
            });
          }
        }
      }

      // Sidang 7 hari ke depan
      (d.adjudikasi?.persidangan?.sidang || []).forEach(s => {
        const dt = (typeof extractEventDate === 'function') ? extractEventDate(s) : parseMaybe(s.tanggal);
        if (!dt) return;
        const diff = daysBetween(today, startOfDay(dt));
        if (diff >= 0 && diff <= 7) {
          items.push({
            priority: diff <= 1 ? 1 : 2,
            type: 'sidang',
            icon: 'landmark',
            title: diff === 0 ? 'Sidang hari ini' : (diff === 1 ? 'Sidang besok' : `Sidang H-${diff}`),
            desc: `${d.nama_anak} · ${s.nomor_perkara || s.agenda || 'Persidangan'}`,
            id: d.id,
            action: 'adj'
          });
        }
      });

      // Belum jalur adjudikasi tapi sudah registrasi
      if (d.registrasi && !d.adjudikasi?.jalur && !/integrasi/i.test(String(d.jenis_litmas || ''))) {
        items.push({
          priority: 3,
          type: 'jalur',
          icon: 'git-branch',
          title: 'Belum tentukan jalur',
          desc: `${d.nama_anak} · ${d.registrasi.nomor || ''}`,
          id: d.id,
          action: 'adj'
        });
      }

      // Bimbingan hampir habis
      const p = d.pasca_adjudikasi;
      if (p && p.status === 'Dalam Bimbingan' && p.tanggal_selesai) {
        const end = parseMaybe(p.tanggal_selesai);
        if (end) {
          const left = daysBetween(today, startOfDay(end));
          if (left >= 0 && left <= 30) {
            items.push({
              priority: left <= 7 ? 1 : 2,
              type: 'bimbingan',
              icon: 'heart-handshake',
              title: left === 0 ? 'Bimbingan berakhir hari ini' : `Bimbingan sisa ${left} hari`,
              desc: `${d.nama_anak} · ${p.jenis || 'PB/CB'}`,
              id: d.id,
              action: 'pasca'
            });
          } else if (left < 0 && p.status === 'Dalam Bimbingan') {
            items.push({
              priority: 1,
              type: 'bimbingan',
              icon: 'alert-triangle',
              title: 'Masa bimbingan lewat',
              desc: `${d.nama_anak} · lewat ${Math.abs(left)} hari`,
              id: d.id,
              action: 'pasca'
            });
          }
        }
      }
    });

    items.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
    return items;
  }

  function renderActionQueue() {
    const el = document.getElementById('action-queue-list');
    const countEl = document.getElementById('action-queue-count');
    if (!el) return;
    const items = buildActionQueue();
    if (countEl) countEl.textContent = items.length ? items.length + ' item' : 'Semua clear';
    el.innerHTML = items.length ? items.slice(0, 15).map(it => `
      <button type="button" class="action-queue-item priority-${it.priority}" onclick="handleActionQueue('${it.action}','${it.id}')">
        <span class="aq-icon"><i data-lucide="${it.icon}" class="w-4 h-4"></i></span>
        <span class="min-w-0 text-left flex-1">
          <span class="block font-semibold text-sm">${escHtml(it.title)}</span>
          <span class="block text-[11px] text-slate-400 truncate">${escHtml(it.desc)}</span>
        </span>
        <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 shrink-0"></i>
      </button>
    `).join('') : `<div class="text-center py-8 text-slate-400">
      <i data-lucide="check-circle-2" class="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-70"></i>
      <p class="font-semibold text-sm">Tidak ada tindakan mendesak</p>
    </div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.handleActionQueue = function (action, id) {
    if (action === 'adj' && typeof openAdjudikasiModal === 'function') openAdjudikasiModal(id);
    else if (action === 'pasca' && typeof openPascaModal === 'function') openPascaModal(id);
    else if (typeof navigateTo === 'function') navigateTo(action === 'registrasi' ? 'registrasi' : 'adjudikasi');
  };

  // ==================== 3. BEBAN KERJA PK ====================
  function computeWorkload() {
    const map = {};
    (typeof PK_LIST !== 'undefined' ? PK_LIST : []).forEach(name => {
      map[name] = { name, total: 0, aktif: 0, belumReg: 0, adj: 0, bimbingan: 0, selesai: 0 };
    });
    dataList().forEach(d => {
      const pk = d.nama_pk || d.pasca_adjudikasi?.pk_pembimbing || '';
      if (!pk) return;
      if (!map[pk]) map[pk] = { name: pk, total: 0, aktif: 0, belumReg: 0, adj: 0, bimbingan: 0, selesai: 0 };
      map[pk].total++;
      if (!d.registrasi) map[pk].belumReg++;
      const st = String(d.status_jenis || '').toLowerCase();
      if (st === 'selesai') map[pk].selesai++;
      else map[pk].aktif++;
      if (d.registrasi && d.adjudikasi?.jalur && typeof getAdjStatus === 'function' && getAdjStatus(d) === 'Berjalan') map[pk].adj++;
      if (d.pasca_adjudikasi?.status === 'Dalam Bimbingan') map[pk].bimbingan++;
    });
    return Object.values(map).sort((a, b) => b.aktif - a.aktif || b.total - a.total);
  }

  function renderWorkloadPanel() {
    const el = document.getElementById('workload-list');
    if (!el) return;
    const rows = computeWorkload();
    const maxAktif = Math.max(1, ...rows.map(r => r.aktif));
    el.innerHTML = rows.length ? rows.map(r => {
      const pct = Math.round(r.aktif / maxAktif * 100);
      const overload = r.aktif >= 8;
      return `<div class="workload-row ${overload ? 'overload' : ''}">
        <div class="flex items-center justify-between gap-2 mb-1">
          <span class="font-semibold text-sm truncate">${escHtml(r.name)}</span>
          <span class="text-xs font-bold ${overload ? 'text-red-500' : 'text-slate-500'}">${r.aktif} aktif</span>
        </div>
        <div class="workload-bar"><div class="workload-fill" style="width:${pct}%"></div></div>
        <div class="flex flex-wrap gap-2 mt-1 text-[10px] text-slate-400">
          <span>Total ${r.total}</span>
          <span>· Belum reg ${r.belumReg}</span>
          <span>· Adj ${r.adj}</span>
          <span>· Bimbingan ${r.bimbingan}</span>
        </div>
      </div>`;
    }).join('') : `<p class="text-sm text-slate-400 text-center py-4">Belum ada data PK</p>`;
  }

  // ==================== 4. TIMELINE PER ANAK ====================
  window.openChildTimeline = function (id) {
    const d = dataList().find(x => String(x.id) === String(id));
    if (!d) {
      if (typeof showToast === 'function') showToast('Data tidak ditemukan', 'error');
      return;
    }
    const events = [];
    const add = (date, title, detail, color) => {
      const dt = parseMaybe(date);
      events.push({ dt: dt || new Date(0), dateStr: date, title, detail, color });
    };
    if (d.tanggal_surat) add(d.tanggal_surat, 'Surat permohonan', d.nomor_surat || '', 'slate');
    if (d.tanggal_diterima) add(d.tanggal_diterima, 'Diterima Bapas', d.jenis_litmas || '', 'blue');
    if (d.registrasi?.tanggal || d.tanggal_registrasi) {
      add(d.registrasi?.tanggal || d.tanggal_registrasi, 'Registrasi anak', d.registrasi?.nomor || d.nomor_registrasi || '', 'indigo');
    }
    if (d.adjudikasi?.jalur) add(d.registrasi?.tanggal || d.tanggal_diterima, 'Jalur: ' + d.adjudikasi.jalur, '', 'violet');
    if (d.adjudikasi?.jalur === 'Diversi') {
      const dv = d.adjudikasi.diversi || {};
      ['kepolisian', 'kejaksaan', 'pengadilan'].forEach(tier => {
        const t = dv[tier];
        if (t && (t.tanggal || t.hasil)) {
          add(t.tanggal || d.tanggal_diterima, 'Diversi ' + tier, (t.hasil || '') + (t.nomor ? ' · ' + t.nomor : ''), t.hasil === 'Berhasil' ? 'green' : 'amber');
        }
      });
    }
    (d.adjudikasi?.persidangan?.sidang || []).forEach(s => {
      add(s.tanggal, 'Sidang ke-' + (s.ke || '?'), [s.nomor_perkara, s.agenda].filter(Boolean).join(' · '), 'blue');
    });
    const put = d.adjudikasi?.persidangan?.putusan;
    if (put?.tanggal) add(put.tanggal, 'Putusan hakim', [put.nomor, put.jenis_putusan, put.isi].filter(Boolean).join(' · '), 'pink');
    const p = d.pasca_adjudikasi;
    if (p?.tanggal_mulai) add(p.tanggal_mulai, 'Mulai bimbingan ' + (p.jenis || ''), p.asal_lpka || '', 'emerald');
    if (p?.tanggal_selesai) add(p.tanggal_selesai, 'Rencana selesai bimbingan', p.status || '', 'emerald');

    events.sort((a, b) => a.dt - b.dt);

    const body = events.length ? events.map(ev => `
      <div class="tl-item tl-${ev.color}">
        <div class="tl-dot"></div>
        <div class="tl-body">
          <p class="text-[11px] font-semibold text-slate-400">${fmtMaybe(ev.dateStr)}</p>
          <p class="font-bold text-sm">${escHtml(ev.title)}</p>
          ${ev.detail ? `<p class="text-xs text-slate-500 mt-0.5">${escHtml(ev.detail)}</p>` : ''}
        </div>
      </div>
    `).join('') : `<p class="text-slate-400 text-sm py-6 text-center">Belum ada jejak timeline.</p>`;

    if (typeof openModal === 'function') {
      openModal(`
        <div class="flex justify-between items-start mb-4 gap-3">
          <div>
            <h3 class="font-bold text-lg">Timeline Anak</h3>
            <p class="text-sm text-slate-500">${escHtml(d.nama_anak)} · ${escHtml(d.registrasi?.nomor || d.nomor_surat || '')}</p>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-ghost btn-sm" onclick="exportTimelinePdf('${d.id}')"><i data-lucide="download" class="w-3.5 h-3.5"></i> PDF</button>
            <button type="button" onclick="closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
        </div>
        <div class="tl-track" id="tl-track-${d.id}">${body}</div>
        <div class="flex justify-end gap-2 pt-3">
          <button class="btn btn-primary btn-sm" onclick="closeModal(); openAdjudikasiModal('${d.id}')">Buka Tracking</button>
          <button class="btn btn-ghost" onclick="closeModal()">Tutup</button>
        </div>
      `);
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  };

  window.exportTimelinePdf = function (id) {
    const d = dataList().find(x => String(x.id) === String(id));
    if (!d) return;
    const w = window.open('', '_blank');
    if (!w) {
      if (typeof showToast === 'function') showToast('Izinkan popup untuk export', 'error');
      return;
    }
    // Rebuild simple timeline text
    const lines = [];
    lines.push('TIMELINE ANAK — DIGIT-CICL Bapas II Lahat');
    lines.push(d.nama_anak + ' | ' + (d.registrasi?.nomor || '') + ' | ' + (d.wilayah_asal || ''));
    lines.push('PK: ' + (d.nama_pk || '-') + ' | ' + (d.jenis_litmas || ''));
    lines.push(''.padEnd(60, '-'));
    if (d.tanggal_surat) lines.push(fmtMaybe(d.tanggal_surat) + '  Surat: ' + (d.nomor_surat || ''));
    if (d.tanggal_diterima) lines.push(fmtMaybe(d.tanggal_diterima) + '  Diterima Bapas');
    if (d.registrasi) lines.push(fmtMaybe(d.registrasi.tanggal) + '  Registrasi: ' + d.registrasi.nomor);
    if (d.adjudikasi?.jalur) lines.push('          Jalur: ' + d.adjudikasi.jalur);
    (d.adjudikasi?.persidangan?.sidang || []).forEach(s => {
      lines.push(fmtMaybe(s.tanggal) + '  Sidang ke-' + (s.ke || '') + ' ' + (s.nomor_perkara || '') + ' ' + (s.agenda || ''));
    });
    const put = d.adjudikasi?.persidangan?.putusan;
    if (put?.tanggal) lines.push(fmtMaybe(put.tanggal) + '  Putusan: ' + (put.nomor || '') + ' ' + (put.jenis_putusan || ''));
    if (d.pasca_adjudikasi?.tanggal_mulai) lines.push(fmtMaybe(d.pasca_adjudikasi.tanggal_mulai) + '  Bimbingan: ' + (d.pasca_adjudikasi.jenis || ''));
    lines.push(''.padEnd(60, '-'));
    lines.push('Dicetak: ' + new Date().toLocaleString('id-ID'));
    w.document.write(`<!doctype html><html><head><title>Timeline ${escHtml(d.nama_anak)}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a} pre{white-space:pre-wrap;font-size:13px;line-height:1.5}</style>
      </head><body><pre>${escHtml(lines.join('\n'))}</pre>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
    pushAudit('export_timeline', d.nama_anak, { id: d.id });
  };

  // ==================== 5. LAPORAN OTOMATIS ====================
  function reportPeriodRange(mode) {
    const now = new Date();
    let from, to, label;
    if (mode === 'bulan') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      label = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } else if (mode === 'lalu') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      label = from.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } else if (mode === 'triwulan') {
      const q = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), q * 3, 1);
      to = new Date(now.getFullYear(), q * 3 + 3, 0);
      label = 'Triwulan ' + (q + 1) + ' ' + now.getFullYear();
    } else {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
      label = 'Tahun ' + now.getFullYear();
    }
    return { from, to, label };
  }

  function inRange(dt, from, to) {
    if (!dt) return false;
    const t = startOfDay(dt).getTime();
    return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime();
  }

  function buildReport(mode) {
    const { from, to, label } = reportPeriodRange(mode);
    const data = dataList();
    const received = data.filter(d => inRange(parseMaybe(d.tanggal_diterima) || parseMaybe(d.tanggal_surat), from, to));
    const reg = data.filter(d => inRange(parseMaybe(d.registrasi?.tanggal || d.tanggal_registrasi), from, to));
    let sidang = 0, putusan = 0, diversiOk = 0;
    data.forEach(d => {
      (d.adjudikasi?.persidangan?.sidang || []).forEach(s => {
        const dt = (typeof extractEventDate === 'function') ? extractEventDate(s) : parseMaybe(s.tanggal);
        if (inRange(dt, from, to)) sidang++;
      });
      const put = d.adjudikasi?.persidangan?.putusan;
      if (put && inRange((typeof extractEventDate === 'function') ? extractEventDate(put) : parseMaybe(put.tanggal), from, to)) putusan++;
      const dv = d.adjudikasi?.diversi;
      if (dv) {
        ['kepolisian', 'kejaksaan', 'pengadilan'].forEach(t => {
          if (dv[t] && (typeof isHasilBerhasil === 'function' ? isHasilBerhasil(dv[t].hasil) : /berhasil/i.test(dv[t].hasil || ''))) {
            if (inRange(parseMaybe(dv[t].tanggal), from, to)) diversiOk++;
          }
        });
      }
    });
    const bimbingan = data.filter(d => d.pasca_adjudikasi?.status === 'Dalam Bimbingan');
    const byWil = {};
    received.forEach(d => { const w = d.wilayah_asal || 'Lainnya'; byWil[w] = (byWil[w] || 0) + 1; });
    const byPk = {};
    received.forEach(d => { const p = d.nama_pk || '—'; byPk[p] = (byPk[p] || 0) + 1; });
    return { label, from, to, received: received.length, reg: reg.length, sidang, putusan, diversiOk, bimbingan: bimbingan.length, byWil, byPk, list: received };
  }

  function renderLaporanPage() {
    const mode = document.getElementById('laporan-mode')?.value || 'bulan';
    const rep = buildReport(mode);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('lap-label', rep.label);
    set('lap-received', rep.received);
    set('lap-reg', rep.reg);
    set('lap-sidang', rep.sidang);
    set('lap-putusan', rep.putusan);
    set('lap-diversi', rep.diversiOk);
    set('lap-bimbingan', rep.bimbingan);

    const wilEl = document.getElementById('lap-wilayah');
    if (wilEl) {
      const rows = Object.entries(rep.byWil).sort((a, b) => b[1] - a[1]);
      wilEl.innerHTML = rows.map(([k, v]) => `<div class="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800"><span>${escHtml(k)}</span><b>${v}</b></div>`).join('') || '<p class="text-slate-400 text-sm">—</p>';
    }
    const pkEl = document.getElementById('lap-pk');
    if (pkEl) {
      const rows = Object.entries(rep.byPk).sort((a, b) => b[1] - a[1]);
      pkEl.innerHTML = rows.map(([k, v]) => `<div class="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800"><span>${escHtml(k)}</span><b>${v}</b></div>`).join('') || '<p class="text-slate-400 text-sm">—</p>';
    }
  }
  window.renderLaporanPage = renderLaporanPage;
  window.onLaporanModeChange = renderLaporanPage;

  window.exportLaporan = function (format) {
    const mode = document.getElementById('laporan-mode')?.value || 'bulan';
    const rep = buildReport(mode);
    pushAudit('export_laporan', rep.label + ' ' + format, { mode });

    if (format === 'csv') {
      const headers = ['nomor_surat', 'nama_anak', 'jenis_kelamin', 'jenis_litmas', 'wilayah_asal', 'nama_pk', 'status_jenis', 'nomor_registrasi'];
      const lines = [headers.join(',')];
      rep.list.forEach(d => {
        lines.push(headers.map(h => {
          let v = h === 'nomor_registrasi' ? (d.registrasi?.nomor || '') : (d[h] || '');
          v = String(v).replace(/"/g, '""');
          return `"${v}"`;
        }).join(','));
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'laporan-digit-cicl-' + mode + '.csv';
      a.click();
      if (typeof showToast === 'function') showToast('CSV laporan diunduh', 'success');
      return;
    }

    // PDF via print window
    const w = window.open('', '_blank');
    if (!w) return;
    const wilRows = Object.entries(rep.byWil).map(([k, v]) => `<tr><td>${escHtml(k)}</td><td>${v}</td></tr>`).join('');
    const pkRows = Object.entries(rep.byPk).map(([k, v]) => `<tr><td>${escHtml(k)}</td><td>${v}</td></tr>`).join('');
    w.document.write(`<!doctype html><html><head><title>Laporan ${escHtml(rep.label)}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:32px;color:#0f172a}
        h1{font-size:18px;margin:0 0 4px} h2{font-size:14px;margin:20px 0 8px}
        .meta{color:#64748b;font-size:12px;margin-bottom:20px}
        .kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}
        .kpi div{border:1px solid #e2e8f0;border-radius:8px;padding:12px}
        .kpi b{font-size:22px;display:block}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
        th{background:#f8fafc}
      </style></head><body>
      <h1>Laporan Operasional DIGIT-CICL</h1>
      <p class="meta">Bapas Kelas II Lahat · Periode: <b>${escHtml(rep.label)}</b> · Dicetak ${new Date().toLocaleString('id-ID')}</p>
      <div class="kpi">
        <div><span>Permintaan masuk</span><b>${rep.received}</b></div>
        <div><span>Registrasi</span><b>${rep.reg}</b></div>
        <div><span>Sidang</span><b>${rep.sidang}</b></div>
        <div><span>Putusan</span><b>${rep.putusan}</b></div>
        <div><span>Diversi berhasil</span><b>${rep.diversiOk}</b></div>
        <div><span>Bimbingan aktif</span><b>${rep.bimbingan}</b></div>
      </div>
      <h2>Per Wilayah</h2><table><thead><tr><th>Wilayah</th><th>Jumlah</th></tr></thead><tbody>${wilRows}</tbody></table>
      <h2>Per PK</h2><table><thead><tr><th>PK</th><th>Jumlah</th></tr></thead><tbody>${pkRows}</tbody></table>
      <script>onload=function(){print()}<\/script>
      </body></html>`);
    w.document.close();
  };

  // ==================== 6. COMMAND PALETTE Ctrl+K ====================
  function searchGlobal(q) {
    q = String(q || '').toLowerCase().trim();
    if (!q || q.length < 1) return [];
    const results = [];
    dataList().forEach(d => {
      const nomorPerkaras = ((d.adjudikasi?.persidangan?.sidang) || []).map(s => s.nomor_perkara || '').join(' ');
      const putNomor = d.adjudikasi?.persidangan?.putusan?.nomor || '';
      const hay = [d.nama_anak, d.nomor_surat, d.registrasi?.nomor, d.nama_pk, d.wilayah_asal, d.jenis_perkara, nomorPerkaras, putNomor, d.kepolisian]
        .map(x => String(x || '').toLowerCase()).join(' ');
      if (!hay.includes(q)) return;
      results.push({
        id: d.id,
        title: d.nama_anak || '(tanpa nama)',
        sub: [d.registrasi?.nomor || d.nomor_surat, d.wilayah_asal, d.nama_pk].filter(Boolean).join(' · '),
        type: d.adjudikasi?.jalur || d.jenis_litmas || 'Litmas'
      });
    });
    return results.slice(0, 20);
  }

  window.openCommandPalette = function () {
    const overlay = document.getElementById('cmd-palette');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    const input = document.getElementById('cmd-input');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 30);
    }
    renderCmdResults([]);
  };
  window.closeCommandPalette = function () {
    document.getElementById('cmd-palette')?.classList.add('hidden');
  };
  window.onCmdInput = function () {
    const q = document.getElementById('cmd-input')?.value || '';
    renderCmdResults(searchGlobal(q));
  };
  function renderCmdResults(list) {
    const el = document.getElementById('cmd-results');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = `<p class="text-sm text-slate-400 text-center py-6">Ketik nama, no registrasi, nomor perkara, atau no surat…</p>`;
      return;
    }
    el.innerHTML = list.map((r, i) => `
      <div class="cmd-item" data-idx="${i}">
        <span class="cmd-type">${escHtml(r.type)}</span>
        <button type="button" class="min-w-0 flex-1 text-left" onclick="selectCmdResult('${r.id}')">
          <span class="block font-semibold text-sm truncate">${escHtml(r.title)}</span>
          <span class="block text-[11px] text-slate-400 truncate">${escHtml(r.sub)}</span>
        </button>
        <button type="button" class="btn btn-ghost btn-sm shrink-0" title="Timeline" onclick="selectCmdResult('${r.id}')"><i data-lucide="git-commit-horizontal" class="w-3.5 h-3.5"></i></button>
        <button type="button" class="btn btn-primary btn-sm shrink-0" title="Tracking" onclick="selectCmdTracking('${r.id}')"><i data-lucide="scale" class="w-3.5 h-3.5"></i></button>
      </div>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  window.selectCmdResult = function (id) {
    closeCommandPalette();
    openChildTimeline(id);
  };
  window.selectCmdTracking = function (id) {
    closeCommandPalette();
    if (typeof openAdjudikasiModal === 'function') openAdjudikasiModal(id);
  };

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
    if (e.key === 'Escape') closeCommandPalette();
  });

  // ==================== 7. AUDIT LOG UI ====================
  function renderAuditTable() {
    const tbody = document.getElementById('tb-audit');
    if (!tbody) return;
    const q = (document.getElementById('q-audit')?.value || '').toLowerCase().trim();
    let log = getAuditLog();
    if (q) log = log.filter(e => [e.action, e.detail, e.user].join(' ').toLowerCase().includes(q));
    tbody.innerHTML = log.length ? log.slice(0, 100).map(e => `
      <tr>
        <td class="text-xs whitespace-nowrap">${new Date(e.at).toLocaleString('id-ID')}</td>
        <td class="text-xs font-semibold">${escHtml(e.user)}</td>
        <td><span class="badge badge-slate">${escHtml(e.action)}</span></td>
        <td class="text-sm">${escHtml(e.detail)}</td>
      </tr>
    `).join('') : `<tr><td colspan="4" class="text-center py-10 text-slate-400">Belum ada aktivitas tercatat.</td></tr>`;
  }
  window.renderAuditTable = renderAuditTable;
  window.clearAuditLog = function () {
    if (!confirm('Hapus seluruh audit log lokal?')) return;
    localStorage.removeItem(AUDIT_KEY);
    renderAuditTable();
    if (typeof showToast === 'function') showToast('Audit log dikosongkan', 'success');
  };

  // ==================== 8. MONITORING BIMBINGAN ====================
  function renderBimbinganAlerts() {
    const el = document.getElementById('bimbingan-alert-list');
    if (!el) return;
    const today = startOfDay(new Date());
    const rows = [];
    dataList().forEach(d => {
      const p = d.pasca_adjudikasi;
      if (!p || p.status !== 'Dalam Bimbingan') return;
      const end = parseMaybe(p.tanggal_selesai);
      if (!end) {
        rows.push({ d, left: null, label: 'Tanpa tgl selesai', urgent: false });
        return;
      }
      const left = daysBetween(today, startOfDay(end));
      rows.push({ d, left, p, urgent: left <= 14 });
    });
    rows.sort((a, b) => {
      if (a.left == null) return 1;
      if (b.left == null) return -1;
      return a.left - b.left;
    });
    el.innerHTML = rows.length ? rows.slice(0, 10).map(r => {
      let badge = '—';
      let cls = 'badge-slate';
      if (r.left != null) {
        if (r.left < 0) { badge = 'Lewat ' + Math.abs(r.left) + ' hari'; cls = 'badge-pink'; }
        else if (r.left <= 7) { badge = 'Sisa ' + r.left + ' hari'; cls = 'badge-amber'; }
        else { badge = 'Sisa ' + r.left + ' hari'; cls = 'badge-green'; }
      } else { badge = r.label; }
      return `<div class="flex items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
        <div class="min-w-0 flex-1">
          <p class="font-semibold text-sm truncate">${escHtml(r.d.nama_anak)}</p>
          <p class="text-[11px] text-slate-400">${escHtml(r.d.pasca_adjudikasi?.jenis || 'PB/CB')} · ${escHtml(r.d.pasca_adjudikasi?.pk_pembimbing || r.d.nama_pk || '')}</p>
        </div>
        <span class="badge ${cls}">${badge}</span>
      </div>`;
    }).join('') : `<p class="text-sm text-slate-400 text-center py-4">Tidak ada klien bimbingan aktif.</p>`;
  }

  // ==================== HOOK TIMELINE BUTTON ON TRACKING ====================
  // Expose for inline use in tables if needed
  window.openTimelineFromRow = function (id, ev) {
    if (ev) ev.stopPropagation();
    openChildTimeline(id);
  };

  // ==================== RENDER ALL PLUS ====================
  function renderPlusViews() {
    try { renderActionQueue(); } catch (_) {}
    try { renderWorkloadPanel(); } catch (_) {}
    try { renderBimbinganAlerts(); } catch (_) {}
    try { updateReminderBanner(); } catch (_) {}
    const active = document.querySelector('.page.active');
    if (active?.id === 'page-kalender') renderKalender();
    if (active?.id === 'page-laporan') renderLaporanPage();
    if (active?.id === 'page-audit') renderAuditTable();
  }
  window.renderPlusViews = renderPlusViews;

  // ==================== INIT ====================
  function init() {
    wrapSaveHooks();
    renderPlusViews();
    checkSidangNotifications();
    // Header search button
    document.getElementById('btn-cmd-palette')?.addEventListener('click', openCommandPalette);
    pushAudit('session_start', 'Aplikasi dibuka');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 200));
  } else {
    setTimeout(init, 200);
  }
})();
