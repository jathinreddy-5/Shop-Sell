import React from 'react';
import { LoadingThreeDotsJumping } from '@/components/loading';

export default function CheckoutLoading() {
  return (
    <div className="container mx-auto flex min-h-[50vh] items-center justify-center px-4 py-16">
      <LoadingThreeDotsJumping label="Loading checkout" />
    </div>
  );
}
