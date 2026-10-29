import { Skeleton } from '@/components/ui/skeleton';

export default function ConversationLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Header bar skeleton */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-stone px-4 sm:px-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32 rounded" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>
      </div>

      {/* Bubble skeletons */}
      <div className="flex flex-1 flex-col justify-end gap-3 px-5 py-6 sm:px-8">
        {[
          { own: false, w: 'w-48' },
          { own: true,  w: 'w-64' },
          { own: false, w: 'w-56' },
          { own: true,  w: 'w-40' },
        ].map((b, i) => (
          <div key={i} className={`flex ${b.own ? 'justify-end' : 'justify-start'}`}>
            <Skeleton
              className={`h-10 rounded-2xl ${b.w} ${b.own ? 'bg-wine/15' : 'bg-stone/50'}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
