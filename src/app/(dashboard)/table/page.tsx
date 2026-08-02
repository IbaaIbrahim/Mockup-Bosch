import { Suspense } from 'react';
import { TableClient } from './TableClient';

export const metadata = { title: 'Table — Bosch Parcel Platform' };

export default function TablePage() {
  return (
    <Suspense fallback={null}>
      <TableClient />
    </Suspense>
  );
}
