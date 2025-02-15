'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { Button } from '@nextui-org/react';
import Jobs from '../components/Jobs';
import Image from 'next/image';
import { User } from '../types';

export default function CandidatePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery] = useState('');
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/');
      } else {
        setUser(user);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6">
          <div className="h-16 flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-white/60">TalentHub</span>
              <span className="text-white/40">/</span>
              <span className="text-white">Candidate</span>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {!avatarError && user?.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    width={32}
                    height={32}
                    className="rounded-full bg-white/5"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5"></div>
                )}
                <span className="text-white font-medium">{user.displayName}</span>
              </div>
              <Button
                className="bg-white/5 text-white hover:bg-white/10"
                size="sm"
                radius="full"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome back, {user.displayName?.split(' ')[0]}!
          </h1>
          <p className="text-white/60">
            Explore opportunities that match your expertise and aspirations.
          </p>
        </div>

        {/* Featured Positions */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-white">Featured Positions</h2>

          {/* Jobs Component */}
          <Jobs searchQuery={searchQuery} variant="candidate" />
        </div>
      </main>
    </div>
  );
} 