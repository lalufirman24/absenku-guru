'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../hooks/useAuthStore';
import { DashboardLayout } from '../../components/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  FileSpreadsheet,
  GraduationCap,
  Calendar,
  Loader2,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileDown,
  Printer,
  Sparkles
} from 'lucide-react';
import { ClassRoom, Student, Attendance, AttendanceStatus } from '../../types';

export default function RekapPage() {
  const { user } = useAuthStore();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  
  // Date Range State
  const [activePreset, setActivePreset] = useState<string>('bulan-ini');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  const [students, setStudents] = useState<Student[]>([]);
  const [allAttendanceList, setAllAttendanceList] = useState<Attendance[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isClassesLoading, setIsClassesLoading] = useState(true);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayDateString = () => formatDate(new Date());

  // Set dates based on preset
  const applyPreset = (presetName: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (presetName) {
      case 'hari-ini':
        start = today;
        end = today;
        break;
      case 'minggu-ini': {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(today.setDate(diff));
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        break;
      }
      case 'bulan-ini':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'semester-ini': {
        const year = today.getFullYear();
        const month = today.getMonth();
        if (month < 6) { // Jan - Jun
          start = new Date(year, 0, 1);
          end = new Date(year, 5, 30);
        } else { // Jul - Dec
          start = new Date(year, 6, 1);
          end = new Date(year, 11, 31);
        }
        break;
      }
      default:
        return;
    }

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
    setActivePreset(presetName);
  };

  // Fetch Classes for Dropdown
  const fetchClasses = async () => {
    if (!user) return;
    setIsClassesLoading(true);
    try {
      const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedClasses: ClassRoom[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedClasses.push({ id: docSnap.id, ...docSnap.data() } as ClassRoom);
      });
      setClasses(fetchedClasses);
      if (fetchedClasses.length > 0) {
        setSelectedClassId(fetchedClasses[0].id!);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setIsClassesLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    applyPreset('bulan-ini');
  }, [user]);

  // Fetch Students & all Attendance records for the class
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !selectedClassId) return;
      setIsLoading(true);

      try {
        // 1. Fetch Students in Class
        const studentsQuery = query(
          collection(db, 'students'),
          where('teacherId', '==', user.uid),
          where('classId', '==', selectedClassId)
        );
        const studentsSnap = await getDocs(studentsQuery);
        const fetchedStudents: Student[] = [];
        studentsSnap.forEach((docSnap) => {
          fetchedStudents.push({ id: docSnap.id, ...docSnap.data() } as Student);
        });
        fetchedStudents.sort((a, b) => a.name.localeCompare(b.name));
        setStudents(fetchedStudents);

        // 2. Fetch all attendance records for this class to filter in memory
        // This is index-friendly and highly efficient (exactly one query for any date range)
        const attQuery = query(
          collection(db, 'attendance'),
          where('teacherId', '==', user.uid),
          where('classId', '==', selectedClassId)
        );
        const attSnap = await getDocs(attQuery);
        const fetchedAtt: Attendance[] = [];
        attSnap.forEach((docSnap) => {
          fetchedAtt.push({ id: docSnap.id, ...docSnap.data() } as Attendance);
        });
        setAllAttendanceList(fetchedAtt);

      } catch (error) {
        console.error('Error loading rekap data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedClassId, user]);

  // Filter attendance list by selected date range in memory
  const filteredAttendanceList = useMemo(() => {
    if (!startDate || !endDate) return allAttendanceList;
    return allAttendanceList.filter((att) => att.date >= startDate && att.date <= endDate);
  }, [allAttendanceList, startDate, endDate]);

  // Compute student metrics dynamically
  const studentMetrics = useMemo(() => {
    return students.map((student) => {
      const records = filteredAttendanceList.filter((a) => a.studentId === student.id);
      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let alpa = 0;

      records.forEach((r) => {
        if (r.status === 'hadir') hadir++;
        else if (r.status === 'izin') izin++;
        else if (r.status === 'sakit') sakit++;
        else if (r.status === 'alpa') alpa++;
      });

      const total = hadir + izin + sakit + alpa;
      const percentage = total > 0 ? Math.round((hadir / total) * 100) : 100;

      return {
        student,
        hadir,
        izin,
        sakit,
        alpa,
        total,
        percentage,
      };
    });
  }, [students, filteredAttendanceList]);

  // Compute global range stats
  const globalStats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    studentMetrics.forEach((m) => {
      hadir += m.hadir;
      izin += m.izin;
      sakit += m.sakit;
      alpa += m.alpa;
    });

    return { hadir, izin, sakit, alpa };
  }, [studentMetrics]);

  // Sort students for Ranking
  const sortedByAttendance = useMemo(() => {
    const validMetrics = studentMetrics.filter((m) => m.total > 0);
    const sorted = [...validMetrics].sort((a, b) => b.percentage - a.percentage || a.student.name.localeCompare(b.student.name));
    return sorted;
  }, [studentMetrics]);

  const top5 = useMemo(() => sortedByAttendance.slice(0, 5), [sortedByAttendance]);
  
  const bottom5 = useMemo(() => {
    const validMetrics = studentMetrics.filter((m) => m.total > 0);
    const sorted = [...validMetrics].sort((a, b) => a.percentage - b.percentage || a.student.name.localeCompare(b.student.name));
    return sorted.slice(0, 5);
  }, [studentMetrics]);

  // Attention required students
  const attentionStudents = useMemo(() => {
    return studentMetrics.filter((m) => m.total > 0 && (m.alpa > 3 || m.percentage < 85));
  }, [studentMetrics]);

  // Automatic mathematical insights
  const insights = useMemo(() => {
    if (studentMetrics.length === 0 || filteredAttendanceList.length === 0) return null;

    const lowAttendanceCount = studentMetrics.filter(m => m.total > 0 && m.percentage < 85).length;
    
    let highestAlpaStudent = '';
    let highestAlpaCount = 0;

    studentMetrics.forEach(m => {
      if (m.alpa > highestAlpaCount) {
        highestAlpaCount = m.alpa;
        highestAlpaStudent = m.student.name;
      }
    });

    let insightText = '';
    if (lowAttendanceCount > 0) {
      insightText += `Dalam periode ini terdapat ${lowAttendanceCount} siswa dengan tingkat kehadiran di bawah 85%. `;
    } else {
      insightText += `Kabar baik! Semua siswa memiliki tingkat kehadiran di atas 85% dalam periode ini. `;
    }

    if (highestAlpaCount > 0) {
      insightText += `Siswa dengan tingkat alpa tertinggi adalah ${highestAlpaStudent} sebanyak ${highestAlpaCount} kali.`;
    } else {
      insightText += `Tidak ada siswa yang tercatat alpa (tanpa keterangan) selama periode ini.`;
    }

    return insightText;
  }, [studentMetrics, filteredAttendanceList]);

  // Helper for color rating indicator
  const getPercentageColor = (percentage: number) => {
    if (percentage >= 95) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
    if (percentage >= 85) return 'text-amber-400 border-amber-500/20 bg-amber-500/10';
    return 'text-red-400 border-red-500/20 bg-red-500/10';
  };

  // Export CSV
  const handleExportCSV = () => {
    if (students.length === 0) return;

    const headers = ['NIS', 'Nama Siswa', 'Hadir', 'Izin', 'Sakit', 'Alpa', 'Persentase Kehadiran'];
    const rows = studentMetrics.map((m) => [
      m.student.nis,
      m.student.name,
      m.hadir,
      m.izin,
      m.sakit,
      m.alpa,
      `${m.percentage}%`
    ]);

    const csvContent = [headers, ...rows].map((e) => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const className = classes.find(c => c.id === selectedClassId)?.name || 'kelas';
    link.setAttribute('download', `rekap_absensi_${className}_${startDate}_ke_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF via window.print
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <FileSpreadsheet className="h-8 w-8 text-indigo-500" />
              Rekap Absensi Periodik
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              Analisis dan monitoring kehadiran siswa dalam rentang waktu kustom secara real-time.
            </p>
          </div>
          {students.length > 0 && filteredAttendanceList.length > 0 && (
            <div className="flex items-center gap-2.5">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="border-slate-800 hover:bg-slate-800/60 text-slate-300 font-bold rounded-xl h-11 px-4 cursor-pointer flex items-center gap-2"
              >
                <FileDown className="h-4 w-4" />
                Export Excel (CSV)
              </Button>
              <Button
                onClick={handleExportPDF}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl h-11 px-4 cursor-pointer flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Printer className="h-4 w-4" />
                Cetak / PDF
              </Button>
            </div>
          )}
        </div>

        {/* Print Only Header */}
        <div className="hidden print:block border-b border-slate-800 pb-4 mb-6 text-center">
          <h1 className="text-2xl font-black text-white">REKAPITULASI KEHADIRAN SISWA</h1>
          <p className="text-slate-400 text-sm font-medium mt-1">
            Kelas: {classes.find(c => c.id === selectedClassId)?.name || ''} | Periode: {startDate} s/d {endDate}
          </p>
        </div>

        {/* Date and Class Selector Panel */}
        <div className="bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 p-5 rounded-2xl space-y-4 print:hidden">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Class Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-indigo-400" />
                Pilih Kelas
              </label>
              {isClassesLoading ? (
                <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
              ) : classes.length === 0 ? (
                <div className="text-sm text-slate-400">
                  Belum ada kelas terdaftar.{' '}
                  <Link href="/classes" className="text-indigo-400 font-bold hover:underline">
                    Buat disini.
                  </Link>
                </div>
              ) : (
                <select
                  className="w-full bg-slate-950/40 border border-slate-900 rounded-xl text-slate-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 h-11 cursor-pointer"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-950">
                      {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-400" />
                Tanggal Mulai
              </label>
              <Input
                type="date"
                className="bg-slate-950/40 border-slate-900 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 h-11 py-3 px-4 rounded-xl w-full"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActivePreset('custom');
                }}
              />
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-indigo-400" />
                Tanggal Akhir
              </label>
              <Input
                type="date"
                className="bg-slate-950/40 border-slate-900 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 h-11 py-3 px-4 rounded-xl w-full"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActivePreset('custom');
                }}
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/30">
            <span className="text-xs font-semibold text-slate-500 mr-2 uppercase tracking-wide">Preset Cepat:</span>
            {[
              { id: 'hari-ini', label: 'Hari Ini' },
              { id: 'minggu-ini', label: 'Minggu Ini' },
              { id: 'bulan-ini', label: 'Bulan Ini' },
              { id: 'semester-ini', label: 'Semester Ini' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all border cursor-pointer ${
                  activePreset === preset.id
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30 shadow-sm'
                    : 'bg-slate-950/40 text-slate-400 border-slate-900 hover:border-slate-800 hover:text-slate-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        {selectedClassId ? (
          isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400 font-medium">Mengagregasikan data kehadiran siswa...</p>
            </div>
          ) : students.length === 0 ? (
            <Card className="border-slate-800 bg-slate-900/20 border-dashed p-12 text-center max-w-2xl mx-auto">
              <h3 className="text-lg font-bold text-white mb-2">Kelas Kosong</h3>
              <p className="text-slate-400 text-sm mb-6">
                Tidak ada murid terdaftar di kelas ini. Masukkan data siswa terlebih dahulu di manajemen siswa.
              </p>
              <Link href="/students">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl cursor-pointer">
                  Kelola Murid
                </Button>
              </Link>
            </Card>
          ) : filteredAttendanceList.length === 0 ? (
            <Card className="border-slate-800 bg-slate-900/20 border-dashed p-12 text-center max-w-2xl mx-auto">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 mb-4">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Absensi Belum Terisi</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                Tidak ada rekaman kehadiran siswa pada kelas ini untuk rentang waktu ({startDate} s/d {endDate}). Silakan isi presensi terlebih dahulu.
              </p>
              <Link href="/attendance">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl flex items-center gap-2 cursor-pointer mx-auto">
                  Isi Absensi Sekarang
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Statistical Summary Cards */}
              <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <div className="bg-slate-900/30 border border-slate-800/40 rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-500/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Hadir</span>
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="text-4xl font-black tracking-tight text-emerald-400 mt-3">{globalStats.hadir}</div>
                </div>

                <div className="bg-slate-900/30 border border-slate-800/40 rounded-2xl p-5 flex flex-col justify-between hover:border-amber-500/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Izin</span>
                    <HelpCircle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="text-4xl font-black tracking-tight text-amber-400 mt-3">{globalStats.izin}</div>
                </div>

                <div className="bg-slate-900/30 border border-slate-800/40 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-500/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sakit</span>
                    <AlertCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="text-4xl font-black tracking-tight text-blue-400 mt-3">{globalStats.sakit}</div>
                </div>

                <div className="bg-slate-900/30 border border-slate-800/40 rounded-2xl p-5 flex flex-col justify-between hover:border-red-500/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Alpa</span>
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="text-4xl font-black tracking-tight text-red-400 mt-3">{globalStats.alpa}</div>
                </div>
              </div>

              {/* Quick Insights Text Container */}
              {insights && (
                <div className="bg-gradient-to-r from-indigo-950/20 to-slate-900/30 border border-indigo-500/10 p-5 rounded-2xl flex items-start gap-4">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2 rounded-xl">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Insight Ringkasan Otomatis</h4>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      {insights}
                    </p>
                  </div>
                </div>
              )}

              {/* Ranking & Attention Lists */}
              <div className="grid gap-6 md:grid-cols-3 print:hidden">
                {/* Top 5 Attendance */}
                <Card className="border-slate-800/50 bg-slate-900/20 backdrop-blur-xl rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      Top 5 Kehadiran Terbaik
                    </CardTitle>
                    <CardDescription className="text-xs">Siswa paling disiplin & rajin hadir.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4">
                    <div className="space-y-2.5">
                      {top5.map((m, index) => (
                        <div key={m.student.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/25 border border-slate-900/40">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span className="text-xs font-extrabold text-slate-500 w-4">#{index + 1}</span>
                            <span className="text-xs font-bold text-slate-300 truncate">{m.student.name}</span>
                          </div>
                          <span className="text-xs font-black px-2 py-0.5 rounded-md text-emerald-400 bg-emerald-500/10 border border-emerald-500/10">
                            {m.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Bottom 5 Attendance */}
                <Card className="border-slate-800/50 bg-slate-900/20 backdrop-blur-xl rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-400" />
                      Top 5 Kehadiran Terendah
                    </CardTitle>
                    <CardDescription className="text-xs">Siswa dengan persentase paling sedikit.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4">
                    <div className="space-y-2.5">
                      {bottom5.map((m, index) => (
                        <div key={m.student.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950/25 border border-slate-900/40">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <span className="text-xs font-extrabold text-slate-500 w-4">#{index + 1}</span>
                            <span className="text-xs font-bold text-slate-300 truncate">{m.student.name}</span>
                          </div>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${getPercentageColor(m.percentage)}`}>
                            {m.percentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Attention Panel */}
                <Card className="border-slate-800/50 bg-slate-900/20 backdrop-blur-xl rounded-2xl border-l-red-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Siswa Perlu Perhatian
                    </CardTitle>
                    <CardDescription className="text-xs">Kriteria: Alpa &gt; 3 kali ATAU Hadir &lt; 85%.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4">
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
                      {attentionStudents.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-500 font-medium">
                          Semua siswa berada dalam kondisi aman.
                        </div>
                      ) : (
                        attentionStudents.map((m) => (
                          <div key={m.student.id} className="flex flex-col p-2.5 rounded-xl bg-red-500/5 border border-red-500/10 gap-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-red-200 truncate">{m.student.name}</span>
                              <span className="text-xs font-black text-red-400">
                                {m.percentage}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Total Alpa: <strong className="text-red-400">{m.alpa} kali</strong></span>
                              <span>Hadir: {m.hadir}/{m.total}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Main Aggregate Table */}
              <div className="border border-slate-800/50 bg-slate-900/20 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase bg-slate-900/50">
                        <th className="py-4 px-6 w-24">NIS</th>
                        <th className="py-4 px-6">Nama Siswa</th>
                        <th className="py-4 px-6 text-center w-20">Hadir</th>
                        <th className="py-4 px-6 text-center w-20">Izin</th>
                        <th className="py-4 px-6 text-center w-20">Sakit</th>
                        <th className="py-4 px-6 text-center w-20">Alpa</th>
                        <th className="py-4 px-6 text-center w-36">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200 text-sm">
                      {studentMetrics.map((m) => {
                        return (
                          <tr key={m.student.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-4 px-6 font-medium text-slate-500">{m.student.nis}</td>
                            <td className="py-4 px-6 font-bold text-slate-100">{m.student.name}</td>
                            <td className="py-4 px-6 text-center font-bold text-emerald-400">{m.hadir}</td>
                            <td className="py-4 px-6 text-center font-bold text-amber-400">{m.izin}</td>
                            <td className="py-4 px-6 text-center font-bold text-blue-400">{m.sakit}</td>
                            <td className="py-4 px-6 text-center font-bold text-red-400">{m.alpa}</td>
                            <td className="py-4 px-6 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black border ${getPercentageColor(m.percentage)}`}>
                                {m.total > 0 ? `${m.percentage}%` : '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-20 text-slate-400">
            Silakan pilih kelas terlebih dahulu untuk melihat rekap kehadiran.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
