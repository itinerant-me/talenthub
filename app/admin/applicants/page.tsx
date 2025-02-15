'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase/config';
import { Button, Input, Chip, Modal, ModalContent } from '@nextui-org/react';
import { collection, query, getDocs, orderBy, getDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { SearchIcon } from '../../components/icons/SearchIcon';
import Image from 'next/image';
import { User } from '../../types';
import { signOut } from 'firebase/auth';

interface Application {
  id: string;
  userId: string;
  jobId: string;
  appliedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  user?: {
    name: string;
    email: string;
    phoneNumber: string;
    linkedinUrl: string;
    interestedRoles: string;
    explorationPhase: string;
    avatarSrc?: string;
  };
  job?: {
    positionName: string;
    clientName: string;
    domain: string;
  };
}

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application | null;
}

function SidePanel({ isOpen, onClose, application }: SidePanelProps) {
  const [avatarError, setAvatarError] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!application) return null;

  const getInitials = (name: string = '') => {
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  const handleStatusUpdate = async (newStatus: 'accepted' | 'rejected') => {
    if (!application || updating) return;
    
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'applications', application.id), {
        status: newStatus
      });
      
      // Close the panel after successful update
      onClose();
    } catch (error) {
      console.error('Error updating application status:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      placement="auto"
      classNames={{
        base: "w-full sm:w-[500px] h-full m-0 max-w-none rounded-none",
        wrapper: "justify-end",
        closeButton: "top-3 right-3",
      }}
      motionProps={{
        variants: {
          enter: {
            x: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            x: 20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        }
      }}
    >
      <ModalContent className="bg-black/90 border-l border-white/10">
        {() => (
          <div className="p-6 h-full overflow-y-auto">
            {/* Candidate Info */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                {application.user?.avatarSrc && !avatarError ? (
                  <Image 
                    src={application.user.avatarSrc} 
                    alt={application.user?.name} 
                    width={32}
                    height={32}
                    className="rounded-full bg-white/5"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl font-medium">
                    {getInitials(application.user?.name)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold text-white">{application.user?.name}</h3>
                  <p className="text-white/60">{application.user?.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Phone Number</label>
                  <p className="text-white">{application.user?.phoneNumber}</p>
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">LinkedIn Profile</label>
                  <a 
                    href={application.user?.linkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-red-400 hover:text-red-300"
                  >
                    View Profile
                  </a>
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Interested Roles</label>
                  <p className="text-white">{application.user?.interestedRoles}</p>
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Exploration Phase</label>
                  <p className="text-white">{application.user?.explorationPhase}</p>
                </div>
              </div>
            </div>

            {/* Application Info */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-white mb-4">Application Details</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-white/60 block mb-1">Position</label>
                  <p className="text-white">{application.job?.positionName}</p>
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Company</label>
                  <p className="text-white">{application.job?.clientName}</p>
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Domain</label>
                  <p className="text-white">{application.job?.domain}</p>
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Applied On</label>
                  <p className="text-white">
                    {new Date(application.appliedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-white/60 block mb-1">Status</label>
                  <Chip
                    className={`${
                      application.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : application.status === 'accepted'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                    size="sm"
                    radius="full"
                  >
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Chip>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-green-500 text-white"
                size="lg"
                radius="full"
                isDisabled={application.status === 'accepted' || updating}
                isLoading={updating && application.status !== 'accepted'}
                onClick={() => handleStatusUpdate('accepted')}
              >
                Accept
              </Button>
              <Button
                className="flex-1 bg-red-500 text-white"
                size="lg"
                radius="full"
                isDisabled={application.status === 'rejected' || updating}
                isLoading={updating && application.status !== 'rejected'}
                onClick={() => handleStatusUpdate('rejected')}
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </ModalContent>
    </Modal>
  );
}

export default function ApplicantsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState<Record<string, boolean>>({});
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [avatarError, setAvatarError] = useState(false);

  const getUniqueCompanies = () => {
    const companies = new Set<string>();
    applications.forEach(app => {
      if (app.job?.clientName) {
        companies.add(app.job.clientName);
      }
    });
    return Array.from(companies).sort();
  };

  const getUniquePositions = () => {
    const positions = new Set<string>();
    applications.forEach(app => {
      if (app.job?.positionName && 
          (selectedCompany === 'all' || app.job?.clientName === selectedCompany)) {
        positions.add(app.job.positionName);
      }
    });
    return Array.from(positions).sort();
  };

  const applyFilters = (search: string, company: string, position: string) => {
    let filtered = [...applications];
    
    // Apply company filter
    if (company !== 'all') {
      filtered = filtered.filter(app => app.job?.clientName === company);
    }
    
    // Apply position filter
    if (position !== 'all') {
      filtered = filtered.filter(app => app.job?.positionName === position);
    }
    
    // Apply search filter
    if (search) {
      const lowercaseQuery = search.toLowerCase();
      filtered = filtered.filter(app => 
        app.job?.positionName.toLowerCase().includes(lowercaseQuery) ||
        app.job?.clientName.toLowerCase().includes(lowercaseQuery) ||
        app.user?.name.toLowerCase().includes(lowercaseQuery) ||
        app.user?.email.toLowerCase().includes(lowercaseQuery)
      );
    }
    
    setFilteredApplications(filtered);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedCompany, selectedPosition);
  };

  const handleCompanyFilter = (company: string) => {
    setSelectedCompany(company);
    setSelectedPosition('all'); // Reset position when company changes
    applyFilters(searchQuery, company, 'all');
  };

  const handlePositionFilter = (position: string) => {
    setSelectedPosition(position);
    applyFilters(searchQuery, selectedCompany, position);
  };

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
            fetchApplications();
          }
        }
      });

      return () => unsubscribe();
    };

    checkAuth();
  }, [router]);

  const fetchApplications = async () => {
    try {
      // Get all applications
      const applicationsSnapshot = await getDocs(query(
        collection(db, 'applications'),
        orderBy('appliedAt', 'desc')
      ));

      // Get all unique user IDs and job IDs
      const userIds = new Set<string>();
      const jobIds = new Set<string>();
      applicationsSnapshot.forEach(doc => {
        const data = doc.data();
        userIds.add(data.userId);
        jobIds.add(data.jobId);
      });

      // Fetch all users and jobs in parallel
      const [usersSnapshot, jobsSnapshot] = await Promise.all([
        Promise.all(Array.from(userIds).map(userId => getDoc(doc(db, 'users', userId)))),
        Promise.all(Array.from(jobIds).map(jobId => getDoc(doc(db, 'jobs', jobId))))
      ]);

      // Create lookup maps
      const users = new Map();
      const jobs = new Map();
      usersSnapshot.forEach(doc => {
        if (doc.exists()) {
          users.set(doc.id, doc.data());
        }
      });
      jobsSnapshot.forEach(doc => {
        if (doc.exists()) {
          jobs.set(doc.id, doc.data());
        }
      });

      // Combine all data
      const applicationsData = applicationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          user: users.get(data.userId),
          job: jobs.get(data.jobId)
        };
      }) as Application[];

      setApplications(applicationsData);
      setFilteredApplications(applicationsData);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  // Add real-time updates listener
  useEffect(() => {
    const q = query(collection(db, 'applications'), orderBy('appliedAt', 'desc'));
    const unsubscribe = onSnapshot(q, () => {
      fetchApplications();
    });

    return () => unsubscribe();
  }, []);

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    setIsSidePanelOpen(true);
  };

  const getInitials = (name: string = '') => {
    return name.split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
  };

  const handleAvatarError = (userId: string) => {
    setAvatarErrors(prev => ({
      ...prev,
      [userId]: true
    }));
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white/60">TalentHub</span>
                <span className="text-white/40">/</span>
                <span className="text-red-500 font-medium">Applications</span>
              </div>
              <Button
                className="bg-white/5 text-white hover:bg-white/10"
                size="sm"
                radius="full"
                onClick={() => router.push('/admin')}
              >
                Back to Dashboard
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                {user?.photoURL && !avatarError ? (
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
                    {user?.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden md:block">
                  <div className="text-white font-medium">{user?.displayName}</div>
                  <div className="text-xs text-red-500">Administrator</div>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Applications</h1>
          <p className="text-white/60">View and manage candidate applications</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Company Filter */}
          <select
            className="bg-white/5 text-white border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={selectedCompany}
            onChange={(e) => handleCompanyFilter(e.target.value)}
          >
            <option value="all" className="bg-black">All Companies</option>
            {getUniqueCompanies().map(company => (
              <option key={company} value={company} className="bg-black">
                {company}
              </option>
            ))}
          </select>

          {/* Position Filter */}
          <select
            className="bg-white/5 text-white border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={selectedPosition}
            onChange={(e) => handlePositionFilter(e.target.value)}
          >
            <option value="all" className="bg-black">All Positions</option>
            {getUniquePositions().map(position => (
              <option key={position} value={position} className="bg-black">
                {position}
              </option>
            ))}
          </select>

          {/* Search Bar */}
          <Input
            placeholder="Search by position, company, or candidate..."
            value={searchQuery}
            onValueChange={(value) => handleSearch(value)}
            startContent={<SearchIcon className="text-white/50" />}
            classNames={{
              input: "text-white",
              inputWrapper: "bg-white/5 hover:bg-white/10",
            }}
          />
        </div>

        {/* Applications Table */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Applied On</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {application.user?.avatarSrc && !avatarErrors[application.userId] ? (
                          <Image 
                            src={application.user.avatarSrc} 
                            alt={application.user.name} 
                            width={32}
                            height={32}
                            className="rounded-full bg-white/5"
                            onError={() => handleAvatarError(application.userId)}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-medium">
                            {getInitials(application.user?.name)}
                          </div>
                        )}
                        <div className="ml-3">
                          <div className="text-sm font-medium text-white">{application.user?.name}</div>
                          <div className="text-sm text-white/60">{application.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{application.job?.positionName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{application.job?.clientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white/60">
                        {new Date(application.appliedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Chip
                        className={`${
                          application.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : application.status === 'accepted'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                        size="sm"
                        radius="full"
                      >
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </Chip>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        className="bg-white/5 text-white hover:bg-white/10"
                        size="sm"
                        radius="full"
                        onClick={() => handleViewDetails(application)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Panel */}
        <SidePanel
          isOpen={isSidePanelOpen}
          onClose={() => setIsSidePanelOpen(false)}
          application={selectedApplication}
        />
      </main>
    </div>
  );
} 