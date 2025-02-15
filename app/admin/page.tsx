'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Textarea, Table, TableHeader, TableBody, TableColumn, TableRow, TableCell, Chip } from '@nextui-org/react';
import { doc, getDoc, collection, addDoc, getDocs, query, where, onSnapshot, updateDoc, orderBy, limit } from 'firebase/firestore';
import Image from 'next/image';
import { User, FirestoreUser } from '../types';
import { SearchIcon } from '../components/icons/SearchIcon';

const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

interface JobFormData {
  clientName: string;
  positionName: string;
  numberOfPositions: string;
  expMin: string;
  expMax: string;
  location: string;
  techStack: string;
  domain: string;
}

interface ActivityItem {
  id: string;
  type: 'new_job' | 'new_user' | 'new_application';
  message: string;
  timestamp: string;
  data: {
    userName?: string;
    positionName?: string;
    userId?: string;
    jobId?: string;
  };
}

interface PlatformStats {
  totalUsers: number;
  activeJobs: number;
  applications: number;
}

interface ImportAlert {
  show: boolean;
  message: string;
  total: number;
  processed: number;
}

interface AdminPageState {
  view: 'dashboard' | 'users' | 'jobs';
  searchQuery: string;
}

interface Job {
  id: string;
  clientName: string;
  positionName: string;
  numberOfPositions: number;
  expMin: number;
  expMax: number;
  location: string;
  techStack: string[];
  domain: string;
  status: 'active' | 'inactive';
  createdAt: string;
  totalApplications: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeJobs: 0,
    applications: 0
  });
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobFormData, setJobFormData] = useState<JobFormData>({
    clientName: '',
    positionName: '',
    numberOfPositions: '',
    expMin: '',
    expMax: '',
    location: '',
    techStack: '',
    domain: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importAlert, setImportAlert] = useState<ImportAlert>({
    show: false,
    message: '',
    total: 0,
    processed: 0
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unsubscribeStats, setUnsubscribeStats] = useState<(() => void)[]>([]);
  const [pageState, setPageState] = useState<AdminPageState>({
    view: 'dashboard',
    searchQuery: ''
  });
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [updatingJob, setUpdatingJob] = useState<string | null>(null);
  const [jobsUnsubscribe, setJobsUnsubscribe] = useState<(() => void) | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');

  const updateApplicationCounts = useCallback(async () => {
    try {
      const updatedJobs = await Promise.all(
        jobs.map(async (job) => {
          const applicationsSnapshot = await getDocs(
            query(collection(db, 'applications'), where('jobId', '==', job.id))
          );
          return {
            ...job,
            totalApplications: applicationsSnapshot.size
          };
        })
      );
      setJobs(updatedJobs);
      setFilteredJobs(updatedJobs);
    } catch (error) {
      console.error('Error updating application counts:', error);
    }
  }, [jobs]);

  const setupRealtimeStats = useCallback(() => {
    // Cleanup previous listeners
    unsubscribeStats.forEach(unsubscribe => unsubscribe());
    
    try {
      // Real-time listener for users count
      const usersUnsubscribe = onSnapshot(
        query(collection(db, 'users'),
        where('isAdmin', '==', false)),
        (snapshot) => {
          setStats(prev => ({ ...prev, totalUsers: snapshot.size }));
        },
        (error) => {
          console.error('Error in users listener:', error);
        }
      );

      // Real-time listener for active jobs count
      const jobsUnsubscribe = onSnapshot(
        query(collection(db, 'jobs'),
        where('status', '==', 'active')),
        (snapshot) => {
          setStats(prev => ({ ...prev, activeJobs: snapshot.size }));
        },
        (error) => {
          console.error('Error in jobs listener:', error);
        }
      );

      // Real-time listener for applications count
      const applicationsUnsubscribe = onSnapshot(
        collection(db, 'applications'),
        (snapshot) => {
          setStats(prev => ({ ...prev, applications: snapshot.size }));
        },
        (error) => {
          console.error('Error in applications listener:', error);
        }
      );

      // Add activity listeners
      const activitiesUnsubscribe = onSnapshot(
        query(
          collection(db, 'activities'),
          orderBy('timestamp', 'desc'),
          limit(4)
        ),
        (snapshot) => {
          const activities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ActivityItem));
          setRecentActivities(activities);
        },
        (error) => {
          console.error('Error in activities listener:', error);
        }
      );

      // Store unsubscribe functions
      setUnsubscribeStats([usersUnsubscribe, jobsUnsubscribe, applicationsUnsubscribe, activitiesUnsubscribe]);
    } catch (error) {
      console.error('Error setting up real-time stats:', error);
    }
  }, [unsubscribeStats]);

  useEffect(() => {
    const checkAuth = async () => {
      const unsubscribe = auth.onAuthStateChanged(async (user) => {
        if (!user) {
          router.push('/');
        } else {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (!userDoc.exists() || !userDoc.data().isAdmin) {
            router.push('/candidate');
          } else {
            setUser(user);
            setupRealtimeStats();
            const usersUnsubscribe = setupUsersListener();
            setUnsubscribeStats(prev => [...prev, usersUnsubscribe]);
          }
        }
        setLoading(false);
      });

      return () => {
        unsubscribe();
        unsubscribeStats.forEach(unsubscribe => unsubscribe());
        if (jobsUnsubscribe) {
          jobsUnsubscribe();
        }
      };
    };

    checkAuth();
  }, [router, jobsUnsubscribe, setupRealtimeStats, unsubscribeStats]);

  const setupUsersListener = useCallback(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
      
      // Apply current search filter
      if (pageState.searchQuery) {
        const lowercaseQuery = pageState.searchQuery.toLowerCase();
        const filtered = usersData.filter(user => {
          const name = user.name?.toLowerCase() || '';
          const email = user.email?.toLowerCase() || '';
          return name.includes(lowercaseQuery) || email.includes(lowercaseQuery);
        });
        setFilteredUsers(filtered);
      } else {
        setFilteredUsers(usersData);
      }
    });
  }, [pageState.searchQuery]);

  const setupJobsListener = useCallback(() => {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];
      setJobs(jobsData);
      
      // Apply current search filter
      if (pageState.searchQuery) {
        const lowercaseQuery = pageState.searchQuery.toLowerCase();
        const filtered = jobsData.filter(job => {
          const positionName = job.positionName.toLowerCase();
          const clientName = job.clientName.toLowerCase();
          return positionName.includes(lowercaseQuery) || clientName.includes(lowercaseQuery);
        });
        setFilteredJobs(filtered);
      } else {
        setFilteredJobs(jobsData);
      }
    });
  }, [pageState.searchQuery]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = setupUsersListener();
    const jobsUnsub = setupJobsListener();

    return () => {
      unsubscribe();
      if (jobsUnsub) jobsUnsub();
    };
  }, [user, setupUsersListener, setupJobsListener]);

  useEffect(() => {
    if (jobs.length > 0 && pageState.view === 'jobs') {
      updateApplicationCounts();
    }
  }, [jobs.length, pageState.view, updateApplicationCounts]);

  const handleSearch = (query: string) => {
    setPageState(prev => ({ ...prev, searchQuery: query }));
    if (!users) return;
    const lowercaseQuery = query.toLowerCase();
    const filtered = users.filter(user => {
      const name = user.name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return name.includes(lowercaseQuery) || email.includes(lowercaseQuery);
    });
    setFilteredUsers(filtered);
  };

  useEffect(() => {
    if (!users || !pageState.searchQuery) {
      setFilteredUsers(users || []);
      return;
    }

    const lowercaseQuery = pageState.searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.name?.toLowerCase().includes(lowercaseQuery) ||
      user.email?.toLowerCase().includes(lowercaseQuery)
    );
    setFilteredUsers(filtered);
  }, [users, pageState.searchQuery]);

  const handleAdminToggle = async (userId: string | undefined, makeAdmin: boolean) => {
    if (!userId) return;
    setUpdatingUser(userId);
    try {
      await updateDoc(doc(db, 'users', userId), {
        isAdmin: makeAdmin
      });

      // Log the activity
      await addDoc(collection(db, 'activities'), {
        type: makeAdmin ? 'admin_granted' : 'admin_revoked',
        userId: userId,
        timestamp: new Date().toISOString(),
        message: `Admin status ${makeAdmin ? 'granted to' : 'revoked from'} user`
      });
    } catch (error) {
      console.error('Error updating admin status:', error);
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleJobVisibility = async (jobId: string, makeActive: boolean) => {
    if (updatingJob) return;
    setUpdatingJob(jobId);
    
    try {
      const jobRef = doc(db, 'jobs', jobId);
      await updateDoc(jobRef, {
        status: makeActive ? 'active' : 'inactive'
      });

      // Create activity for job status change
      const jobData = jobs.find(j => j.id === jobId);
      if (jobData?.positionName) {
        const timestamp = new Date().toISOString();
        const activityData = {
          type: 'new_job' as const,
          message: `Position: ${jobData.positionName} was ${makeActive ? 'activated' : 'deactivated'}`,
          timestamp,
          data: {
            positionName: jobData.positionName,
            jobId: jobRef.id
          }
        };
        await addDoc(collection(db, 'activities'), activityData);
      }
    } catch (error) {
      console.error('Error updating job status:', error);
    } finally {
      setUpdatingJob(null);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clean up all listeners
      unsubscribeStats.forEach(unsubscribe => unsubscribe());
      if (jobsUnsubscribe) {
        jobsUnsubscribe();
      }

      // Clear all state
      setUser(null);
      setJobs([]);
      setFilteredJobs([]);
      setUsers([]);
      setFilteredUsers([]);
      setRecentActivities([]);
      setStats({
        totalUsers: 0,
        activeJobs: 0,
        applications: 0
      });

      // Sign out from Firebase
      await signOut(auth);
      
      // Force redirect to home
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleJobSubmit = async () => {
    setSubmitting(true);
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Convert number fields
      const jobData = {
        ...jobFormData,
        numberOfPositions: parseInt(jobFormData.numberOfPositions),
        expMin: parseInt(jobFormData.expMin),
        expMax: parseInt(jobFormData.expMax),
        techStack: jobFormData.techStack.split(',').map(skill => skill.trim()),
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        status: 'active' as const,
        totalApplications: 0
      };

      const jobRef = await addDoc(collection(db, 'jobs'), jobData);
      
      // Create activity for new job
      await addDoc(collection(db, 'activities'), {
        type: 'new_job',
        message: `Position: ${jobData.positionName} was just posted`,
        timestamp: new Date().toISOString(),
        data: {
          positionName: jobData.positionName,
          jobId: jobRef.id
        }
      });
      
      // Reset form and close modal
      setJobFormData({
        clientName: '',
        positionName: '',
        numberOfPositions: '',
        expMin: '',
        expMax: '',
        location: '',
        techStack: '',
        domain: '',
      });
      setIsJobModalOpen(false);
    } catch (error) {
      console.error('Error creating job:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const processCSV = (text: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Split by newlines and handle both \r\n and \n
    const rows = text.split(/\r?\n/);
    
    // Parse headers using comma as separator
    const headers = rows[0].split(',').map(h => h.trim());
    const expectedHeaders = [
      'Client Name',
      'Position Name',
      'Min Exp',
      'Max Exp',
      'Location',
      'Tech Stack',
      'Domain',
      'Number of positions'
    ];

    // Validate headers
    if (headers.join('|') !== expectedHeaders.join('|')) {
      throw new Error('Invalid CSV format. Please ensure headers match the required format.');
    }

    // Parse the rows, handling quoted fields correctly
    const jobs = rows.slice(1)
      .filter(row => row.trim()) // Skip empty rows
      .map(row => {
        // Custom parsing to handle quoted fields with commas
        const values: string[] = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim()); // Push the last value
        
        // Remove quotes from values
        const cleanValues = values.map(v => v.replace(/^"(.*)"$/, '$1').trim());
        
        const maxExp = cleanValues[3] ? parseInt(cleanValues[3]) : NaN;
        
        return {
          clientName: cleanValues[0],
          positionName: cleanValues[1],
          expMin: parseInt(cleanValues[2] || '0'),
          expMax: maxExp,
          location: cleanValues[4],
          techStack: cleanValues[5].split(',').map(skill => skill.trim()),
          domain: cleanValues[6],
          numberOfPositions: parseInt(cleanValues[7] || '1'),
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          createdBy: user.uid,
          totalApplications: 0
        };
      });
    return jobs;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setImportAlert({
        show: true,
        message: 'Please upload a CSV file only.',
        total: 0,
        processed: 0
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const jobs = processCSV(text);
      
      setImportAlert({
        show: true,
        message: 'Importing jobs...',
        total: jobs.length,
        processed: 0
      });

      // Import jobs one by one
      for (let i = 0; i < jobs.length; i++) {
        await addDoc(collection(db, 'jobs'), jobs[i]);
        setImportAlert(prev => ({
          ...prev,
          processed: i + 1
        }));
      }

      // Show success message
      setImportAlert(prev => ({
        ...prev,
        message: `Successfully imported ${jobs.length} jobs!`
      }));

      // Auto close after 3 seconds
      setTimeout(() => {
        setImportAlert({
          show: false,
          message: '',
          total: 0,
          processed: 0
        });
        setIsImportModalOpen(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

      // Stats will update automatically through the listener
    } catch (error) {
      console.error('Error importing jobs:', error);
      setImportAlert({
        show: true,
        message: error instanceof Error ? error.message : 'Error importing jobs. Please try again.',
        total: 0,
        processed: 0
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) return null;
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
              <span className="text-red-500 font-medium">Admin</span>
            </div>

            {/* User Menu */}
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
                    {getInitials(user.displayName || '')}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-white font-medium">{user.displayName || 'User'}</span>
                  <span className="text-xs text-red-500">Administrator</span>
                </div>
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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-4">
              {pageState.view === 'dashboard' ? 'Admin Dashboard' : pageState.view === 'jobs' ? 'Job Management' : 'User Management'}
            </h1>
            <p className="text-white/60">
              {pageState.view === 'dashboard' 
                ? 'Manage your platform and user data'
                : pageState.view === 'jobs'
                ? 'Manage your job postings'
                : 'View and manage platform users'}
            </p>
          </div>
          {(pageState.view === 'users' || pageState.view === 'jobs') && (
            <Button
              className="bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
              size="sm"
              radius="full"
              onClick={() => setPageState(prev => ({ ...prev, view: 'dashboard' }))}
            >
              Back to Dashboard
            </Button>
          )}
        </div>

        {pageState.view === 'dashboard' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Stats Card */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Statistics</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-white/60 mb-1">Total Users</div>
                  <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Active Jobs</div>
                  <div className="text-2xl font-bold text-white">{stats.activeJobs}</div>
                </div>
                <div>
                  <div className="text-sm text-white/60 mb-1">Applications</div>
                  <div className="text-2xl font-bold text-white">{stats.applications}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200" 
                  size="sm"
                  onClick={() => setIsJobModalOpen(true)}
                >
                  Add New Job
                </Button>
                <Button 
                  className="w-full bg-white/5 text-white hover:bg-white/10 hover:border-red-500/50 border border-transparent transition-all duration-200" 
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                >
                  Import Jobs
                </Button>
                <Button 
                  className="w-full bg-white/5 text-white hover:bg-white/10 hover:border-red-500/50 border border-transparent transition-all duration-200" 
                  size="sm"
                  onClick={() => router.push('/admin/applicants')}
                >
                  View Applications
                </Button>
                <Button 
                  className="w-full bg-white/5 text-white hover:bg-white/10 hover:border-red-500/50 border border-transparent transition-all duration-200" 
                  size="sm"
                  onClick={() => setPageState(prev => ({ ...prev, view: 'users' }))}
                >
                  Manage Users
                </Button>
                <Button 
                  className="w-full bg-white/5 text-white hover:bg-white/10 hover:border-red-500/50 border border-transparent transition-all duration-200" 
                  size="sm"
                  onClick={() => router.push('/admin/jobs')}
                >
                  Manage Jobs
                </Button>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        activity.type === 'new_job' 
                          ? 'bg-green-500' 
                          : activity.type === 'new_user' 
                          ? 'bg-blue-500' 
                          : 'bg-yellow-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-white/80">{activity.message}</p>
                        {mounted && (
                          <p className="text-white/40 text-xs mt-1">
                            {new Date(activity.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-white/60 text-sm">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : pageState.view === 'jobs' ? (
          <div className="space-y-6">
            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Company Filter */}
              <select
                className="bg-white/5 text-white border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={selectedCompany}
                onChange={(e) => {
                  const newCompany = e.target.value;
                  setSelectedCompany(newCompany);
                  setSelectedPosition('all'); // Reset position when company changes
                  
                  // Apply company filter
                  let filtered = [...jobs];
                  if (newCompany !== 'all') {
                    filtered = filtered.filter(job => job.clientName === newCompany);
                  }
                  
                  // Apply search filter if exists
                  if (pageState.searchQuery) {
                    const lowercaseQuery = pageState.searchQuery.toLowerCase();
                    filtered = filtered.filter(job => 
                      job.positionName.toLowerCase().includes(lowercaseQuery)
                    );
                  }
                  
                  setFilteredJobs(filtered);
                }}
              >
                <option value="all" className="bg-black">All Companies</option>
                {Array.from(new Set(jobs.map(job => job.clientName))).sort().map(company => (
                  <option key={company} value={company} className="bg-black">
                    {company}
                  </option>
                ))}
              </select>

              {/* Position Filter */}
              <select
                className="bg-white/5 text-white border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
                value={selectedPosition}
                onChange={(e) => {
                  setSelectedPosition(e.target.value);
                  let filtered = jobs;
                  if (selectedCompany !== 'all') {
                    filtered = filtered.filter(job => job.clientName === selectedCompany);
                  }
                  if (e.target.value !== 'all') {
                    filtered = filtered.filter(job => job.positionName === e.target.value);
                  }
                  setFilteredJobs(filtered);
                }}
              >
                <option value="all" className="bg-black">All Positions</option>
                {Array.from(new Set(jobs
                  .filter(job => selectedCompany === 'all' || job.clientName === selectedCompany)
                  .map(job => job.positionName)))
                  .sort()
                  .map(position => (
                    <option key={position} value={position} className="bg-black">
                      {position}
                    </option>
                  ))}
              </select>

              {/* Search Bar */}
              <Input
                placeholder="Search positions..."
                value={pageState.searchQuery}
                onValueChange={(value) => {
                  setPageState(prev => ({ ...prev, searchQuery: value }));
                  let filtered = jobs;
                  if (selectedCompany !== 'all') {
                    filtered = filtered.filter(job => job.clientName === selectedCompany);
                  }
                  if (selectedPosition !== 'all') {
                    filtered = filtered.filter(job => job.positionName === selectedPosition);
                  }
                  if (value) {
                    const lowercaseQuery = (value || '').toLowerCase();
                    filtered = filtered.filter(job => 
                      job.positionName.toLowerCase().includes(lowercaseQuery)
                    );
                  }
                  setFilteredJobs(filtered);
                }}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 hover:bg-white/10",
                }}
              />
            </div>
            
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Position</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Domain</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Experience</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Applications</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-white/5">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{job.positionName}</div>
                          <div className="text-sm text-white/60">{job.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{job.clientName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white/60">{job.domain}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white/60">
                            {job.expMin}-{job.expMax || 'Any'} years
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white/60">{job.totalApplications}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            className={`text-white ${
                              job.status === 'active'
                                ? 'bg-green-500 hover:bg-green-600'
                                : 'bg-white/5 hover:bg-white/10'
                            } transition-colors duration-200`}
                            size="sm"
                            radius="full"
                            onClick={() => handleJobVisibility(job.id, job.status !== 'active')}
                            isLoading={updatingJob === job.id}
                            isDisabled={updatingJob !== null}
                          >
                            {job.status === 'active' ? 'Active' : 'Inactive'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-full max-w-md">
              <Input
                placeholder="Search by name or email..."
                value={pageState.searchQuery || ''}
                onValueChange={handleSearch}
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-white/5 hover:bg-white/10",
                }}
                startContent={
                  <SearchIcon className="text-white/50" />
                }
                description="Search users by their name or email address"
              />
            </div>
            
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Admin Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-white/5">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {user.avatarSrc ? (
                                <Image 
                                  src={user.avatarSrc} 
                                  alt={user.name || ''} 
                                  width={32}
                                  height={32}
                                  className="w-8 h-8 rounded-full bg-white/5"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    target.nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-medium ${user.avatarSrc ? 'hidden' : ''}`}>
                                {getInitials(user.name || '')}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-white">{user.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white/60">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white/60">
                              {mounted && user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Button
                              className={`text-white ${
                                user.isAdmin 
                                  ? 'bg-red-500 hover:bg-red-600' 
                                  : 'bg-white/5 hover:bg-white/10'
                              } transition-colors duration-200`}
                              size="sm"
                              radius="full"
                              onClick={() => handleAdminToggle(user.id, !user.isAdmin)}
                              isLoading={updatingUser === user.id}
                              isDisabled={updatingUser !== null}
                            >
                              {user.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-white/60">
                          {pageState.searchQuery ? 'No users found matching your search' : 'No users found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Job Modal */}
      <Modal 
        isOpen={isJobModalOpen} 
        onOpenChange={setIsJobModalOpen}
        size="2xl"
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-white">Add New Job</h2>
            <p className="text-sm text-white/60">Enter the job details below</p>
          </ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Client Name"
                placeholder="Enter client name"
                value={jobFormData.clientName}
                onChange={(e) => setJobFormData({ ...jobFormData, clientName: e.target.value })}
                classNames={{
                  label: "text-white/60",
                  input: "text-white",
                }}
              />
              <Input
                label="Position Name"
                placeholder="Enter position name"
                value={jobFormData.positionName}
                onChange={(e) => setJobFormData({ ...jobFormData, positionName: e.target.value })}
                classNames={{
                  label: "text-white/60",
                  input: "text-white",
                }}
              />
              <Input
                label="Number of Positions"
                placeholder="Enter number of positions"
                type="number"
                min="1"
                value={jobFormData.numberOfPositions}
                onChange={(e) => setJobFormData({ ...jobFormData, numberOfPositions: e.target.value })}
                classNames={{
                  label: "text-white/60",
                  input: "text-white",
                }}
              />
              <div className="flex gap-2">
                <Input
                  label="Min Experience (years)"
                  placeholder="Min"
                  type="number"
                  min="0"
                  value={jobFormData.expMin}
                  onChange={(e) => setJobFormData({ ...jobFormData, expMin: e.target.value })}
                  classNames={{
                    label: "text-white/60",
                    input: "text-white",
                  }}
                />
                <Input
                  label="Max Experience (years)"
                  placeholder="Max"
                  type="number"
                  min="0"
                  value={jobFormData.expMax}
                  onChange={(e) => setJobFormData({ ...jobFormData, expMax: e.target.value })}
                  classNames={{
                    label: "text-white/60",
                    input: "text-white",
                  }}
                />
              </div>
              <Input
                label="Location"
                placeholder="Enter location"
                value={jobFormData.location}
                onChange={(e) => setJobFormData({ ...jobFormData, location: e.target.value })}
                classNames={{
                  label: "text-white/60",
                  input: "text-white",
                }}
              />
              <Input
                label="Domain"
                placeholder="Enter domain"
                value={jobFormData.domain}
                onChange={(e) => setJobFormData({ ...jobFormData, domain: e.target.value })}
                classNames={{
                  label: "text-white/60",
                  input: "text-white",
                }}
              />
              <div className="md:col-span-2">
                <Textarea
                  label="Tech Stack"
                  placeholder="Enter skills separated by commas (e.g., React, Node.js, TypeScript)"
                  value={jobFormData.techStack}
                  onChange={(e) => setJobFormData({ ...jobFormData, techStack: e.target.value })}
                  classNames={{
                    label: "text-white/60",
                    input: "text-white",
                  }}
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={() => setIsJobModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleJobSubmit}
              isLoading={submitting}
            >
              Add Job
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Import Jobs Modal */}
      <Modal 
        isOpen={isImportModalOpen} 
        onOpenChange={setIsImportModalOpen}
        size="md"
        classNames={{
          base: "bg-black/90 border border-white/10",
          header: "border-b border-white/10",
          body: "py-6",
          footer: "border-t border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-white">Import Jobs</h2>
            <p className="text-sm text-white/60">Upload a CSV file with job details</p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/5">
                <h4 className="text-sm font-medium text-white mb-2">Required Headers:</h4>
                <p className="text-xs text-white/60">
                  Client • Position • Min Exp • Max Exp • Location • Tech Stack • Domain • Number of positions
                </p>
                <p className="text-xs text-white/60 mt-2">
                  Note: Max Exp is optional. Tech Stack should be comma-separated.
                </p>
              </div>
              
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                ref={fileInputRef}
                className="block w-full text-sm text-white/60
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-medium
                  file:bg-red-500 file:text-white
                  hover:file:bg-red-600
                  file:cursor-pointer"
              />

              {importAlert.show && (
                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-sm text-white mb-2">{importAlert.message}</p>
                  {importing && (
                    <p className="text-xs text-white/60">
                      Processed {importAlert.processed} of {importAlert.total} jobs
                    </p>
                  )}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={() => {
                setIsImportModalOpen(false);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              isDisabled={importing}
            >
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
} 