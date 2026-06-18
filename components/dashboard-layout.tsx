'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuthStore } from '../hooks/useAuthStore';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  GraduationCap,
  Users2,
  CalendarCheck2,
  FileSpreadsheet,
  BrainCircuit,
  LogOut,
  Menu,
  X,
  School,
  User,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Manajemen Kelas', href: '/classes', icon: GraduationCap },
    { name: 'Manajemen Siswa', href: '/students', icon: Users2 },
    { name: 'Absensi Harian', href: '/attendance', icon: CalendarCheck2 },
    { name: 'Rekap Absensi', href: '/rekap', icon: FileSpreadsheet },
    { name: 'Analisis AI', href: '/analysis', icon: BrainCircuit },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/20 selection:text-indigo-300">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-[280px] md:flex-col md:fixed md:inset-y-0 border-r border-slate-800/40 bg-slate-950/80 backdrop-blur-md z-40">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo / Brand */}
          <div className="flex items-center h-16 px-6 border-b border-slate-800/30 gap-2.5">
            {!logoError ? (
              <Image
                src="/images/logo.png"
                alt="Logo Absenku Guru"
                width={36}
                height={36}
                className="object-contain rounded-lg"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/20 font-bold text-white text-sm">
                A
              </div>
            )}
            <span className="text-lg font-black tracking-tight text-white bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Absenku Guru
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-300 font-semibold'
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Profile Summary */}
          <div className="flex flex-col p-4 border-t border-slate-800/30 gap-3">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                <User className="h-5 w-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-semibold text-white truncate">{profile?.name || 'Guru'}</p>
                <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                  <School className="h-3 w-3 text-slate-600" />
                  {profile?.schoolName || 'Sekolah'}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer rounded-xl py-2 px-3 text-sm flex items-center h-10"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Keluar Akun
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-[280px]">
        {/* Mobile Header */}
        <header className="flex items-center justify-between h-16 px-6 border-b border-slate-900/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 md:hidden">
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
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-sm shadow-md shadow-indigo-600/20">
                A
              </div>
            )}
            <span className="text-lg font-black tracking-tight text-white">Absenku Guru</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-400 hover:text-white cursor-pointer rounded-xl"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden bg-slate-950/80 backdrop-blur-sm">
            <div className="fixed inset-y-0 left-0 w-[280px] border-r border-slate-800/40 bg-slate-950 p-6 flex flex-col justify-between shadow-2xl">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/30">
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
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white text-sm">
                        A
                      </div>
                    )}
                    <span className="text-lg font-bold text-white">Absenku Guru</span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-slate-400 hover:text-white cursor-pointer rounded-xl"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    const Icon = item.icon;
                    return (
                      <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                        <div
                          className={`flex items-center gap-3 px-3.5 py-2.5 text-[13px] font-medium rounded-lg transition-all duration-150 cursor-pointer ${
                            isActive
                              ? 'bg-indigo-500/10 text-indigo-300 font-semibold'
                              : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                          }`}
                        >
                          <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-indigo-300' : 'text-slate-400'}`} />
                          {item.name}
                        </div>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-400">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{profile?.name || 'Guru'}</p>
                    <p className="text-xs text-slate-500 truncate">{profile?.schoolName || 'Sekolah'}</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="ghost"
                  className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer rounded-xl py-2 px-3 text-sm flex items-center h-10"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Keluar Akun
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Content Wrapper */}
        <main className="flex-1 p-6 md:p-10 bg-slate-950">{children}</main>
      </div>
    </div>
  );
}
