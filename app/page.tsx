'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '../hooks/useAuthStore';
import { Button } from '../components/ui/button';
import { ArrowRight, CheckCircle2, Users, ClipboardCheck, Sparkles, BookOpen } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuthStore();
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950 to-slate-950">
      {/* Navbar */}
      <nav className="border-b border-slate-900 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              {!logoError ? (
                <Image
                  src="/images/logo.png"
                  alt="Logo Absenku Guru"
                  width={32}
                  height={32}
                  className="object-contain rounded-lg"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">
                  A
                </div>
              )}
              <span className="text-xl font-bold tracking-tight text-white">Absenku Guru</span>
            </div>
            <div>
              {user ? (
                <Link href="/dashboard">
                  <Button className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer rounded-lg px-4 py-2 font-medium">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <div className="flex gap-4">
                  <Link href="/login">
                    <Button variant="ghost" className="text-slate-300 hover:text-white cursor-pointer">
                      Masuk
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer rounded-lg px-4 py-2 font-medium">
                      Mulai Gratis
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 sm:px-6 lg:px-8 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-medium animate-pulse">
          <Sparkles className="h-4 w-4" />
          <span>Platform Absensi Siswa #1 untuk Guru Indonesia</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl max-w-3xl mx-auto leading-none bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
          Kelola Absensi Kelas Jauh Lebih Cepat dan Mudah
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-slate-400">
          Didesain khusus untuk Guru SD, SMP, SMA, dan SMK. Lakukan absensi harian, rekap otomatis, dan analisis siswa bermasalah menggunakan kecerdasan buatan AI dalam hitungan detik.
        </p>
        <div className="flex justify-center gap-4">
          <Link href={user ? '/dashboard' : '/register'}>
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg text-base font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20">
              Mulai Sekarang
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 border-t border-slate-900">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-indigo-500/20 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Absensi Harian Cepat</h3>
            <p className="text-slate-400">
              Tandai kehadiran murid (Hadir, Izin, Sakit, Alpa) dengan sekali ketuk. Sangat mudah digunakan di ponsel Anda saat di kelas.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-indigo-500/20 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center">
              <BookOpen className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Rekap Otomatis</h3>
            <p className="text-slate-400">
              Tidak perlu lagi menghitung manual di excel. Lihat total kehadiran kelas per periode secara real-time dan ekspor langsung ke CSV.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-4 hover:border-indigo-500/20 transition-colors">
            <div className="h-12 w-12 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white">Analisis AI Cerdas</h3>
            <p className="text-slate-400">
              Dapatkan rekomendasi tindakan wali kelas untuk siswa dengan tingkat kehadiran rendah langsung dari AI Gemini.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
