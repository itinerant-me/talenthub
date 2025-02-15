'use client';

import { useState } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Jobs from './components/Jobs';
import Footer from './components/Footer';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <main className="min-h-screen bg-black">
      <Header />
      <Hero onSearch={setSearchQuery} />
      <Jobs searchQuery={searchQuery} />
      <Footer />
    </main>
  );
} 