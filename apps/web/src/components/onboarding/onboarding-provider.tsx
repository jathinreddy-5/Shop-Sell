'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  OnboardingModal,
  MAX_ONBOARDING_SKIPS,
  REPROMPT_INTERVAL_DAYS,
} from './onboarding-modal';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProfileAndEvaluate = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch('/api/profile/me');
      if (!res.ok) return;

      const profile = await res.json();
      setProfileData(profile);

      // Only display the onboarding modal if user has not completed it yet
      const status = profile.onboarding_status || 'not_started';
      if (status !== 'completed') {
        setIsModalOpen(true);
      } else {
        setIsModalOpen(false);
      }
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchProfileAndEvaluate();
  }, [fetchProfileAndEvaluate]);

  return (
    <>
      {children}
      {user && (
        <OnboardingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          currentUser={profileData || user}
          onComplete={() => {
            setIsModalOpen(false);
            fetchProfileAndEvaluate();
          }}
        />
      )}
    </>
  );
}
