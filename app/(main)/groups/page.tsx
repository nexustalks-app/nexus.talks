import { Metadata } from 'next';
import { GroupsView } from '@/components/groups/groups-view';

export const metadata: Metadata = {
  title: 'Groups — Nexus.talks',
  description: 'Collaborative team circles, project channels, and interest groups.',
};

export default function GroupsPage() {
  return <GroupsView />;
}
