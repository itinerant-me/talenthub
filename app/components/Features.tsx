'use client';

import { motion } from 'framer-motion';
import { Card, CardBody } from '@nextui-org/react';

const features = [
  {
    title: 'Smart Matching',
    description: 'AI-powered job matching that understands your skills and preferences',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: 'Real-time Updates',
    description: 'Get instant notifications for jobs that match your profile',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Career Insights',
    description: 'Access industry trends and salary insights for informed decisions',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-black/90 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-block mb-4">
            <div className="text-sm font-medium px-4 py-2 bg-white/5 backdrop-blur-lg rounded-full border border-white/10 text-blue-400">
              ⚡️ Supercharge Your Job Search
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Powerful Features for Your
            <span className="bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 text-transparent bg-clip-text"> Career Growth</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Discover tools and features designed to accelerate your career journey
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
            >
              <Card 
                className="bg-white/5 backdrop-blur-lg border-white/10 hover:border-blue-500/50 transition-all duration-300"
                shadow="none"
                isHoverable
              >
                <CardBody className="gap-3">
                  <div className="inline-block p-3 rounded-lg bg-blue-500/10 text-blue-400">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
} 