import React from 'react';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function RootLoading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <LoadingThreeDotsJumping label="Loading page" />
    </div>
  );
}
