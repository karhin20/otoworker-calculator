import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string;
  variant?: "table" | "card" | "text" | "circle";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  ...props
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  const baseStyle = "animate-pulse rounded-md bg-gray-200";
  
  let variantStyle = "";
  
  switch (variant) {
    case "table":
      variantStyle = "h-10 w-full";
      break;
    case "card":
      variantStyle = "h-40 w-full";
      break;
    case "text":
      variantStyle = "h-4 w-3/4";
      break;
    case "circle":
      variantStyle = "h-12 w-12 rounded-full";
      break;
  }
  
  const style = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      className={cn(baseStyle, variantStyle, className)}
      style={style}
      {...props}
    />
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center space-x-4 py-4">
      {Array(columns)
        .fill(null)
        .map((_, index) => (
          <Skeleton
            key={index}
            className={index === 0 ? "w-1/6" : "flex-1"}
            height={16}
          />
        ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 py-2">
        {Array(columns)
          .fill(null)
          .map((_, index) => (
            <Skeleton
              key={index}
              className={index === 0 ? "w-1/6" : "flex-1"}
              height={12}
              variant="table"
            />
          ))}
      </div>
      {Array(rows)
        .fill(null)
        .map((_, index) => (
          <TableRowSkeleton key={index} columns={columns} />
        ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton variant="card" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
