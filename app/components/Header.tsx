'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { User } from '../types';

const getInitials = (name: string | null | undefined) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user);
      setAvatarError(false); // Reset error state when user changes
      
      if (user) {
        // Check if user is admin
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().isAdmin) {
          router.push('/admin');
        }
      }
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribe();
    };
  }, [router]);

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        if (userDoc.data().isAdmin) {
          router.push('/admin');
        } else {
          router.push('/candidate');
        }
      } else {
        router.push('/signup');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!mounted) {
    return null; // Return null on server-side and first render
  }

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'py-4 bg-black/80 backdrop-blur-lg' : 'py-6'}`}>
      <nav className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-red-500">Talent</span>Hub
          </Link>
          <div className="flex items-center gap-6">
            <Link href="#positions" className="text-gray-300 hover:text-white transition-colors">
              Positions
            </Link>
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  {!avatarError && user.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      width={32}
                      height={32}
                      className="rounded-full bg-white/5"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-medium">
                      {getInitials(user.displayName)}
                    </div>
                  )}
                  <span className="text-white font-medium hidden md:block">
                    {user.displayName || 'User'}
                  </span>
                </div>
                <Button 
                  className="bg-white/5 text-white hover:bg-white/10"
                  radius="full"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button 
                className="bg-red-500 hover:bg-red-600 text-white font-medium transition-all"
                radius="full"
                size="sm"
                onClick={handleSignIn}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
} 