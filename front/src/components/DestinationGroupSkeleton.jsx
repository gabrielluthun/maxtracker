import { Skeleton } from "@/components/ui/skeleton";
import TrainCardSkeleton from "@/components/TrainCardSkeleton";

export default function DestinationGroupSkeleton({ withTrips = false }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden" data-testid="destination-group-skeleton">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-3 w-28 mt-2 rounded" />
          </div>
        </div>
        <Skeleton className="h-5 w-5 rounded shrink-0" />
      </div>
      {withTrips && (
        <div className="px-5 pb-5 space-y-3">
          <TrainCardSkeleton />
          <TrainCardSkeleton />
        </div>
      )}
    </div>
  );
}
