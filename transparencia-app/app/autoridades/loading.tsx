import { Skeleton } from "@/components/ui/Skeleton";
export default function Loading() {
  return (
    <div className="container-main" style={{ padding: "1.5rem 0" }}>
      <Skeleton width="40%" height={24} />
    </div>
  );
}

