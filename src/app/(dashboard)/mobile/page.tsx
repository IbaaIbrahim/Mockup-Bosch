import { Suspense } from 'react';
import { MobileClient } from './MobileClient';

export const metadata = { title: 'Mobile — Bosch Parcel Platform' };

export default function MobilePage() {
  return (
    <Suspense fallback={null}>
      <MobileClient />
    </Suspense>
  );
}
