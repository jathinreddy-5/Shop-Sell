import React from 'react';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
      <LoadingThreeDotsJumping label="Loading administration" />
    </div>
  );
}
