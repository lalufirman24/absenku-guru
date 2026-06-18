'use client';

import React, { useEffect, useState } from 'react';
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
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  FolderOpen,
  AlertTriangle
} from 'lucide-react';
import { ClassRoom } from '../../types';

const classSchema = z.object({
  name: z.string().min(2, { message: 'Nama kelas minimal 2 karakter' }),
  grade: z.string().min(1, { message: 'Pilih tingkatan kelas' }),
});

type ClassFormValues = z.infer<typeof classSchema>;

export default function ClassesPage() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
  });

  const fetchClasses = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const q = query(collection(db, 'classes'), where('teacherId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const fetchedClasses: ClassRoom[] = [];
      querySnapshot.forEach((docSnap) => {
        fetchedClasses.push({ id: docSnap.id, ...docSnap.data() } as ClassRoom);
      });
      // Urutkan berdasarkan waktu dibuat
      fetchedClasses.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setClasses(fetchedClasses);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [user]);

  const openAddDialog = () => {
    setEditingClass(null);
    reset({ name: '', grade: '' });
    setIsOpen(true);
  };

  const openEditDialog = (classRoom: ClassRoom) => {
    setEditingClass(classRoom);
    setValue('name', classRoom.name);
    setValue('grade', classRoom.grade);
    setIsOpen(true);
  };

  const onSubmit = async (data: ClassFormValues) => {
    if (!user) return;
    setIsSubmitLoading(true);

    try {
      if (editingClass) {
        // Edit Mode
        const docRef = doc(db, 'classes', editingClass.id!);
        await updateDoc(docRef, {
          name: data.name,
          grade: data.grade,
        });
      } else {
        // Add Mode
        await addDoc(collection(db, 'classes'), {
          teacherId: user.uid,
          name: data.name,
          grade: data.grade,
          createdAt: new Date().toISOString(),
        });
      }
      setIsOpen(false);
      fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const openDeleteDialog = (classId: string) => {
    setDeletingClassId(classId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteClass = async () => {
    if (!deletingClassId) return;
    setIsSubmitLoading(true);
    try {
      // 1. Delete Class Document
      await deleteDoc(doc(db, 'classes', deletingClassId));

      // 2. Cascade delete students belonging to this class
      const studentsQuery = query(collection(db, 'students'), where('classId', '==', deletingClassId));
      const studentsSnap = await getDocs(studentsQuery);
      
      const batch = writeBatch(db);
      studentsSnap.forEach((stdDoc) => {
        batch.delete(stdDoc.ref);
      });

      // 3. Cascade delete attendance records of this class
      const attQuery = query(collection(db, 'attendance'), where('classId', '==', deletingClassId));
      const attSnap = await getDocs(attQuery);
      attSnap.forEach((attDoc) => {
        batch.delete(attDoc.ref);
      });

      await batch.commit();

      setIsDeleteDialogOpen(false);
      setDeletingClassId(null);
      fetchClasses();
    } catch (error) {
      console.error('Error deleting class and cascading records:', error);
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const filteredClasses = classes.filter((classRoom) => {
    const queryLower = searchQuery.toLowerCase();
    return (
      classRoom.name.toLowerCase().includes(queryLower) ||
      classRoom.grade.toLowerCase().includes(queryLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Manajemen Kelas</h1>
            <p className="text-slate-400 mt-1">Buat dan kelola daftar kelas mengajar Anda.</p>
          </div>
          <Button
            onClick={openAddDialog}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-4 py-2 flex items-center gap-2 cursor-pointer self-start sm:self-center"
          >
            <Plus className="h-4 w-4" />
            Tambah Kelas
          </Button>
        </div>

        {/* Search & Statistics Bar */}
        <div className="flex items-center relative w-full max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Cari berdasarkan nama kelas atau tingkatan..."
            className="pl-10 bg-slate-900/40 border-slate-800 text-white placeholder-slate-500 rounded-xl focus-visible:ring-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Classes Table / Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-slate-400">Memuat data kelas...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/20 border-dashed p-12 text-center max-w-2xl mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 mb-4">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Belum Ada Kelas</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
              {searchQuery
                ? 'Tidak ada kelas yang cocok dengan kata kunci pencarian Anda.'
                : 'Mulai dengan menambahkan kelas pertama Anda untuk menampung data siswa dan melacak absensi.'}
            </p>
            {!searchQuery && (
              <Button
                onClick={openAddDialog}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl cursor-pointer"
              >
                Tambah Kelas Sekarang
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((classRoom) => (
              <Card
                key={classRoom.id}
                className="border-slate-800/50 bg-slate-900/40 backdrop-blur-xl rounded-2xl relative overflow-hidden group hover:border-indigo-500/20 transition-all flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Kelas {classRoom.grade}
                    </span>
                    <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(classRoom)}
                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openDeleteDialog(classRoom.id!)}
                        className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold text-white mt-3 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-slate-400" />
                    {classRoom.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Dibuat pada {new Date(classRoom.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Add / Edit Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="bg-slate-900/95 border-slate-900 backdrop-blur-xl text-white sm:max-w-md rounded-2xl border-t-slate-850">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{editingClass ? 'Ubah Informasi Kelas' : 'Tambah Kelas Baru'}</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium text-xs">
                Lengkapi formulir di bawah ini untuk menyimpan data kelas.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300 font-semibold text-xs tracking-wide uppercase">Nama Kelas</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Kelas 10 MIPA 1, Kelas 3 B"
                  className="bg-slate-950/40 border-slate-900 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 h-11 py-3 px-4 rounded-xl"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-red-400 font-medium">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade" className="text-slate-300 font-semibold text-xs tracking-wide uppercase">Tingkat Kelas</Label>
                <select
                  id="grade"
                  className="w-full bg-slate-950/40 border border-slate-900 rounded-xl text-slate-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 h-11 cursor-pointer"
                  {...register('grade')}
                >
                  <option value="" className="bg-slate-950">-- Pilih Tingkat --</option>
                  <option value="SD" className="bg-slate-950">SD (Sekolah Dasar)</option>
                  <option value="SMP" className="bg-slate-950">SMP (Sekolah Menengah Pertama)</option>
                  <option value="SMA" className="bg-slate-950">SMA (Sekolah Menengah Atas)</option>
                  <option value="SMK" className="bg-slate-950">SMK (Sekolah Menengah Kejuruan)</option>
                </select>
                {errors.grade && (
                  <p className="text-xs text-red-400 font-medium">{errors.grade.message}</p>
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
                    'Simpan Kelas'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-xl border-slate-800/50 text-white sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Hapus Kelas?
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Tindakan ini tidak dapat dibatalkan. Menghapus kelas akan menghapus semua **data siswa** dan **catatan absensi** yang berada di bawah kelas ini secara permanen dari Firestore.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer rounded-xl"
              >
                Batal
              </Button>
              <Button
                onClick={handleDeleteClass}
                disabled={isSubmitLoading}
                className="bg-red-600 hover:bg-red-500 text-white cursor-pointer rounded-xl"
              >
                {isSubmitLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menghapus...
                  </>
                ) : (
                  'Ya, Hapus Semua'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
