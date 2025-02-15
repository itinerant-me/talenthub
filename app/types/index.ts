import { User as FirebaseUser } from 'firebase/auth';

export interface FirestoreUser {
  id: string;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
  createdAt: string;
  avatarSrc?: string | null;
  phoneNumber?: string | null;
  linkedinUrl?: string | null;
  interestedRoles?: string | null;
  explorationPhase?: string | null;
}

export interface User extends FirebaseUser {
  id?: string;
  name?: string | null;
  isAdmin?: boolean;
  createdAt?: string;
  avatarSrc?: string | null;
  linkedinUrl?: string | null;
  interestedRoles?: string | null;
  explorationPhase?: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  avatarSrc?: string;
  phoneNumber?: string;
  linkedinUrl?: string;
  interestedRoles?: string;
  explorationPhase?: string;
} 