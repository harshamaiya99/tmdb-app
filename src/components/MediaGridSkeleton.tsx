import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 min-[360px]:grid-cols-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
      {Array.from({ length: 12 }).map((_, i) => (
        <Card key={i} className="overflow-hidden border-0">
          <Skeleton className="aspect-[2/3] w-full" />
          <div className="flex flex-col gap-1 p-2.5">
            <div className="flex h-[30px] flex-col justify-between py-0.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-2.5 w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}
