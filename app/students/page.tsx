'use client';

import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../hooks/useAuthStore';
import { DashboardLayout } from '../../components/dashboard-layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Users2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  FileSpreadsheet,
  Upload,
  Download,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import { ClassRoom, Student } from '../../types';

const studentSchema = z.object({
  nis: z.string().min(3, { message: 'NIS minimal 3 karakter' }),
  name: z.string().min(3, { message: 'Nama siswa minimal 3 karakter' }),
  parentName: z.string().min(3, { message: 'Nama orang tua/wali minimal 3 karakter' }),
  parentPhone: z.string().min(9, { message: 'No. HP minimal 9 karakter' }),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function StudentsPage() {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isClassesLoading, setIsClassesLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Dialog & Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  
  // CSV Import state
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
  });

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

  // Fetch Students of Selected Class
  const fetchStudents = async () => {
    if (!user || !selectedClassId) {
      setStudents([]);
      return;
    }
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'students'),
        where('teacherId', '==', user.uid),
        where('classId', '==', selectedClassId)
      );
      const querySnapshot = await getDocs(q);
      const fetchedStudents: Student[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedStudents.push({ id: docSnap.id, ...docSnap.data() } as Student);
      });
      // Urutkan siswa berdasarkan nama
      fetchedStudents.sort((a, b) => a.name.localeCompare(b.name));
      setStudents(fetchedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  useEffect(() => {
    fetchStudents();
    setCsvError(null);
    setCsvSuccess(null);
  }, [selectedClassId]);

  const openAddDialog = () => {
    setEditingStudent(null);
    reset({ nis: '', name: '', parentName: '', parentPhone: '' });
    setIsOpen(true);
  };

  const openEditDialog = (student: Student) => {
    setEditingStudent(student);
    setValue('nis', student.nis);
    setValue('name', student.name);
    setValue('parentName', student.parentName);
    setValue('parentPhone', student.parentPhone);
    setIsOpen(true);
  };

  const onSubmit = async (data: StudentFormValues) => {
    if (!user || !selectedClassId) return;
    setIsSubmitLoading(true);

    try {
      if (editingStudent) {
        // Edit Mode
        const docRef = doc(db, 'students', editingStudent.id!);
        await updateDoc(docRef, {
          nis: data.nis,
          name: data.name,
          parentName: data.parentName,
          parentPhone: data.parentPhone,
        });
      } else {
        // Add Mode
        await addDoc(collection(db, 'students'), {
          teacherId: user.uid,
          classId: selectedClassId,
          nis: data.nis,
          name: data.name,
          parentName: data.parentName,
          parentPhone: data.parentPhone,
          createdAt: new Date().toISOString(),
        });
      }
      setIsOpen(false);
      fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const openDeleteDialog = (studentId: string) => {
    setDeletingStudentId(studentId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteStudent = async () => {
    if (!deletingStudentId) return;
    setIsSubmitLoading(true);
    try {
      // 1. Delete student doc
      await deleteDoc(doc(db, 'students', deletingStudentId));

      // 2. Cascade delete attendance for this student
      const q = query(
        collection(db, 'attendance'),
        where('teacherId', '==', user!.uid),
        where('studentId', '==', deletingStudentId)
      );
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      querySnapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();

      setIsDeleteDialogOpen(false);
      setDeletingStudentId(null);
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student and records:', error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // CSV Import Handler (Client-side)
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedClassId) return;

    setCsvError(null);
    setCsvSuccess(null);
    setIsSubmitLoading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setCsvError('File kosong atau tidak valid.');
        setIsSubmitLoading(false);
        return;
      }

      const lines = text.split(/\r?\n/);
      const batch = writeBatch(db);
      let count = 0;
      let lineError = false;

      // Iterasi baris data (lewati header baris pertama)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        // Split by comma (handles basic parsing)
        const columns = line.split(',').map((col) => col.replace(/^["']|["']$/g, '').trim());

        if (columns.length < 4) {
          setCsvError(`Kesalahan format pada baris ${i + 1}. Pastikan ada 4 kolom (nis,nama,orangtua,hp).`);
          lineError = true;
          break;
        }

        const [nis, name, parentName, parentPhone] = columns;

        if (!nis || !name || !parentName || !parentPhone) {
          setCsvError(`Kesalahan pada baris ${i + 1}: Kolom tidak boleh kosong.`);
          lineError = true;
          break;
        }

        const newStudentRef = doc(collection(db, 'students'));
        batch.set(newStudentRef, {
          teacherId: user.uid,
          classId: selectedClassId,
          nis,
          name,
          parentName,
          parentPhone,
          createdAt: new Date().toISOString(),
        });
        count++;
      }

      if (!lineError && count > 0) {
        try {
          await batch.commit();
          setCsvSuccess(`Berhasil mengimpor ${count} siswa.`);
          fetchStudents();
        } catch (err) {
          console.error(err);
          setCsvError('Gagal menyimpan data ke database. Coba lagi.');
        }
      } else if (count === 0 && !lineError) {
        setCsvError('Tidak ada data siswa baru yang terdeteksi di dalam file.');
      }

      setIsSubmitLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  // CSV Export Handler
  const handleCSVExport = () => {
    if (students.length === 0) return;

    const currentClass = classes.find((c) => c.id === selectedClassId);
    const className = currentClass ? currentClass.name.replace(/\s+/g, '_') : 'Siswa';

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'NIS,Nama Lengkap,Nama Orang Tua/Wali,No. HP Orang Tua\n';

    students.forEach((s) => {
      const row = `"${s.nis}","${s.name}","${s.parentName}","${s.parentPhone}"`;
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Siswa_${className}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter((student) => {
    const queryLower = searchQuery.toLowerCase();
    return (
      student.name.toLowerCase().includes(queryLower) ||
      student.nis.toLowerCase().includes(queryLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Manajemen Siswa</h1>
            <p className="text-slate-400 mt-1">Kelola data murid, ekspor-impor data menggunakan CSV secara mandiri.</p>
          </div>
          {selectedClassId && (
            <Button
              onClick={openAddDialog}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer self-start sm:self-center"
            >
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </Button>
          )}
        </div>

        {/* Class Selector Dropdown */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900/30 p-4 border border-slate-800/50 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
            Pilih Kelas:
          </div>
          {isClassesLoading ? (
            <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
          ) : classes.length === 0 ? (
            <div className="text-sm text-slate-400">
              Belum ada kelas terdaftar.{' '}
              <a href="/classes" className="text-indigo-400 font-bold hover:underline">
                Buat kelas pertama Anda disini.
              </a>
            </div>
          ) : (
            <select
              className="bg-slate-950 border border-slate-800 rounded-xl text-white p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[200px] h-11"
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

        {/* CSV Import/Export Actions & Search Bar */}
        {selectedClassId && students.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center relative w-full max-w-xs">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cari nama atau NIS siswa..."
                className="pl-10 bg-slate-900/40 border-slate-800 text-white placeholder-slate-500 rounded-xl focus-visible:ring-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Import CSV Trigger */}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleCSVImport}
                disabled={isSubmitLoading}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitLoading}
                className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl cursor-pointer text-sm"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>

              {/* Export CSV Trigger */}
              <Button
                variant="outline"
                onClick={handleCSVExport}
                className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl cursor-pointer text-sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        )}

        {/* Notifications and Alerts for CSV */}
        {csvError && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            {csvError}
          </div>
        )}
        {csvSuccess && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
            {csvSuccess}
          </div>
        )}

        {/* Student List View */}
        {selectedClassId ? (
          isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-slate-400">Memuat data siswa...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <Card className="border-slate-800 bg-slate-900/20 border-dashed p-12 text-center max-w-2xl mx-auto">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 mb-4">
                <Users2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Belum Ada Siswa</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                {searchQuery
                  ? 'Tidak ada siswa yang cocok dengan kriteria pencarian Anda.'
                  : 'Anda dapat menginput siswa satu per satu secara manual atau mengunggah berkas CSV langsung.'}
              </p>

              {!searchQuery && (
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button
                    onClick={openAddDialog}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl cursor-pointer"
                  >
                    Tambah Siswa Manual
                  </Button>
                  
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleCSVImport}
                    disabled={isSubmitLoading}
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitLoading}
                    className="border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white rounded-xl cursor-pointer"
                  >
                    Unggah File CSV
                  </Button>
                </div>
              )}

              {/* CSV Template Helper */}
              {!searchQuery && (
                <div className="mt-8 text-left max-w-sm mx-auto p-4 border border-slate-800/80 rounded-xl bg-slate-950/40">
                  <p className="text-xs font-semibold text-slate-300 mb-1">Panduan Format Berkas CSV:</p>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Format file harus dipisahkan oleh koma (,) tanpa spasi berlebih. Baris pertama wajib merupakan nama kolom.
                  </p>
                  <pre className="mt-2 text-[10px] bg-slate-950 p-2 rounded text-indigo-400 overflow-x-auto select-all">
                    nis,name,parentName,parentPhone{'\n'}
                    1001,Andi Pratama,Budi Pratama,081234567890{'\n'}
                    1002,Citra Lestari,Dewi Lestari,081299998888
                  </pre>
                </div>
              )}
            </Card>
          ) : (
            <div className="border border-slate-800/50 bg-slate-900/20 backdrop-blur-xl rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-900/50">
                      <th className="py-4 px-6">NIS</th>
                      <th className="py-4 px-6">Nama Siswa</th>
                      <th className="py-4 px-6">Nama Wali Murid</th>
                      <th className="py-4 px-6">No. HP Wali Murid</th>
                      <th className="py-4 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200 text-sm">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4 px-6 font-medium text-indigo-400">{s.nis}</td>
                        <td className="py-4 px-6 font-bold">{s.name}</td>
                        <td className="py-4 px-6 text-slate-300">{s.parentName}</td>
                        <td className="py-4 px-6 text-slate-400">{s.parentPhone}</td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditDialog(s)}
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openDeleteDialog(s.id!)}
                              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <div className="text-center py-20 text-slate-400">
            Pilih kelas terlebih dahulu untuk mengelola daftar murid.
          </div>
        )}

        {/* Add / Edit Student Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="bg-slate-900/95 border-slate-900 backdrop-blur-xl text-white sm:max-w-md rounded-2xl border-t-slate-850">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{editingStudent ? 'Ubah Informasi Siswa' : 'Tambah Siswa Baru'}</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium text-xs">
                Lengkapi data siswa di bawah ini dengan benar.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nis" className="text-slate-300 font-semibold text-xs tracking-wide uppercase">Nomor Induk Siswa (NIS)</Label>
                <Input
                  id="nis"
                  placeholder="Contoh: 20260012"
                  className="bg-slate-950/40 border-slate-900 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 h-11 py-3 px-4 rounded-xl"
                  {...register('nis')}
                />
                {errors.nis && (
                  <p className="text-xs text-red-400 font-medium">{errors.nis.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300 font-semibold text-xs tracking-wide uppercase">Nama Lengkap Siswa</Label>
                <Input
                  id="name"
                  placeholder="Nama Lengkap Murid"
                  className="bg-slate-950/40 border-slate-900 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 h-11 py-3 px-4 rounded-xl"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-red-400 font-medium">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentName" className="text-slate-300 font-semibold text-xs tracking-wide uppercase">Nama Orang Tua / Wali</Label>
                <Input
                  id="parentName"
                  placeholder="Nama Ayah/Ibu/Wali Siswa"
                  className="bg-slate-950/40 border-slate-900 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 h-11 py-3 px-4 rounded-xl"
                  {...register('parentName')}
                />
                {errors.parentName && (
                  <p className="text-xs text-red-400 font-medium">{errors.parentName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentPhone" className="text-slate-300 font-semibold text-xs tracking-wide uppercase">Nomor HP / WhatsApp Wali</Label>
                <Input
                  id="parentPhone"
                  placeholder="Contoh: 08123456789"
                  className="bg-slate-950/40 border-slate-900 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 h-11 py-3 px-4 rounded-xl"
                  {...register('parentPhone')}
                />
                {errors.parentPhone && (
                  <p className="text-xs text-red-400 font-medium">{errors.parentPhone.message}</p>
                )}
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer rounded-xl h-10 px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer rounded-xl h-10 px-5 font-bold shadow-lg shadow-indigo-600/10"
                >
                  {isSubmitLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    'Simpan Siswa'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-800 text-white sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Hapus Data Siswa?
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Menghapus murid ini juga akan menghapus semua **catatan absensi** miliknya secara permanen dari Firestore. Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                Batal
              </Button>
              <Button
                onClick={handleDeleteStudent}
                disabled={isSubmitLoading}
                className="bg-red-600 hover:bg-red-500 text-white cursor-pointer"
              >
                {isSubmitLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
