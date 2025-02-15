'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

const positions = [
  {
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'San Francisco, CA',
    type: 'Full-time',
    salary: '$120k - $180k',
    tags: ['React', 'TypeScript', 'Next.js'],
  },
  {
    title: 'Product Designer',
    company: 'DesignLabs',
    location: 'Remote',
    type: 'Full-time',
    salary: '$90k - $140k',
    tags: ['Figma', 'UI/UX', 'Design Systems'],
  },
  {
    title: 'DevOps Engineer',
    company: 'CloudTech',
    location: 'New York, NY',
    type: 'Full-time',
    salary: '$130k - $190k',
    tags: ['AWS', 'Kubernetes', 'CI/CD'],
  },
];

export default function Positions() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <section id="positions" className="py-24 bg-black/50 relative">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">
            Featured
            <span className="bg-gradient-to-r from-blue-500 to-blue-300 text-transparent bg-clip-text"> Positions</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto mb-8">
            Explore opportunities from leading companies
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <input
              type="text"
              placeholder="Search positions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 rounded-full bg-white/5 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </motion.div>

        {/* Position Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {positions.map((position, index) => (
            <motion.div
              key={position.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className="group"
            >
              <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 hover:border-blue-500/50 transition-all duration-300">
                <h3 className="text-xl font-semibold text-white mb-2">{position.title}</h3>
                <p className="text-gray-400 mb-4">{position.company}</p>
                
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {position.location}
                  </span>
                  <span>{position.type}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {position.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-green-400 font-medium">{position.salary}</span>
                  <button className="px-4 py-2 rounded-full bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors">
                    Apply Now
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
} 