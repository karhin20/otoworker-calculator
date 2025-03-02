import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const LoadingSkeleton = ({ rows = 5, columns = 7, className }: LoadingSkeletonProps) => {
  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      {/* Header skeleton */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="h-8 bg-gray-200 rounded"></div>
        ))}
      </div>

      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={`cell-${rowIndex}-${colIndex}`} className="h-10 bg-gray-100 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  );
}; 