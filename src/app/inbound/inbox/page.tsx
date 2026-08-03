import { InboxClient } from './InboxClient';
import { PhoneFrame } from '../../../design/components/PhoneFrame';

export const metadata = { title: 'Inbox — Bosch Parcel Platform' };

export default function InboxPage() {
  return (
    <PhoneFrame label="Notification Inbox">
      <InboxClient />
    </PhoneFrame>
  );
}
