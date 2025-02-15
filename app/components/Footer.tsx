'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Footer() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const year = new Date().getFullYear().toString();

  return (
    <footer className="py-12 bg-black/80 backdrop-blur-lg">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-8 md:mb-0">
            <Link href="/" className="text-2xl font-bold text-white flex items-center gap-2">
              Talent<span className="text-red-500">Hub</span>
            </Link>
            <p className="text-gray-400 mt-2">Find your next career opportunity</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8">
            <a href="https://tidyhire.app/privacy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Privacy</a>
            <a href="https://tidyhire.app/terms" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Terms</a>
            <a href="mailto:hari@tidyhire.app" className="text-gray-400 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-gray-400">
          {mounted && <p>© {year} TalentHub. All rights reserved.</p>}
        </div>
      </div>
    </footer>
  );
} 