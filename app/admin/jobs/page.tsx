'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase/config';
import { signOut } from 'firebase/auth';
import {
  Button,
  Input,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
  Spinner,
  Textarea
} from '@nextui-org/react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, addDoc, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import { User } from '../../types';

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
  description: string;
  requiredSkills: string[];
}

interface JobFormData {
  clientName: string;
  positionName: string;
  location: string;
  expMin: string;
  expMax?: string;
  techStack: string;
  domain: string;
  numberOfPositions: string;
}

export default function JobManagementPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const { isOpen: isAddJobOpen, onOpen: onAddJobOpen, onClose: onAddJobClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [jobFormData, setJobFormData] = useState<JobFormData>({
    clientName: '',
    positionName: '',
    location: '',
    expMin: '',
    expMax: '',
    techStack: '',
    domain: '',
    numberOfPositions: ''
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof JobFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const applyFilters = useCallback((
    jobsData: Job[],
    search: string,
    company: string,
    position: string
  ) => {
    let filtered = [...jobsData];

    if (company !== 'all') {
      filtered = filtered.filter(job => job.clientName === company);
    }

    if (position !== 'all') {
      filtered = filtered.filter(job => job.positionName === position);
    }

    if (search) {
      const lowercaseQuery = search.toLowerCase();
      filtered = filtered.filter(job =>
        job.positionName.toLowerCase().includes(lowercaseQuery) ||
        job.clientName.toLowerCase().includes(lowercaseQuery) ||
        job.location.toLowerCase().includes(lowercaseQuery) ||
        job.techStack.some(tech => tech.toLowerCase().includes(lowercaseQuery))
      );
    }

    setFilteredJobs(filtered);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = '/';
        return;
      }
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Set up real-time listener for jobs
    const q = query(
      collection(db, 'jobs'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[];

      // Get application counts for each job
      const jobsWithApplications = await Promise.all(
        jobsData.map(async (job) => {
          const applicationsQuery = query(
            collection(db, 'applications'),
            where('jobId', '==', job.id)
          );
          const applicationsSnapshot = await getDocs(applicationsQuery);
          return {
            ...job,
            totalApplications: applicationsSnapshot.size
          };
        })
      );
      
      setJobs(jobsWithApplications);
      // Apply current filters to the new data
      applyFilters(jobsWithApplications, searchQuery, selectedCompany, selectedPosition);
    });

    return () => unsubscribe();
  }, [user, applyFilters, searchQuery, selectedCompany, selectedPosition]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(jobs, query, selectedCompany, selectedPosition);
  };

  const handleCompanyFilter = (company: string) => {
    setSelectedCompany(company);
    setSelectedPosition('all');
    applyFilters(jobs, searchQuery, company, 'all');
  };

  const handlePositionFilter = (position: string) => {
    setSelectedPosition(position);
    applyFilters(jobs, searchQuery, selectedCompany, position);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCompany('all');
    setSelectedPosition('all');
    setFilteredJobs(jobs);
  };

  const validateForm = () => {
    const errors: Partial<Record<keyof JobFormData, string>> = {};
    
    if (!jobFormData.clientName) errors.clientName = 'Company name is required';
    if (!jobFormData.positionName) errors.positionName = 'Position name is required';
    if (!jobFormData.location) errors.location = 'Location is required';
    if (!jobFormData.expMin) errors.expMin = 'Minimum experience is required';
    if (!jobFormData.domain) errors.domain = 'Domain is required';
    if (!jobFormData.techStack) errors.techStack = 'Tech stack is required';
    if (!jobFormData.numberOfPositions) errors.numberOfPositions = 'Number of positions is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddJob = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      // Create the job
      const jobData = {
        clientName: jobFormData.clientName,
        positionName: jobFormData.positionName,
        location: jobFormData.location,
        expMin: parseInt(jobFormData.expMin),
        expMax: jobFormData.expMax ? parseInt(jobFormData.expMax) : null,
        techStack: jobFormData.techStack.split(',').map(skill => skill.trim()),
        domain: jobFormData.domain,
        numberOfPositions: parseInt(jobFormData.numberOfPositions),
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        totalApplications: 0
      };

      // Add job to Firestore
      const jobRef = await addDoc(collection(db, 'jobs'), jobData);

      // Log activity
      await addDoc(collection(db, 'activities'), {
        type: 'new_job',
        message: `Added new position: ${jobData.positionName} at ${jobData.clientName}`,
        timestamp: new Date().toISOString(),
        data: {
          jobId: jobRef.id,
          positionName: jobData.positionName,
          clientName: jobData.clientName
        }
      });

      // Close modal and reset form
      onAddJobClose();
      setJobFormData({
        clientName: '',
        positionName: '',
        location: '',
        expMin: '',
        expMax: '',
        techStack: '',
        domain: '',
        numberOfPositions: ''
      });
    } catch (error) {
      console.error('Error adding job:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (jobId: string, currentStatus: 'active' | 'inactive') => {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: currentStatus === 'active' ? 'inactive' : 'active'
      });
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    
    try {
      // First, get all applications for this job
      const applicationsQuery = query(
        collection(db, 'applications'),
        where('jobId', '==', jobToDelete.id)
      );
      const applicationsSnapshot = await getDocs(applicationsQuery);

      // Delete all applications for this job
      await Promise.all(
        applicationsSnapshot.docs.map(doc => deleteDoc(doc.ref))
      );

      // Then delete the job itself
      await deleteDoc(doc(db, 'jobs', jobToDelete.id));

      // Update local state
      setJobs(prevJobs => prevJobs.filter(job => job.id !== jobToDelete.id));
      setFilteredJobs(prevJobs => prevJobs.filter(job => job.id !== jobToDelete.id));
      
      // Close the modal and reset the jobToDelete
      onDeleteClose();
      setJobToDelete(null);
    } catch (error) {
      console.error('Error deleting job and its applications:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Spinner size="lg" color="danger" />
      </div>
    );
  }

  const pages = Math.ceil(filteredJobs.length / rowsPerPage);
  const items = filteredJobs.slice((page - 1) * rowsPerPage, page * rowsPerPage);

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
                <span className="text-red-500 font-medium">Job Management</span>
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
              <Button
                className="bg-red-500 text-white"
                size="sm"
                radius="full"
                onClick={onAddJobOpen}
              >
                Add New Job
              </Button>
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
        {/* Filters */}
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              className="bg-white/5 text-white border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={selectedCompany}
              onChange={(e) => handleCompanyFilter(e.target.value)}
            >
              <option value="all" className="bg-black">All Companies</option>
              {Array.from(new Set(jobs.map(job => job.clientName))).sort().map(company => (
                <option key={company} value={company} className="bg-black">
                  {company}
                </option>
              ))}
            </select>

            <select
              className="bg-white/5 text-white border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500"
              value={selectedPosition}
              onChange={(e) => handlePositionFilter(e.target.value)}
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

            <Input
              placeholder="Search jobs..."
              value={searchQuery}
              onValueChange={handleSearch}
              classNames={{
                input: "text-white",
                inputWrapper: "bg-white/5 hover:bg-white/10",
              }}
            />

            <Button
              className="bg-white/5 text-white hover:bg-white/10"
              onClick={handleClearFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Jobs Table */}
        <Table
          aria-label="Jobs table"
          bottomContent={
            pages > 0 ? (
              <div className="flex w-full justify-center">
                <Pagination
                  isCompact
                  showControls
                  showShadow
                  color="primary"
                  page={page}
                  total={pages}
                  onChange={(page) => setPage(page)}
                />
              </div>
            ) : null
          }
          classNames={{
            wrapper: "bg-white/5 rounded-lg border border-white/10",
          }}
        >
          <TableHeader>
            <TableColumn>POSITION</TableColumn>
            <TableColumn>COMPANY</TableColumn>
            <TableColumn>LOCATION</TableColumn>
            <TableColumn>EXPERIENCE</TableColumn>
            <TableColumn>TECH STACK</TableColumn>
            <TableColumn>APPLICATIONS</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={
              <div className="text-white/60">No jobs found</div>
            }
          >
            {items.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="text-white font-medium">{job.positionName}</div>
                  <div className="text-white/60 text-sm">{job.domain}</div>
                </TableCell>
                <TableCell>
                  <div className="text-white">{job.clientName}</div>
                </TableCell>
                <TableCell>
                  <div className="text-white">{job.location}</div>
                </TableCell>
                <TableCell>
                  <div className="text-white">
                    {job.expMin}-{job.expMax || '∞'} years
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {job.techStack.slice(0, 3).map((tech, index) => (
                      <Chip
                        key={index}
                        size="sm"
                        className="bg-white/5 text-white"
                      >
                        {tech}
                      </Chip>
                    ))}
                    {job.techStack.length > 3 && (
                      <Chip
                        size="sm"
                        className="bg-white/5 text-white"
                      >
                        +{job.techStack.length - 3}
                      </Chip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-white">{job.totalApplications}</div>
                </TableCell>
                <TableCell>
                  <Chip
                    className={
                      job.status === 'active'
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                    }
                  >
                    {job.status}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        className="bg-white/5 text-white min-w-unit-16"
                        size="sm"
                      >
                        Actions
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      aria-label="Job actions"
                      className="bg-black/90 border border-white/10"
                    >
                      <DropdownItem
                        key="toggle"
                        className="text-white"
                        onClick={() => handleStatusToggle(job.id, job.status)}
                      >
                        {job.status === 'active' ? 'Deactivate' : 'Activate'}
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        className="text-red-500"
                        onClick={() => {
                          setJobToDelete(job);
                          onDeleteOpen();
                        }}
                      >
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </main>

      {/* Add Job Modal */}
      <Modal 
        isOpen={isAddJobOpen} 
        onOpenChange={onAddJobClose}
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
                errorMessage={formErrors.clientName}
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
                errorMessage={formErrors.positionName}
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
                errorMessage={formErrors.numberOfPositions}
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
                  errorMessage={formErrors.expMin}
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
                errorMessage={formErrors.location}
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
                errorMessage={formErrors.domain}
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
                  errorMessage={formErrors.techStack}
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
              onClick={onAddJobClose}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleAddJob}
              isLoading={submitting}
            >
              Add Job
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onOpenChange={onDeleteClose}
        size="sm"
        classNames={{
          base: "bg-black/90 border border-white/10",
        }}
      >
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalBody>
            <p className="text-white">
              Are you sure you want to delete this job? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={onDeleteClose}
            >
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={handleDeleteJob}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
} 