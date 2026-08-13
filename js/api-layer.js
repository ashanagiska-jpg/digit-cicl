/**
 * ==========================================================================
 * api-layer.js — DIGIT-CICL Frontend API Layer (Optimized)
 * ==========================================================================
 * GANTI / TEMPATKAN fungsi sinkronisasi lama di app.js dengan modul ini.
 *
 * Cara pakai:
 * 1. Pastikan gsheetUrl sudah di-set (localStorage CICL_GAS_URL).
 * 2. Panggil loadDashboardFast() saat buka dashboard.
 * 3. Panggil fetchLitmasPage({ page, limit, search, filters }) untuk tabel.
 * 4. syncMastersOnly() untuk PK/Wilayah/Kepolisian (cached di backend).
 * 5. syncDataFromSheets(true) tetap ada sebagai full-sync fallback.
 * ==========================================================================
 */

(function (global) {
  'use strict';

  var _syncInFlight = false;
  var _listInFlight = null;
  var _dashboardInFlight = null;
  var _searchDebounceTimer = null;

  function normalizeGasUrl(url) {
    if (!url) return '';
    url = String(url).trim();
    return url.replace(/\/dev$/, '/exec');
  }

  function getGasUrl() {
    return normalizeGasUrl(
      (typeof gsheetUrl !== 'undefined' && gsheetUrl) ||
      localStorage.getItem('CICL_GAS_URL') ||
      ''
    );
  }

  async function fetchWithTimeout(url, opts, ms) {
    ms = ms || 45000;
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, ms);
    try {
      return await fetch(url, Object.assign({}, opts || {}, { signal: ctrl.signal }));
    } finally {
      clearTimeout(t);
    }
  }

  async function gasGet(resource, extraParams) {
    var url = getGasUrl();
    if (!url) throw new Error('URL Google Apps Script belum diisi di Pengaturan.');
    var sep = url.indexOf('?') >= 0 ? '&' : '?';
    var q = 'resource=' + encodeURIComponent(resource || '');
    if (extraParams) {
      Object.keys(extraParams).forEach(function (k) {
        if (extraParams[k] !== undefined && extraParams[k] !== null && extraParams[k] !== '') {
          q += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(String(extraParams[k]));
        }
      });
    }
    var res = await fetchWithTimeout(url + sep + q, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store'
    }, 45000);
    var raw = await res.text();
    var data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error('Respons bukan JSON: ' + raw.slice(0, 120));
    }
    if (data && (data.status === 'error' || data.success === false)) {
      throw new Error(data.message || 'Server error');
    }
    return data;
  }

  async function gasPost(action, payload) {
    var url = getGasUrl();
    if (!url) throw new Error('URL Google Apps Script belum diisi di Pengaturan.');
    var body = Object.assign({ action: action }, payload || {});
    var res = await fetchWithTimeout(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }, 60000);
    var raw = await res.text();
    var json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      throw new Error('Respons bukan JSON: ' + raw.slice(0, 120));
    }
    if (json && (json.status === 'error' || json.success === false)) {
      throw new Error(json.message || 'Server error');
    }
    return json;
  }

  function setSheetStatus(state, label) {
    var dot = document.getElementById('sheet-status-dot');
    var text = document.getElementById('sheet-status-text');
    if (dot) {
      dot.classList.remove('bg-emerald-500', 'bg-red-500', 'bg-amber-500');
      if (state === 'ok') dot.classList.add('bg-emerald-500');
      else if (state === 'err') dot.classList.add('bg-red-500');
      else dot.classList.add('bg-amber-500');
    }
    if (text && label) text.textContent = label;
  }

  /**
   * Dashboard cepat: stats + recent saja (bukan full table).
   */
  async function loadDashboardFast(opts) {
    opts = opts || {};
    if (_dashboardInFlight) return _dashboardInFlight;

    _dashboardInFlight = (async function () {
      setSheetStatus('load', 'Memuat statistik…');
      try {
        var data = await gasGet('dashboard', {
          from: opts.from || '',
          to: opts.to || ''
        });
        setSheetStatus('ok', 'Dashboard siap' + (data._meta && data._meta.ms ? ' (' + data._meta.ms + ' ms)' : ''));

        // Apply stats ke KPI cards jika elemen ada
        var s = data.stats || {};
        var map = {
          'k-total': s.total,
          'k-belumreg': s.belum_registrasi,
          'k-reg': s.sudah_registrasi,
          'k-adj': s.dalam_adjudikasi
        };
        Object.keys(map).forEach(function (id) {
          var el = document.getElementById(id);
          if (el && map[id] !== undefined) el.textContent = map[id];
        });

        var updated = document.getElementById('dash-updated');
        if (updated) {
          updated.textContent = 'Diperbarui ' + new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        }

        return data;
      } catch (e) {
        setSheetStatus('err', 'Gagal muat dashboard');
        throw e;
      } finally {
        _dashboardInFlight = null;
      }
    })();

    return _dashboardInFlight;
  }

  /**
   * List litmas dengan pagination + search + filter di server.
   * Response: { data, page, limit, total, totalPages }
   */
  async function fetchLitmasPage(opts) {
    opts = opts || {};
    var page = opts.page || 1;
    var limit = opts.limit || (typeof pageSize !== 'undefined' ? pageSize : 20);
    var search = opts.search || '';
    var filters = opts.filters || {};

    // Batalkan request list sebelumnya (dedupe)
    var key = JSON.stringify({ page: page, limit: limit, search: search, filters: filters });
    if (_listInFlight && _listInFlight.key === key) {
      return _listInFlight.promise;
    }

    var promise = gasPost('list_litmas', {
      page: page,
      limit: limit,
      search: search,
      filters: filters,
      jenis_litmas: filters.jenis_litmas || opts.jenis_litmas || '',
      wilayah: filters.wilayah || opts.wilayah || '',
      nama_pk: filters.nama_pk || opts.nama_pk || '',
      status: filters.status || opts.status || '',
      from: filters.from || opts.from || '',
      to: filters.to || opts.to || '',
      registrasi: filters.registrasi || opts.registrasi || ''
    });

    _listInFlight = { key: key, promise: promise };
    try {
      return await promise;
    } finally {
      if (_listInFlight && _listInFlight.key === key) _listInFlight = null;
    }
  }

  /**
   * Debounced search untuk input tabel.
   */
  function debouncedFetchLitmas(opts, delay, callback) {
    delay = delay || 350;
    if (_searchDebounceTimer) clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(function () {
      fetchLitmasPage(opts)
        .then(function (res) { if (callback) callback(null, res); })
        .catch(function (err) { if (callback) callback(err); });
    }, delay);
  }

  /**
   * Sync master saja (PK, Wilayah, Kepolisian) — cached di backend.
   */
  async function syncMastersOnly() {
    var url = getGasUrl();
    if (!url) return null;

    var [pk, wil, pol] = await Promise.all([
      gasGet('pk').catch(function () { return null; }),
      gasGet('wilayah').catch(function () { return null; }),
      gasGet('kepolisian').catch(function () { return null; })
    ]);

    // Integrasi ke variabel global app (jika ada)
    if (Array.isArray(pk) && typeof normalizePkMaster === 'function') {
      if (typeof PK_MASTER !== 'undefined') {
        // eslint-disable-next-line no-undef
        PK_MASTER = normalizePkMaster(pk);
        if (typeof syncPkListFromMaster === 'function') syncPkListFromMaster();
      }
    } else if (pk && Array.isArray(pk.pk)) {
      // unlikely
    }

    if (Array.isArray(wil) && typeof normalizeWilayahMaster === 'function') {
      if (typeof WILAYAH_MASTER !== 'undefined') {
        // eslint-disable-next-line no-undef
        WILAYAH_MASTER = normalizeWilayahMaster(wil);
        if (typeof syncWilayahFromMaster === 'function') syncWilayahFromMaster();
      }
    }

    if (Array.isArray(pol) && typeof normalizeKepolisianMaster === 'function') {
      if (typeof KEPOLISIAN_MASTER !== 'undefined') {
        // eslint-disable-next-line no-undef
        KEPOLISIAN_MASTER = normalizeKepolisianMaster(pol);
        if (typeof syncKepolisianFromMaster === 'function') syncKepolisianFromMaster();
      }
    }

    if (typeof saveMaster === 'function') saveMaster();
    return { pk: pk, wilayah: wil, kepolisian: pol };
  }

  /**
   * Full sync (compatibility). Gunakan sparingly.
   * Prefer loadDashboardFast + fetchLitmasPage + syncMastersOnly.
   */
  async function syncDataFromSheetsOptimized(manual) {
    if (_syncInFlight) {
      if (manual && typeof showToast === 'function') {
        showToast('Sinkronisasi sedang berjalan…', 'info');
      }
      return;
    }
    _syncInFlight = true;
    var url = getGasUrl();
    if (!url) {
      if (manual && typeof showToast === 'function') {
        showToast('Isi URL Google Apps Script dulu di menu Pengaturan', 'error');
      }
      _syncInFlight = false;
      return;
    }

    setSheetStatus('load', 'Menyinkronkan…');
    var t0 = performance.now();

    try {
      // 1) Coba bulk resource=all (compat + cache master di backend)
      var payload = null;
      try {
        payload = await gasGet('all');
      } catch (bulkErr) {
        console.warn('Bulk sync gagal, fallback paralel:', bulkErr.message || bulkErr);
        var sep = url.indexOf('?') >= 0 ? '&' : '?';
        var results = await Promise.all([
          fetchWithTimeout(url, { method: 'GET', redirect: 'follow', cache: 'no-store' }, 45000).then(function (r) { return r.text(); }),
          fetchWithTimeout(url + sep + 'resource=pk', { method: 'GET', redirect: 'follow', cache: 'no-store' }, 30000).then(function (r) { return r.text(); }).catch(function () { return null; }),
          fetchWithTimeout(url + sep + 'resource=wilayah', { method: 'GET', redirect: 'follow', cache: 'no-store' }, 30000).then(function (r) { return r.text(); }).catch(function () { return null; }),
          fetchWithTimeout(url + sep + 'resource=kepolisian', { method: 'GET', redirect: 'follow', cache: 'no-store' }, 30000).then(function (r) { return r.text(); }).catch(function () { return null; })
        ]);
        function parseSafe(t) {
          if (!t) return null;
          try { return JSON.parse(t); } catch (e) { return null; }
        }
        var lit = parseSafe(results[0]);
        payload = {
          litmas: Array.isArray(lit) ? lit : (lit && lit.litmas) || [],
          pk: parseSafe(results[1]),
          wilayah: parseSafe(results[2]),
          kepolisian: parseSafe(results[3])
        };
      }

      if (payload && Array.isArray(payload.litmas)) {
        if (typeof allData !== 'undefined') {
          // eslint-disable-next-line no-undef
          allData = payload.litmas;
          if (typeof saveAll === 'function') saveAll();
        }
      }

      // Masters
      if (Array.isArray(payload.pk) && typeof normalizePkMaster === 'function' && typeof PK_MASTER !== 'undefined') {
        // eslint-disable-next-line no-undef
        PK_MASTER = normalizePkMaster(payload.pk);
        if (typeof syncPkListFromMaster === 'function') syncPkListFromMaster();
      }
      if (Array.isArray(payload.wilayah) && typeof normalizeWilayahMaster === 'function' && typeof WILAYAH_MASTER !== 'undefined') {
        // eslint-disable-next-line no-undef
        WILAYAH_MASTER = normalizeWilayahMaster(payload.wilayah);
        if (typeof syncWilayahFromMaster === 'function') syncWilayahFromMaster();
      }
      if (Array.isArray(payload.kepolisian) && typeof normalizeKepolisianMaster === 'function' && typeof KEPOLISIAN_MASTER !== 'undefined') {
        // eslint-disable-next-line no-undef
        KEPOLISIAN_MASTER = normalizeKepolisianMaster(payload.kepolisian);
        if (typeof syncKepolisianFromMaster === 'function') syncKepolisianFromMaster();
      }
      if (typeof saveMaster === 'function') saveMaster();

      var ms = Math.round(performance.now() - t0);
      var n = (payload && payload.litmas && payload.litmas.length) || 0;
      setSheetStatus('ok', 'Sinkron ' + n + ' data (' + ms + ' ms)');
      if (manual && typeof showToast === 'function') {
        showToast('Sinkronisasi selesai: ' + n + ' litmas', 'success');
      }
      if (typeof renderAllViews === 'function') renderAllViews();
      return payload;
    } catch (e) {
      console.error(e);
      setSheetStatus('err', 'Gagal sinkron');
      if (manual && typeof showToast === 'function') {
        showToast('Gagal sinkron: ' + (e.message || e), 'error');
      }
      throw e;
    } finally {
      _syncInFlight = false;
    }
  }

  /**
   * Boot sequence yang disarankan:
   * 1. UI tampil dulu (dari localStorage)
   * 2. Dashboard stats async
   * 3. Master sync background
   * 4. Full litmas sync optional / background
   */
  async function bootOptimized() {
    // Render dari cache lokal dulu
    if (typeof renderAllViews === 'function') {
      try { renderAllViews(); } catch (e) { console.warn(e); }
    }

    var url = getGasUrl();
    if (!url) {
      setSheetStatus('err', 'Mode Lokal (URL belum diisi)');
      return;
    }

    try {
      // Parallel: dashboard + masters
      await Promise.all([
        loadDashboardFast().catch(function (e) { console.warn('dashboard', e); }),
        syncMastersOnly().catch(function (e) { console.warn('masters', e); })
      ]);

      // Background full litmas (tidak blocking UI)
      syncDataFromSheetsOptimized(false).catch(function (e) {
        console.warn('background full sync', e);
      });
    } catch (e) {
      console.warn('bootOptimized', e);
    }
  }

  // Export
  global.CICLApi = {
    gasGet: gasGet,
    gasPost: gasPost,
    loadDashboardFast: loadDashboardFast,
    fetchLitmasPage: fetchLitmasPage,
    debouncedFetchLitmas: debouncedFetchLitmas,
    syncMastersOnly: syncMastersOnly,
    syncDataFromSheetsOptimized: syncDataFromSheetsOptimized,
    bootOptimized: bootOptimized,
    setSheetStatus: setSheetStatus,
    getGasUrl: getGasUrl
  };

  // Alias agar tombol Sinkron existing bisa diarahkan
  global.syncDataFromSheetsOptimized = syncDataFromSheetsOptimized;

})(typeof window !== 'undefined' ? window : this);
