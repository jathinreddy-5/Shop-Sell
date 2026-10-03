'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import {
  OnboardingModal,
  MAX_ONBOARDING_SKIPS,
  REPROMPT_INTERVAL_DAYS,
} from './onboarding-modal';

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProfileAndEvaluate = useCallback(async () => {
    if (!user || !token) return;

    try {
      const res = await fetch('/api/profile/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const profile = await res.json();
      setProfileData(profile);

      // Evaluate whether to display the onboarding modal
      const status = profile.onboarding_status || 'not_started';
      const skippedCount = profile.onboarding_skipped_count || 0;
      const lastPromptedAt = profile.onboarding_last_prompted_at
        ? new Date(profile.onboarding_last_prompted_at).getTime()
        : 0;

      const now = Date.now();
      const daysSinceLastPrompt = (now - lastPromptedAt) / (1000 * 60 * 60 * 24);

      if (status === 'not_started') {
        setIsModalOpen(true);
      } else if (status !== 'completed' && skippedCount < MAX_ONBOARDING_SKIPS && daysSinceLastPrompt >= REPROMPT_INTERVAL_DAYS) {
        setIsModalOpen(true);
      }
    } catch {}
  }, [user, token]);

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
