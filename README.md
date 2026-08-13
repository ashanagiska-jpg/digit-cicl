# DIGIT-CICL — PWA Edition (Optimized)

Sistem Litmas, Registrasi & Tracking Adjudikasi Anak  
**Bapas Kelas II Lahat**

Versi ini sudah mencakup optimasi performa (cache backend, dashboard cepat, batch write).

## Struktur file

```
digit-cicl/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── api-layer.js    ← layer API optimasi
│   └── app.js          ← logika aplikasi lengkap
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── manifest.webmanifest
├── sw.js
├── Code.gs             ← backend Google Apps Script (optimasi)
└── README.md
```

## Cara deploy

### A. Frontend (website)

1. Upload seluruh folder ini ke hosting HTTPS (Vercel, Netlify, GitHub Pages, dll.)
2. Pastikan struktur folder tetap sama (`css/`, `js/`, `icons/`)

### B. Backend (Google Apps Script)

1. Buka Google Spreadsheet data DIGIT-CICL
2. **Extensions → Apps Script**
3. Hapus isi lama, **tempel seluruh isi `Code.gs`**
4. Jika script tidak terikat ke Sheet, isi `SPREADSHEET_ID` di baris atas Code.gs
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Salin URL yang berakhiran `/exec`

### C. Hubungkan frontend ke backend

1. Buka website → login Admin (`Naer` / `adp1212`)
2. Menu **Pengaturan**
3. Tempel URL Web App GAS
4. Simpan → klik **Sinkron Google Sheet**

## Login default

| Peran | Username | Password |
|-------|----------|----------|
| Admin | Naer     | adp1212  |
| Tamu  | —        | view only |

## Fitur optimasi

- CacheService master data (PK, Wilayah, Kepolisian) 10 menit
- Endpoint dashboard ringan (`?resource=dashboard`)
- Pagination + search server-side (`list_litmas`)
- Boot: UI lokal dulu → stats cepat → full sync background
- Batch write master data
- Semua fitur lama tetap ada (CRUD, Gemini AI, Drive upload, master, dll.)

## Catatan

- Data operasional tetap di Google Spreadsheet
- File tetap di Google Drive
- Gemini API Key hanya disimpan di browser (localStorage)
