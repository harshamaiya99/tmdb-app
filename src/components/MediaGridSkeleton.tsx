import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
      {Array.from({ length: 12 }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-0">
          <Skeleton className="aspect-[2/3] w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}
