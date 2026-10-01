import React from 'react';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function DemoTodayLoading() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-8">
      <LoadingThreeDotsJumping label="Loading Today spotlight" />
    </div>
  );
}
