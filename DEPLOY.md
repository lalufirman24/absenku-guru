# Panduan Deployment - Absenku Guru

Dokumen ini menjelaskan langkah-langkah untuk mendeploy aplikasi **Absenku Guru** ke platform produksi menggunakan **Vercel** dan menyiapkan **Firebase Firestore & Auth**.

---

## Prasyarat
Sebelum memulai, pastikan Anda memiliki akun di platform berikut:
1. [GitHub](https://github.com) (Untuk menyimpan repositori kode Anda)
2. [Firebase Console](https://console.firebase.google.com) (Database Firestore & Otentikasi)
3. [Vercel](https://vercel.com) (Hosting aplikasi Next.js)

---

## Langkah 1: Push Kode ke GitHub
1. Buat repositori baru di akun GitHub Anda (misal: `absenku-guru`).
2. Jalankan perintah berikut di folder proyek lokal Anda:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Absenku Guru"
   git branch -M main
   git remote add origin https://github.com/USERNAME/absenku-guru.git
   git push -u origin main
   ```

---

## Langkah 2: Setup Firebase di Produksi
Jika Anda belum membuat proyek Firebase produksi:
1. Masuk ke **Firebase Console** -> **Add Project**.
2. Beri nama proyek Anda, aktifkan Google Analytics jika diinginkan, lalu klik **Create Project**.
3. **Aktifkan Autentikasi**:
   - Buka menu **Authentication** -> **Get Started**.
   - Aktifkan provider **Email/Password**.
4. **Aktifkan Firestore Database**:
   - Buka menu **Firestore Database** -> **Create Database**.
   - Pilih mode **Production Mode**.
   - Pilih lokasi server terdekat (misal: `asia-southeast2` untuk Jakarta/Singapura).
   - Salin isi berkas `firestore.rules` dari proyek Anda ke tab **Rules** di Firebase Console, lalu klik **Publish**.
5. **Dapatkan Firebase Web Configuration**:
   - Masuk ke **Project Settings** (ikon gerigi di kiri atas).
   - Scroll ke bawah ke bagian *Your apps* -> klik ikon **`</>` (Web)**.
   - Daftarkan aplikasi Anda (misal: `absenku-guru-web`).
   - Salin nilai-nilai dari objek konfigurasi Firebase (Anda akan membutuhkannya untuk Environment Variables di Vercel).

---

## Langkah 3: Deploy ke Vercel

### Metode A: Melalui Vercel Dashboard (Paling Direkomendasikan)
1. Masuk ke dashboard **Vercel** Anda.
2. Klik tombol **Add New...** -> **Project**.
3. Hubungkan akun GitHub Anda dan pilih repositori `absenku-guru`.
4. Pada bagian **Configure Project**:
   - **Framework Preset**: Next.js (terdeteksi otomatis).
   - **Root Directory**: `./`
5. Buka bagian **Environment Variables** dan masukkan variabel-variabel berikut:

| Nama Variabel | Deskripsi / Nilai |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key Anda |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain Anda |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID Anda |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket Anda |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID Anda |
| `NINE_ROUTER_API_KEY` | API Key untuk Gemini / 9Router Anda |
| `NINE_ROUTER_BASE_URL` | Base URL 9Router (misal: `https://api.9router.com/v1`) |
| `GEMINI_MODEL` | Model AI yang digunakan (default: `google/gemini-2.5-flash`) |

6. Klik tombol **Deploy**.
7. Tunggu 1-2 menit hingga proses build selesai. Selamat! Aplikasi Anda sekarang aktif secara online.

### Metode B: Melalui Vercel CLI (Alternatif Terminal)
1. Install Vercel CLI secara global jika belum:
   ```bash
   npm install -g vercel
   ```
2. Jalankan perintah login dan inisialisasi deployment:
   ```bash
   vercel
   ```
3. Ikuti petunjuk di terminal untuk menghubungkan proyek.
4. Untuk menambahkan Environment Variables secara cepat via CLI:
   ```bash
   vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
   # (Ulangi untuk semua variabel lingkungan yang tertera di atas)
   ```
5. Deploy versi produksi:
   ```bash
   vercel --prod
   ```

---

## Langkah 4: Verifikasi & Pasca-Deployment
Setelah deployment selesai, Vercel akan memberikan domain gratis berakhiran `.vercel.app` (misal: `absenku-guru.vercel.app`).
1. Buka URL aplikasi Anda di peramban (browser).
2. Daftarkan akun guru baru melalui halaman `/register`.
3. Buat kelas baru, tambahkan murid, isi absensi harian, dan coba jalankan **Analisis AI** untuk memverifikasi semuanya terhubung dengan sempurna.
