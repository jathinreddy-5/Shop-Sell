import React from 'react';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function SellerLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
      <LoadingThreeDotsJumping label="Loading seller workspace" />
    </div>
  );
}
