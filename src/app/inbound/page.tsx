import { InboundWizard } from './InboundWizard';
import { PhoneFrame } from '../../design/components/PhoneFrame';

export const metadata = { title: 'Inbound Registration — Bosch Parcel Platform' };

export default function InboundPage() {
  return (
    <PhoneFrame label="Inbound Registration">
      <InboundWizard />
    </PhoneFrame>
  );
}
