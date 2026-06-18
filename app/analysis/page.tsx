'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../hooks/useAuthStore';
import { DashboardLayout } from '../../components/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  BrainCircuit,
  GraduationCap,
  Loader2,
  Printer,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Sparkles,
  Info
} from 'lucide-react';
import { ClassRoom, Student, Attendance } from '../../types';

// Simple Markdown Parser to render AI response beautifully without external libraries
function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let inList = false;

  const parseInlineBold = (content: string): React.ReactNode[] => {
    const parts = content.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-extrabold text-white">{part}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Handle Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const listContent = trimmed.substring(2);
      if (!inList) {
        inList = true;
        currentList = [];
      }
      currentList.push(
        <li key={`li-${index}`} className="mb-2 text-slate-300 pl-1 list-disc ml-6 leading-relaxed">
          {parseInlineBold(listContent)}
        </li>
      );
      return;
    }

    // If we were in a list and the current line is not a list item, push the list element
    if (inList && !trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
      elements.push(
        <ul key={`ul-${index}`} className="mb-6 space-y-1">
          {currentList}
        </ul>
      );
      inList = false;
      currentList = [];
    }

    // Handle Headers
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={index} className="text-2xl font-black text-white mt-8 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
          {parseInlineBold(trimmed.substring(2))}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={index} className="text-xl font-extrabold text-indigo-400 mt-6 mb-3">
          {parseInlineBold(trimmed.substring(3))}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={index} className="text-lg font-bold text-slate-200 mt-4 mb-2">
          {parseInlineBold(trimmed.substring(4))}
        </h3>
      );
    }
    // Handle Blockquotes
    else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={index} className="border-l-4 border-indigo-500 bg-indigo-950/20 px-4 py-3 rounded-r-xl my-4 text-slate-300 italic">
          {parseInlineBold(trimmed.substring(2))}
        </blockquote>
      );
    }
    // Handle Empty Lines
    else if (trimmed === '') {
      // Do nothing
    }
    // Handle Paragraphs
    else {
      elements.push(
        <p key={index} className="text-slate-300 mb-4 leading-relaxed">
          {parseInlineBold(trimmed)}
        </p>
      );
    }
  });

  // Push final list if exists
  if (inList && currentList.length > 0) {
    elements.push(
      <ul key="ul-final" className="mb-6 space-y-1">
        {currentList}
      </ul>
    );
  }

  return <div className="prose prose-invert max-w-none">{elements}</div>;
}

export default function AnalysisPage() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState<string>('');

  // Fetch Classes
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
  }, [user]);

  const handleStartAnalysis = async () => {
    if (!selectedClassId || !user) return;

    setIsAnalyzing(true);
    setErrorMsg('');
    setAnalysisResult('');
    
    // Smooth loader steps
    const steps = [
      'Menghubungkan ke Firestore database...',
      'Mengambil data profil siswa...',
      'Membaca riwayat kehadiran absensi...',
      'Memproses data statistik kelas...',
      'Mengirim data ke Gemini AI untuk analisis pola...',
      'Menyusun rekomendasi wali kelas...'
    ];

    let stepIdx = 0;
    setLoadingStep(steps[0]);
    const stepInterval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setLoadingStep(steps[stepIdx]);
      }
    }, 2000);

    try {
      // 1. Fetch Students
      const studentsQuery = query(
        collection(db, 'students'),
        where('teacherId', '==', user.uid),
        where('classId', '==', selectedClassId)
      );
      const studentsSnap = await getDocs(studentsQuery);
      const studentsData: Student[] = [];
      studentsSnap.forEach((docSnap) => {
        studentsData.push({ id: docSnap.id, ...docSnap.data() } as Student);
      });

      if (studentsData.length === 0) {
        clearInterval(stepInterval);
        setErrorMsg('Kelas ini tidak memiliki murid. Silakan tambahkan murid terlebih dahulu di menu Manajemen Siswa.');
        setIsAnalyzing(false);
        return;
      }

      // 2. Fetch All Attendance Records
      const attQuery = query(
        collection(db, 'attendance'),
        where('teacherId', '==', user.uid),
        where('classId', '==', selectedClassId)
      );
      const attSnap = await getDocs(attQuery);
      const attendanceData: Attendance[] = [];
      attSnap.forEach((docSnap) => {
        attendanceData.push({ id: docSnap.id, ...docSnap.data() } as Attendance);
      });

      if (attendanceData.length === 0) {
        clearInterval(stepInterval);
        setErrorMsg('Belum ada data absensi untuk kelas ini. Harap lakukan absensi terlebih dahulu di menu Absensi Harian.');
        setIsAnalyzing(false);
        return;
      }

      // Find the class details
      const selectedClassObj = classes.find(c => c.id === selectedClassId);
      const className = selectedClassObj ? `${selectedClassObj.name} (${selectedClassObj.grade})` : 'Kelas';

      // 3. Send to API route
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          className,
          students: studentsData,
          attendance: attendanceData,
        }),
      });

      clearInterval(stepInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Terjadi kesalahan saat menghubungi API analisis.');
      }

      const resData = await response.json();
      setAnalysisResult(resData.result);
    } catch (error: any) {
      clearInterval(stepInterval);
      console.error('AI Analysis failed:', error);
      setErrorMsg(error.message || 'Gagal memproses analisis AI. Pastikan API key sudah dikonfigurasi.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 print:m-0 print:p-0">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <BrainCircuit className="h-8 w-8 text-indigo-500" />
              Analisis AI
            </h1>
            <p className="text-slate-400 mt-1">Dapatkan visualisasi tren kelas, siswa berisiko tinggi, dan saran wali kelas berbasis AI.</p>
          </div>
          {analysisResult && (
            <Button
              onClick={handlePrint}
              variant="outline"
              className="border-slate-800 text-slate-300 hover:bg-slate-900 rounded-xl px-4 py-2 cursor-pointer flex items-center gap-2 self-start sm:self-auto"
            >
              <Printer className="h-4 w-4" />
              Cetak Laporan
            </Button>
          )}
        </div>

        {/* Setup and Analysis Trigger */}
        <div className="bg-slate-900/30 p-5 border border-slate-800/50 rounded-2xl print:hidden flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 flex-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-indigo-400" />
              Pilih Kelas untuk Dianalisis
            </label>
            {isClassesLoading ? (
              <div className="h-10 flex items-center">
                <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-sm text-slate-400">
                Belum ada kelas terdaftar.{' '}
                <a href="/classes" className="text-indigo-400 font-bold hover:underline">
                  Buat disini.
                </a>
              </div>
            ) : (
              <select
                disabled={isAnalyzing}
                className="w-full md:max-w-md bg-slate-950 border border-slate-800 rounded-xl h-11 text-white p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade})
                  </option>
                ))}
              </select>
            )}
          </div>

          <Button
            onClick={handleStartAnalysis}
            disabled={isAnalyzing || !selectedClassId}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl px-6 py-6 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 h-12"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Menganalisis...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Mulai Analisis AI
              </>
            )}
          </Button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3 print:hidden">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Gagal Melakukan Analisis</p>
              <p className="text-xs text-red-400/80 mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Loading Overlay State */}
        {isAnalyzing && (
          <div className="bg-slate-900/10 border border-slate-800/50 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center space-y-6 print:hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-slate-950 p-6 border border-slate-800 rounded-2xl">
                <BrainCircuit className="h-12 w-12 text-indigo-500 animate-bounce" />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-bold text-white">AI Sedang Bekerja...</h3>
              <p className="text-sm text-indigo-400 font-medium animate-pulse">{loadingStep}</p>
              <p className="text-xs text-slate-500">Proses analisis biasanya memakan waktu 5-15 detik tergantung pada banyaknya riwayat absensi kelas Anda.</p>
            </div>
          </div>
        )}

        {/* Analysis Result Output */}
        {analysisResult && !isAnalyzing && (
          <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden print:bg-transparent print:border-none print:shadow-none print:p-0">
            {/* Background design elements */}
            <div className="absolute -top-40 -right-40 h-80 w-80 bg-indigo-600/5 rounded-full blur-3xl print:hidden"></div>
            
            <div className="flex items-center gap-2 border-b border-slate-800/30 pb-4 mb-6 print:hidden">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">HASIL GENERASI AI</span>
            </div>

            <div className="print:block">
              <SimpleMarkdown text={analysisResult} />
            </div>

            {/* Print Note */}
            <div className="mt-8 pt-4 border-t border-slate-800/30 flex items-center gap-2 text-xs text-slate-500 print:hidden">
              <Info className="h-4 w-4 text-slate-400" />
              <span>Gunakan tombol "Cetak Laporan" untuk mencetak laporan resmi ini atau menyimpannya sebagai file PDF.</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!analysisResult && !isAnalyzing && (
          <div className="bg-slate-900/20 border border-slate-800/50 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center space-y-4 print:hidden">
            <div className="bg-slate-900/40 p-4 rounded-xl text-slate-500 border border-slate-800/50">
              <HelpCircle className="h-8 w-8" />
            </div>
            <div className="max-w-md">
              <h3 className="text-base font-bold text-white">Belum Ada Analisis</h3>
              <p className="text-sm text-slate-400 mt-1">Pilih kelas di atas lalu klik "Mulai Analisis AI" untuk menghasilkan analisis pola kehadiran kelas secara otomatis.</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
