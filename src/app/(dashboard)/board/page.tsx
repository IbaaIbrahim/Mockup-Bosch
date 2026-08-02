import { Suspense } from 'react';
import { BoardClient } from './BoardClient';

export const metadata = { title: 'Board — Bosch Parcel Platform' };

export default function BoardPage() {
  return (
    <Suspense fallback={null}>
      <BoardClient />
    </Suspense>
  );
}
