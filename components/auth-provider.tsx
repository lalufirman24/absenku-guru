'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore } from '../hooks/useAuthStore';
import { UserProfile } from '../types';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, setUser, setProfile, setLoading, clearAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile({ uid: firebaseUser.uid, ...docSnap.data() } as UserProfile);
          } else {
            console.warn('User profile does not exist in Firestore yet.');
            setProfile(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setProfile(null);
        }
      } else {
        clearAuth();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading, clearAuth]);

  useEffect(() => {
    if (loading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!user && !isPublicRoute) {
      // User is not logged in and tries to access a protected route
      router.push('/login');
    } else if (user && isPublicRoute) {
      // User is logged in and tries to access a login/register page
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  // Loading Screen dengan Animasi Modern
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="text-center space-y-4">
          <div className="relative flex justify-center items-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
            <div className="absolute h-8 w-8 animate-ping rounded-full bg-indigo-500/20"></div>
          </div>
          <p className="text-slate-400 font-medium tracking-wide animate-pulse">Menghubungkan ke Absenku Guru...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
