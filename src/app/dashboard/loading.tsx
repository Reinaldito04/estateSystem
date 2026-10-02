import { Skeleton } from "@/components/ui/skeleton";
import { StatCardsSkeleton, TableSkeleton } from "@/components/shared/skeletons";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <StatCardsSkeleton count={6} />
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
