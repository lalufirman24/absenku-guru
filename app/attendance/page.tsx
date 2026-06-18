'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../hooks/useAuthStore';
import { DashboardLayout } from '../../components/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  CalendarCheck2,
  GraduationCap,
  Calendar,
  Loader2,
  Check,
  AlertCircle,
  Users2
} from 'lucide-react';
import { ClassRoom, Student, Attendance, AttendanceStatus } from '../../types';

export default function AttendancePage() {
  const { user } = useAuthStore();

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, { docId?: string; status: AttendanceStatus }>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dapatkan tanggal hari ini dalam format YYYY-MM-DD
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
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
    setSelectedDate(getTodayDateString());
  }, [user]);

  // Fetch Students & Existing Attendance
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !selectedClassId || !selectedDate) return;
      setIsLoading(true);
      setNotification(null);

      try {
        // 1. Fetch Students
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

        // 2. Fetch Existing Attendance
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('teacherId', '==', user.uid),
          where('classId', '==', selectedClassId),
          where('date', '==', selectedDate)
        );
        const attendanceSnap = await getDocs(attendanceQuery);
        
        const existingAttMap: Record<string, { docId: string; status: AttendanceStatus }> = {};
        attendanceSnap.forEach((docSnap) => {
          const data = docSnap.data();
          existingAttMap[data.studentId] = {
            docId: docSnap.id,
            status: data.status as AttendanceStatus,
          };
        });

        // 3. Populate Map (default to 'hadir' if no record exists)
        const initialMap: Record<string, { docId?: string; status: AttendanceStatus }> = {};
        fetchedStudents.forEach((student) => {
          if (existingAttMap[student.id!]) {
            initialMap[student.id!] = {
              docId: existingAttMap[student.id!].docId,
              status: existingAttMap[student.id!].status,
            };
          } else {
            initialMap[student.id!] = {
              status: 'hadir',
            };
          }
        });
        setAttendanceMap(initialMap);
      } catch (error) {
        console.error('Error loading attendance data:', error);
        setNotification({ type: 'error', message: 'Gagal memuat data absensi.' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedClassId, selectedDate, user]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleSaveAttendance = async () => {
    if (!user || !selectedClassId || !selectedDate) return;
    setIsSubmitLoading(true);
    setNotification(null);

    try {
      const batch = writeBatch(db);

      students.forEach((student) => {
        const record = attendanceMap[student.id!];
        
        if (record.docId) {
          // Update Existing Document
          const docRef = doc(db, 'attendance', record.docId);
          batch.update(docRef, {
            status: record.status,
          });
        } else {
          // Create New Document
          const newDocRef = doc(collection(db, 'attendance'));
          batch.set(newDocRef, {
            studentId: student.id!,
            classId: selectedClassId,
            teacherId: user.uid,
            date: selectedDate,
            status: record.status,
          });
        }
      });

      await batch.commit();
      
      // Refresh to fetch the newly created document IDs
      // 1. Fetch updated attendance
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('teacherId', '==', user.uid),
        where('classId', '==', selectedClassId),
        where('date', '==', selectedDate)
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      const updatedMap: Record<string, { docId?: string; status: AttendanceStatus }> = {};
      attendanceSnap.forEach((docSnap) => {
        const data = docSnap.data();
        updatedMap[data.studentId] = {
          docId: docSnap.id,
          status: data.status as AttendanceStatus,
        };
      });
      setAttendanceMap(updatedMap);

      setNotification({ type: 'success', message: 'Data absensi berhasil disimpan!' });
    } catch (error) {
      console.error('Error saving attendance:', error);
      setNotification({ type: 'error', message: 'Gagal menyimpan data absensi.' });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Preset status styles for UI representation
  const statusConfig = {
    hadir: { label: 'Hadir', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 activeBg: bg-emerald-600' },
    izin: { label: 'Izin', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20 activeBg: bg-amber-600' },
    sakit: { label: 'Sakit', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20 activeBg: bg-blue-600' },
    alpa: { label: 'Alpa', bg: 'bg-red-500/10 text-red-400 border-red-500/20 activeBg: bg-red-600' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
            <CalendarCheck2 className="h-8 w-8 text-indigo-500" />
            Absensi Harian
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">Lakukan pencatatan kehadiran murid kelas mengajar Anda hari ini.</p>
        </div>

        {/* Date and Class Filter Box */}
        <div className="grid gap-4 sm:grid-cols-2 bg-slate-900/20 backdrop-blur-xl border border-slate-800/40 p-5 rounded-2xl">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-indigo-400" />
              Pilih Kelas
            </label>
            {isClassesLoading ? (
              <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
            ) : classes.length === 0 ? (
              <div className="text-sm text-slate-400">
                Belum ada kelas.{' '}
                <a href="/classes" className="text-indigo-400 font-bold hover:underline">
                  Buat disini.
                </a>
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

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-indigo-400" />
              Pilih Tanggal
            </label>
            <Input
              type="date"
              className="bg-slate-950/40 border-slate-900 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 h-11 py-3 px-4 rounded-xl w-full"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* Alert Notifications */}
        {notification && (
          <div
            className={`rounded-xl border p-4 text-sm flex items-center gap-3 ${
              notification.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {notification.type === 'success' ? (
              <Check className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            {notification.message}
          </div>
        )}

        {/* Students Checklist Area */}
        {selectedClassId ? (
          isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400">Memuat murid & data kehadiran...</p>
            </div>
          ) : students.length === 0 ? (
            <Card className="border-slate-800 bg-slate-900/10 border-dashed p-12 text-center max-w-2xl mx-auto">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 mb-4">
                <Users2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Kelas Kosong</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                Tidak ada data siswa terdaftar di dalam kelas ini. Daftarkan siswa terlebih dahulu sebelum mengisi absensi harian.
              </p>
              <a href="/students">
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl cursor-pointer">
                  Kelola Data Siswa
                </Button>
              </a>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="border border-slate-800/50 bg-slate-900/20 backdrop-blur-xl rounded-2xl overflow-hidden divide-y divide-slate-800/60">
                {students.map((student) => {
                  const currentStatus = attendanceMap[student.id!]?.status || 'hadir';

                  return (
                    <div
                      key={student.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-indigo-400 tracking-wide uppercase">
                          NIS: {student.nis}
                        </span>
                        <span className="text-lg font-bold text-white mt-1 truncate">{student.name}</span>
                      </div>

                      {/* Segmented control buttons */}
                      <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 border border-slate-800 rounded-xl w-full sm:max-w-md">
                        {(['hadir', 'izin', 'sakit', 'alpa'] as AttendanceStatus[]).map((status) => {
                          const isSelected = currentStatus === status;
                          let activeColor = '';
                          
                          if (status === 'hadir') activeColor = 'bg-emerald-600 text-white shadow';
                          if (status === 'izin') activeColor = 'bg-amber-600 text-white shadow';
                          if (status === 'sakit') activeColor = 'bg-blue-600 text-white shadow';
                          if (status === 'alpa') activeColor = 'bg-red-600 text-white shadow';

                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(student.id!, status)}
                              className={`py-2 px-3 text-xs font-semibold capitalize rounded-lg transition-all cursor-pointer text-center ${
                                isSelected
                                  ? activeColor
                                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
                              }`}
                            >
                              {status}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="flex justify-end p-4 border border-slate-800/50 bg-slate-900/40 backdrop-blur-xl rounded-2xl items-center">
                <Button
                  onClick={handleSaveAttendance}
                  disabled={isSubmitLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl cursor-pointer flex items-center gap-2"
                >
                  {isSubmitLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Absensi'
                  )}
                </Button>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-20 text-slate-400">
            Pilih kelas terlebih dahulu untuk mulai merekam kehadiran.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
