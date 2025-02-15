'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, SelectItem } from '@nextui-org/react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

const getInitials = (name: string | null | undefined) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const explorationPhases = [
  { value: 'actively_looking', label: 'Actively Looking' },
  { value: 'open_to_opportunities', label: 'Open to Opportunities' },
  { value: 'casually_browsing', label: 'Casually Browsing' },
  { value: 'not_interested', label: 'Not Interested at the Moment' },
];

interface ProfileFormProps {
  user: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    phoneNumber: '',
    interestedRoles: '',
    explorationPhase: '',
    referralSource: '',
    linkedinUrl: '',
  });
  const [errors, setErrors] = useState({
    linkedinUrl: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateLinkedInUrl = (url: string) => {
    const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;
    return linkedinRegex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate LinkedIn URL
    if (!validateLinkedInUrl(formData.linkedinUrl)) {
      setErrors({
        ...errors,
        linkedinUrl: 'Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)',
      });
      setLoading(false);
      return;
    }

    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName,
        email: user.email,
        avatarSrc: user.photoURL,
        phoneNumber: formData.phoneNumber,
        interestedRoles: formData.interestedRoles,
        explorationPhase: formData.explorationPhase,
        referralSource: formData.referralSource,
        linkedinUrl: formData.linkedinUrl,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      });

      router.push('/candidate');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkedInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData({ ...formData, linkedinUrl: url });
    if (url && !validateLinkedInUrl(url)) {
      setErrors({
        ...errors,
        linkedinUrl: 'Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)',
      });
    } else {
      setErrors({
        ...errors,
        linkedinUrl: '',
      });
    }
  };

  if (!mounted) {
    return null; // Return null on server-side and first render
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        {user.photoURL && !avatarError ? (
          <Image
            src={user.photoURL}
            alt={user.displayName || 'Profile'}
            width={96}
            height={96}
            className="rounded-full bg-white/5"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl font-medium">
            {getInitials(user.displayName)}
          </div>
        )}
        <div>
          <h3 className="text-xl font-semibold text-white">{user.displayName || 'User'}</h3>
          <p className="text-white/60">{user.email}</p>
        </div>
      </div>

      <Input
        label="Phone Number"
        placeholder="e.g. +1234567890"
        value={formData.phoneNumber}
        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
        required
        classNames={{
          input: "text-white",
          label: "text-white/60",
        }}
      />

      <Input
        label="LinkedIn Profile URL"
        placeholder="https://linkedin.com/in/username"
        value={formData.linkedinUrl}
        onChange={handleLinkedInChange}
        errorMessage={errors.linkedinUrl}
        isInvalid={!!errors.linkedinUrl}
        required
        classNames={{
          input: "text-white",
          label: "text-white/60",
        }}
      />

      <Input
        label="What kind of roles are you interested in?"
        placeholder="e.g. Frontend Developer, Product Manager"
        value={formData.interestedRoles}
        onChange={(e) => setFormData({ ...formData, interestedRoles: e.target.value })}
        required
        classNames={{
          input: "text-white",
          label: "text-white/60",
        }}
      />

      <Select
        label="Where are you in your exploration phase?"
        placeholder="Select your current status"
        value={formData.explorationPhase}
        onChange={(e) => setFormData({ ...formData, explorationPhase: e.target.value })}
        required
        classNames={{
          value: "text-white",
          label: "text-white/60",
          trigger: "bg-white/5 data-[hover=true]:bg-white/10",
        }}
      >
        {explorationPhases.map((phase) => (
          <SelectItem key={phase.value} value={phase.value}>
            {phase.label}
          </SelectItem>
        ))}
      </Select>

      <Input
        label="How did you learn about TalentHub?"
        placeholder="e.g. LinkedIn, Referral, Search"
        value={formData.referralSource}
        onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
        required
        classNames={{
          input: "text-white",
          label: "text-white/60",
        }}
      />

      <Button
        type="submit"
        className="w-full bg-red-500 text-white h-12"
        radius="full"
        isLoading={loading}
        disabled={!!errors.linkedinUrl}
      >
        Complete Profile
      </Button>
    </form>
  );
} 