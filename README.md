# DIGIT-CICL — PWA Edition (Modular)

Sistem Litmas, Registrasi & Tracking Adjudikasi Anak  
**Bapas Kelas II Lahat**

## Struktur File

```
digit-cicl-pwa/
├── index.html                 # Struktur HTML saja
├── css/
│   └── styles.css             # Semua styling (glassmorphism, tabel, dll.)
├── js/
│   └── app.js                 # Seluruh logika aplikasi
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── manifest.webmanifest       # PWA manifest
├── sw.js                      # Service Worker
├── Code.gs                    # Backend Google Apps Script
└── README.md
```

## Fitur

- Desain **glassmorphism** modern ala dashboard perbankan
- **Pagination** di semua tabel data
- **PWA** (installable, offline shell)
- Kode terpisah: HTML / CSS / JS

## Cara Deploy

1. Host seluruh folder ini di HTTPS (GitHub Pages, Netlify, Firebase, dll.).
2. Pastikan path relatif tetap utuh (`css/`, `js/`, `icons/`).
3. Isi URL Google Apps Script lewat menu **Pengaturan**.
4. Deploy `Code.gs` sebagai Web App di Google Apps Script (akses: Anyone).

## Login Default

| Peran  | Username | Password  |
|--------|----------|-----------|
| Admin  | `Naer`   | `adp1212` |
| Tamu   | —        | view only |
