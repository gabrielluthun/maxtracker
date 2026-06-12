import { Skeleton } from "@/components/ui/skeleton";

export default function TrainCardSkeleton() {
  return (
    <div
      className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col sm:flex-row"
      data-testid="train-card-skeleton"
    >
      <Skeleton className="sm:w-2 h-2 sm:h-auto rounded-none" />
      <div className="flex-1 p-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-4 sm:items-center">
        <div>
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-4 w-32 mt-2 rounded" />
        </div>
        <div className="hidden sm:flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-10 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
        <div className="sm:text-right">
          <Skeleton className="h-3 w-14 sm:ml-auto rounded" />
          <Skeleton className="h-8 w-20 sm:ml-auto mt-1 rounded-lg" />
          <Skeleton className="h-4 w-36 sm:ml-auto mt-2 rounded" />
        </div>
        <div className="flex sm:flex-col items-start sm:items-end gap-2">
          <Skeleton className="h-6 w-24 rounded" />
          <Skeleton className="h-10 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
