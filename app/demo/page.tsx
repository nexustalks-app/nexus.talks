import { DemoBanner } from '@/components/demo/demo-banner';
import { DemoView } from '@/components/demo/demo-view';

export const metadata = {
  title: 'Interactive Demo · Nexus.talks',
  description: 'Explore the Nexus.talks messaging experience with realistic sample conversations and zero account requirement.',
};

export default function DemoPage() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-porcelain">
      {/* Persistent Isolated Demo Banner */}
      <DemoBanner />

      {/* Main Interactive Demo Messenger Stage */}
      <DemoView />
    </div>
  );
}
