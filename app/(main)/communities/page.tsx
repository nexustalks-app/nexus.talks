import { Metadata } from 'next';
import { CommunitiesView } from '@/components/communities/communities-view';

export const metadata: Metadata = {
  title: 'Communities — Nexus.talks',
  description: 'Explore curated discussion spaces crafted around shared interests.',
};

export default function CommunitiesPage() {
  return <CommunitiesView />;
}
