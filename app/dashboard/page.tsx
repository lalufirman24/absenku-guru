'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../hooks/useAuthStore';
import { DashboardLayout } from '../../components/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  GraduationCap,
  Users2,
  CalendarCheck2,
  Plus,
  ArrowRight,
  ClipboardCheck,
  FileSpreadsheet
} from 'lucide-react';

export default function DashboardPage() {
  const { user, profile } = useAuthStore();
  
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    todayAttendance: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Dapatkan tanggal hari ini dalam format YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  useEffect(() => {
    if (!user) return;

    const fetchDashboardStats = async () => {
      setIsLoading(true);
      try {
        const uid = user.uid;
        const todayDate = getTodayDateString();

        // 1. Fetch Total Kelas
        const classesQuery = query(collection(db, 'classes'), where('teacherId', '==', uid));
        const classesSnap = await getDocs(classesQuery);
        const totalClasses = classesSnap.size;

        // 2. Fetch Total Siswa
        const studentsQuery = query(collection(db, 'students'), where('teacherId', '==', uid));
        const studentsSnap = await getDocs(studentsQuery);
        const totalStudents = studentsSnap.size;

        // 3. Fetch Absensi Hari Ini
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('teacherId', '==', uid),
          where('date', '==', todayDate)
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        const todayAttendance = attendanceSnap.size;

        setStats({
          totalClasses,
          totalStudents,
          todayAttendance,
        });
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [user]);

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 font-sans">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Dashboard Utama</h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">Selamat datang kembali, {profile?.name || 'Guru'}</p>
          </div>
          <div className="px-4 py-2 bg-slate-900/40 border border-slate-900/60 rounded-xl text-xs text-slate-300 font-bold tracking-wide uppercase flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {todayFormatted}
          </div>
        </div>

        {/* Statistik Cards */}
        <div className="grid gap-6 sm:grid-cols-3">
          {/* Card 1: Total Kelas */}
          <Card className="border-slate-900 bg-slate-900/30 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/20 hover:bg-slate-900/40 transition-all duration-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Kelas</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/10">
                <GraduationCap className="h-4.5 w-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-12 w-20 bg-slate-900 animate-pulse rounded-lg mt-1"></div>
              ) : (
                <div className="text-5xl font-black text-white tracking-tight">{stats.totalClasses}</div>
              )}
              <p className="text-xs text-slate-500 mt-2.5 font-medium">Kelas aktif terdaftar</p>
            </CardContent>
          </Card>

          {/* Card 2: Total Siswa */}
          <Card className="border-slate-900 bg-slate-900/30 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/20 hover:bg-slate-900/40 transition-all duration-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Siswa</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/10">
                <Users2 className="h-4.5 w-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-12 w-20 bg-slate-900 animate-pulse rounded-lg mt-1"></div>
              ) : (
                <div className="text-5xl font-black text-white tracking-tight">{stats.totalStudents}</div>
              )}
              <p className="text-xs text-slate-500 mt-2.5 font-medium">Siswa di semua kelas</p>
            </CardContent>
          </Card>

          {/* Card 3: Absen Hari Ini */}
          <Card className="border-slate-900 bg-slate-900/30 backdrop-blur-xl relative overflow-hidden group hover:border-indigo-500/20 hover:bg-slate-900/40 transition-all duration-200 rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">Absensi Hari Ini</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center border border-indigo-500/10">
                <CalendarCheck2 className="h-4.5 w-4.5" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-12 w-20 bg-slate-900 animate-pulse rounded-lg mt-1"></div>
              ) : (
                <div className="text-5xl font-black text-white tracking-tight flex items-baseline gap-1">
                  {stats.todayAttendance}
                  {stats.totalStudents > 0 && (
                    <span className="text-base font-bold text-slate-600">
                      / {stats.totalStudents}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500 mt-2.5 font-medium">Siswa terabsen hari ini</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Dashboard Banner */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-slate-900 bg-slate-900/20 md:col-span-2 flex flex-col justify-between rounded-2xl border-t-slate-800/80">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-indigo-400" />
                Mulai Absensi Hari Ini
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium text-sm">
                Pilih kelas aktif Anda, panggil nama siswa, dan tandai kehadiran mereka dengan cepat. Seluruh rekap kehadiran akan diproses otomatis secara instan.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-6">
              <Link href="/attendance">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all h-11 px-5">
                  Lakukan Absensi Sekarang
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-slate-900 bg-slate-900/20 flex flex-col justify-between rounded-2xl border-t-slate-800/80">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-white">Langkah Cepat</CardTitle>
              <CardDescription className="text-slate-400 font-medium text-sm">Kelola kelengkapan data aplikasi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pb-6">
              <Link href="/classes">
                <Button variant="outline" className="w-full justify-start border-slate-900 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl cursor-pointer text-xs font-semibold py-2.5 px-4 h-auto flex items-center">
                  <Plus className="mr-2 h-4.5 w-4.5 text-slate-500" />
                  Tambah & Kelola Kelas
                </Button>
              </Link>

              <Link href="/students">
                <Button variant="outline" className="w-full justify-start border-slate-900 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl cursor-pointer text-xs font-semibold py-2.5 px-4 h-auto flex items-center">
                  <Plus className="mr-2 h-4.5 w-4.5 text-slate-500" />
                  Import / Input Data Siswa
                </Button>
              </Link>

              <Link href="/rekap">
                <Button variant="outline" className="w-full justify-start border-slate-900 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl cursor-pointer text-xs font-semibold py-2.5 px-4 h-auto flex items-center">
                  <FileSpreadsheet className="mr-2 h-4.5 w-4.5 text-slate-500" />
                  Lihat Rekap Absensi
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
