import { Suspense } from 'react';
import { MobileClient } from './MobileClient';
import { PhoneFrame } from '../../../design/components/PhoneFrame';

export const metadata = { title: 'Mobile — Bosch Parcel Platform' };

export default function MobilePage() {
  return (
    <PhoneFrame label="Parcel Status — Mobile">
      <Suspense fallback={null}>
        <MobileClient />
      </Suspense>
    </PhoneFrame>
  );
}
