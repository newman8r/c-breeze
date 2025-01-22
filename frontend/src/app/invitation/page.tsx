import { Metadata } from 'next';
import InvitationForm from './InvitationForm';

export const metadata: Metadata = {
  title: 'Join Organization - Invitation',
  description: 'Accept your invitation and join the organization',
};

export default function InvitationPage() {
  return <InvitationForm />;
} 