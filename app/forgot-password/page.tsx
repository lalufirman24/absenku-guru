'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, { message: 'Email tidak boleh kosong' }).email({ message: 'Format email tidak valid' }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await sendPasswordResetEmail(auth, data.email);
      setSuccess('Tautan reset password telah dikirim ke email Anda. Silakan periksa kotak masuk atau folder spam Anda.');
      setIsLoading(false);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Email tidak terdaftar atau tidak ditemukan.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Terlalu banyak permintaan. Silakan coba lagi nanti.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Format email tidak valid.');
      } else {
        setError('Terjadi kesalahan koneksi. Silakan coba lagi.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 sm:px-6 lg:px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-slate-950 to-slate-950 font-sans">
      {/* Background glow design */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="flex flex-col items-center text-center space-y-3">
          {!logoError ? (
            <Image
              src="/images/logo.png"
              alt="Logo Absenku Guru"
              width={96}
              height={96}
              className="object-contain rounded-2xl shadow-lg shadow-indigo-600/10"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/30">
              <span className="text-xl font-extrabold tracking-wider">A</span>
            </div>
          )}
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
              Absenku Guru
            </h2>
            <p className="text-sm text-slate-400 font-medium">
              Aplikasi absensi modern & terintegrasi AI untuk Guru Indonesia
            </p>
          </div>
        </div>

        <Card className="border-slate-900 bg-slate-900/40 backdrop-blur-xl shadow-2xl rounded-2xl border-t-slate-800/80">
          <CardHeader className="space-y-1.5 pb-6">
            <CardTitle className="text-xl font-extrabold text-white">Reset Kata Sandi</CardTitle>
            <CardDescription className="text-slate-400 font-medium text-xs">
              Masukkan email Anda untuk menerima tautan pemulihan kata sandi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-4 py-2 text-center">
                <div className="flex justify-center">
                  <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white">Email Terkirim</h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {success}
                  </p>
                </div>
                <div className="mt-4">
                  <Link href="/login" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Kembali ke Login
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-semibold text-red-400">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 font-semibold text-xs tracking-wide uppercase">Email Pengajar</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@sekolah.sch.id"
                      className="pl-10 h-11 bg-slate-950/40 border-slate-900 text-slate-200 placeholder-slate-600 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 rounded-xl"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengirim Tautan...
                    </>
                  ) : (
                    <>
                      Kirim Link Reset
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
          {!success && (
            <CardFooter className="justify-center border-t border-slate-900/60 py-4.5">
              <Link href="/login" className="flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Halaman Login
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
