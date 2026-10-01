import React from 'react';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function AccountLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8">
      <LoadingThreeDotsJumping label="Loading account" />
    </div>
  );
}
