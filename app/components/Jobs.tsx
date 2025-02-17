'use client';

import { motion } from 'framer-motion';
import { Card, CardBody, Chip, Button, Input, Tabs, Tab, Modal, ModalContent, ModalBody } from '@nextui-org/react';
import { useState, useEffect } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { collection, query, where, orderBy, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface Job {
  id: string;
  clientName: string;
  positionName: string;
  location: string;
  expMin: number;
  expMax: number;
  techStack: string[];
  domain: string;
  status: 'active' | 'inactive';
  totalApplications: number;
  createdAt: string;
  numberOfPositions: number;
}

interface JobsProps {
  searchQuery?: string;
  variant?: 'landing' | 'candidate';
}

export default function Jobs({ searchQuery: externalSearchQuery, variant = 'landing' }: JobsProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery || '');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState('all');
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  // Fetch user's applications
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const fetchApplications = async () => {
      const applicationsQuery = query(
        collection(db, 'applications'),
        where('userId', '==', user.uid)
      );

      const snapshot = await getDocs(applicationsQuery);
      const applied: Record<string, boolean> = {};
      snapshot.forEach(doc => {
        applied[doc.data().jobId] = true;
      });
      setAppliedJobs(applied);
    };

    fetchApplications();
  }, []);

  useEffect(() => {
    // Set up real-time listener for active jobs
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('status', '==', 'active'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      setJobs(jobsData);
      setFilteredJobs(jobsData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchQuery || selectedView !== 'all') {
      const query = searchQuery.toLowerCase();
      let filtered = jobs;

      // Apply search filter
      if (searchQuery) {
        filtered = filtered.filter(job => 
          job.positionName.toLowerCase().includes(query) ||
          job.clientName.toLowerCase().includes(query) ||
          job.techStack.some(skill => skill.toLowerCase().includes(query)) ||
          job.domain.toLowerCase().includes(query)
        );
      }

      // Apply view filter
      if (selectedView === 'new') {
        // Show jobs created in the last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        filtered = filtered.filter(job => new Date(job.createdAt) > oneDayAgo);
      } else if (selectedView === 'applied') {
        filtered = filtered.filter(job => appliedJobs[job.id]);
      }

      setFilteredJobs(filtered);
    } else {
      setFilteredJobs(jobs);
    }
  }, [searchQuery, jobs, selectedView, appliedJobs]);

  const renderSkills = (skills: string[]) => {
    const displaySkills = skills.slice(0, 3);
    const remainingCount = skills.length - 3;

    return (
      <div className="flex flex-wrap gap-2">
        {displaySkills.map((skill) => (
          <Chip
            key={skill}
            size="sm"
            className="bg-gradient-to-b from-black/80 to-black/90 text-white/90 hover:bg-red-500/10 hover:text-red-400 transition-colors border border-white/10 shadow-sm"
            radius="full"
            startContent={
              <div className="w-1 h-1 rounded-full bg-red-400/50 ml-0.5" />
            }
          >
            {skill}
          </Chip>
        ))}
        {remainingCount > 0 && (
          <Chip
            size="sm"
            className="bg-gradient-to-b from-black/80 to-black/90 text-white/90 border border-white/10 shadow-sm"
            radius="full"
          >
            +{remainingCount} more
          </Chip>
        )}
      </div>
    );
  };

  const formatExperience = (min: number, max?: number) => {
    if (!max) return `${min}+ years`;
    return `${min}-${max} years`;
  };

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
    } finally {
      setIsSignInModalOpen(false);
    }
  };

  const handleApply = async (jobId: string) => {
    const user = auth.currentUser;
    if (!user) {
      setIsSignInModalOpen(true);
      return;
    }

    setApplying(jobId);
    try {
      // Create application record
      await addDoc(collection(db, 'applications'), {
        userId: user.uid,
        jobId: jobId,
        appliedAt: new Date().toISOString(),
        status: 'pending'
      });

      // Create activity record
      await addDoc(collection(db, 'activities'), {
        type: 'new_application',
        userId: user.uid,
        jobId: jobId,
        timestamp: new Date().toISOString(),
        message: `New application for ${jobs.find(j => j.id === jobId)?.positionName}`
      });

      // Update local state
      setAppliedJobs(prev => ({
        ...prev,
        [jobId]: true
      }));
    } catch (error) {
      console.error('Error applying for job:', error);
    } finally {
      setApplying(null);
    }
  };

  return (
    <>
      <section id="positions" className={variant === 'landing' ? "py-12 md:py-24 relative" : "relative"}>
        {variant === 'landing' && (
          <>
            <div className="absolute inset-0 bg-black" />
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
          </>
        )}
        
        <div className="container mx-auto px-4 md:px-6 relative">
          <div className="max-w-7xl mx-auto">
            {variant === 'landing' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="mb-8 md:mb-16"
              >
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-8 md:mb-12">
                  Featured
                  <span className="bg-gradient-to-r from-red-500 to-red-300 bg-clip-text text-transparent"> Positions</span>
                </h2>

                <div className="max-w-2xl mx-auto px-4 md:px-0">
                  <Input
                    classNames={{
                      base: "h-12 md:h-14",
                      mainWrapper: "h-12 md:h-14",
                      input: "text-base text-white",
                      inputWrapper: [
                        "h-12 md:h-14",
                        "bg-white/5",
                        "hover:bg-white/5",
                        "group-data-[focused=true]:bg-white/5",
                        "!cursor-text",
                        "border-white/10",
                        "group-data-[focused=true]:border-red-500/50",
                      ].join(" "),
                    }}
                    placeholder="Search by role, skill, or domain..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                    startContent={<SearchIcon className="text-white/50" />}
                    size="lg"
                  />
                </div>
              </motion.div>
            )}

            {variant === 'candidate' && (
              <div className="mb-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <Input
                      classNames={{
                        base: "h-10",
                        mainWrapper: "h-10",
                        input: "text-sm text-white",
                        inputWrapper: [
                          "h-10",
                          "bg-white/5",
                          "hover:bg-white/5",
                          "group-data-[focused=true]:bg-white/5",
                          "!cursor-text",
                          "border-white/10",
                          "group-data-[focused=true]:border-red-500/50",
                        ].join(" "),
                      }}
                      placeholder="Search positions..."
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                      startContent={<SearchIcon className="text-white/50" />}
                      size="sm"
                    />
                  </div>
                  <Tabs 
                    selectedKey={selectedView}
                    onSelectionChange={(key) => {
                      setSelectedView(key.toString());
                      setSearchQuery(''); // Clear search when changing views
                    }}
                    classNames={{
                      base: "w-full sm:w-auto",
                      tabList: "bg-white/5 p-0.5 h-10",
                      cursor: "bg-red-500",
                      tab: "text-white/60 h-8 px-4 data-[selected=true]:text-white",
                    }}
                    radius="full"
                    size="sm"
                  >
                    <Tab 
                      key="all" 
                      title={
                        <div className="flex items-center gap-2">
                          <span>All Positions</span>
                          <Chip size="sm" className="bg-white/10 text-white text-xs">
                            {jobs.length}
                          </Chip>
                        </div>
                      }
                    />
                    <Tab 
                      key="new" 
                      title={
                        <div className="flex items-center gap-2">
                          <span>New</span>
                          <Chip size="sm" className="bg-white/10 text-white text-xs">
                            {jobs.filter(job => {
                              const oneDayAgo = new Date();
                              oneDayAgo.setDate(oneDayAgo.getDate() - 1);
                              return new Date(job.createdAt) > oneDayAgo;
                            }).length}
                          </Chip>
                        </div>
                      }
                    />
                    <Tab 
                      key="applied" 
                      title={
                        <div className="flex items-center gap-2">
                          <span>Applied</span>
                          <Chip size="sm" className="bg-white/10 text-white text-xs">
                            {Object.keys(appliedJobs).length}
                          </Chip>
                        </div>
                      }
                    />
                  </Tabs>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  className="h-[320px] md:h-[360px] w-full"
                >
                  <Card 
                    className="group h-full w-full bg-black/80 backdrop-blur-xl border border-white/10 hover:border-red-500/50 transition-all duration-300 overflow-hidden"
                    shadow="none"
                    isPressable={false}
                  >
                    <CardBody className="p-4 md:p-6 flex flex-col h-full relative">
                      {/* Background Gradient Effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-red-500/0 via-transparent to-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Domain Section - Top */}
                      <div className="mb-3 md:mb-4">
                        <Chip
                          className="bg-gradient-to-r from-black/80 to-black/90 text-red-400 border border-red-500/20 font-medium shadow-sm"
                          radius="full"
                          size="sm"
                          startContent={
                            <div className="flex items-center gap-2">
                              <svg className="w-3 md:w-3.5 h-3 md:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                              </svg>
                              <span className="text-white/70 font-normal text-xs md:text-sm">Company Domain:</span>
                            </div>
                          }
                        >
                          {job.domain}
                        </Chip>
                      </div>

                      {/* Title and Location Section */}
                      <div className="mb-3 md:mb-4">
                        <h3 className="text-lg md:text-xl font-semibold text-white mb-2 md:mb-3 line-clamp-1 group-hover:text-red-400 transition-colors duration-300">
                          {job.positionName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs md:text-sm text-white/70">
                          <svg className="w-3.5 md:w-4 h-3.5 md:h-4 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          <span className="line-clamp-1">{job.location}</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3 md:mb-4" />

                      {/* Experience Section */}
                      <div className="mb-3 md:mb-4">
                        <div className="flex items-center gap-2 text-xs md:text-sm text-white/70">
                          <svg className="w-3.5 md:w-4 h-3.5 md:h-4 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatExperience(job.expMin, job.expMax)}</span>
                          <span className="mx-2">•</span>
                          <svg className="w-3.5 md:w-4 h-3.5 md:h-4 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                          </svg>
                          <span>{job.numberOfPositions} {job.numberOfPositions === 1 ? 'Position' : 'Positions'}</span>
                        </div>
                      </div>

                      {/* Skills Section */}
                      <div className="mb-auto">
                        <div className="flex items-center gap-2 text-xs md:text-sm text-white/70 mb-2 md:mb-3">
                          <svg className="w-3.5 md:w-4 h-3.5 md:h-4 text-red-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                          </svg>
                          <span>Required Skills</span>
                        </div>
                        {renderSkills(job.techStack)}
                      </div>

                      {/* Button Section */}
                      <Button
                        className={`w-full ${
                          appliedJobs[job.id]
                            ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-black/80 to-black/90 text-white hover:bg-red-500 hover:from-red-500 hover:to-red-600'
                        } transition-all duration-300 h-10 md:h-12 mt-3 md:mt-4 shadow-lg shadow-black/5 text-sm md:text-base`}
                        radius="full"
                        isDisabled={appliedJobs[job.id]}
                        isLoading={applying === job.id}
                        onClick={() => handleApply(job.id)}
                        endContent={
                          appliedJobs[job.id] ? (
                            <svg className="w-3.5 md:w-4 h-3.5 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3.5 md:w-4 h-3.5 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          )
                        }
                      >
                        {appliedJobs[job.id] ? 'Already Applied' : 'Express Interest'}
                      </Button>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredJobs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/60 text-lg mb-4">No positions found matching your criteria</p>
                <Button
                  className="bg-white/5 text-white hover:bg-red-500"
                  onClick={() => setSearchQuery('')}
                  radius="full"
                >
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Sign In Modal */}
      <Modal 
        isOpen={isSignInModalOpen} 
        onOpenChange={setIsSignInModalOpen}
        size="lg"
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalBody className="flex flex-col items-center text-center py-12">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Join Our Elite Tech Community!</h2>
            <p className="text-white/60 mb-8 max-w-md">
              You&apos;re one step away from accessing exclusive tech opportunities! Sign up now to express interest, track your applications, and connect with leading tech companies.
            </p>
            <div className="w-full max-w-sm space-y-6">
              <Button
                size="lg"
                radius="full"
                className="w-full bg-white text-black h-14 text-lg font-medium hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-3"
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
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 text-white/40 bg-black/90">Already have an account?</span>
                </div>
              </div>
              <Button
                size="lg"
                radius="full"
                className="w-full bg-white/5 text-white h-14 text-lg font-medium hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3"
                onClick={handleSignIn}
              >
                Sign in here
              </Button>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
} 