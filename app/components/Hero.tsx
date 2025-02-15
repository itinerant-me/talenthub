'use client';

import { motion } from 'framer-motion';
import { Button } from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { auth } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const verticals = [
  'SaaS', 'FinTech', 'AI/ML', 'Blockchain', 'Enterprise', 'Analytics', 'Cloud', 'Security'
];

export default function Hero() {
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user profile exists
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      if (userDoc.exists()) {
        router.push('/candidate');
      } else {
        router.push('/signup');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
    <section className="relative min-h-screen flex items-center pt-32 sm:pt-28 md:pt-0">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,0,0,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.8),transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      </div>
      
      <div className="container mx-auto px-4 md:px-6 relative">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-20 items-center">
          {/* Left Column - Hero Text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight mb-4 md:mb-6">
                TalentHub
                <span className="block mt-2 bg-gradient-to-r from-red-500 via-red-300 to-red-400 bg-clip-text text-transparent">
                  Where Tech Careers Evolve
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-white/70 mb-6 md:mb-8 max-w-xl">
                Connect with industry-leading companies across {verticals.length} verticals. 
                Discover roles that match your expertise and ambition.
              </p>

              <div className="flex flex-wrap gap-2 md:gap-3 mb-8 md:mb-12">
                {verticals.map((vertical, index) => (
                  <motion.div
                    key={vertical}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                  >
                    <div className="px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium bg-white/5 text-white/80 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-all duration-300">
                      {vertical}
                    </div>
                  </motion.div>
                ))}
              </div>

              <a href="#positions">
                <Button
                  size="lg"
                  radius="full"
                  className="bg-red-500 text-white h-12 md:h-14 px-8 md:px-12 text-base md:text-lg font-medium hover:bg-red-600 hover:scale-105 transition-all duration-300"
                >
                  Browse Opportunities
                </Button>
              </a>
            </motion.div>
          </motion.div>

          {/* Right Column - Sign Up Component */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-red-500/10 blur-3xl rounded-full" />
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/10 p-6 md:p-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">Join the Elite</h2>
                  <p className="text-sm md:text-base text-white/60">Access curated opportunities across top tech companies</p>
                </div>

                <div className="grid grid-cols-2 gap-4 md:gap-8 w-full mb-6 md:mb-8">
                  <div className="text-center p-3 md:p-4 rounded-xl bg-white/5">
                    <div className="text-2xl md:text-3xl font-bold text-red-400 mb-1">100+</div>
                    <div className="text-xs md:text-sm text-white/60">Tech Positions</div>
                  </div>
                  <div className="text-center p-3 md:p-4 rounded-xl bg-white/5">
                    <div className="text-2xl md:text-3xl font-bold text-red-400 mb-1">89%</div>
                    <div className="text-xs md:text-sm text-white/60">Success Rate</div>
                  </div>
                  <div className="text-center p-3 md:p-4 rounded-xl bg-white/5">
                    <div className="text-2xl md:text-3xl font-bold text-red-400 mb-1">48h</div>
                    <div className="text-xs md:text-sm text-white/60">Avg. Response</div>
                  </div>
                  <div className="text-center p-3 md:p-4 rounded-xl bg-white/5">
                    <div className="text-2xl md:text-3xl font-bold text-red-400 mb-1">56</div>
                    <div className="text-xs md:text-sm text-white/60">New Candidates This Week</div>
                  </div>
                </div>

                <Button
                  size="lg"
                  radius="full"
                  className="w-full bg-white text-black h-12 md:h-14 text-base md:text-lg font-medium hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-3"
                  onClick={handleSignIn}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
} 