import { SkeletonTable } from "@/components/ui/Skeleton";
export default function Loading() {
  return <div className="container-main" style={{ padding: "1.5rem 0" }}><SkeletonTable rows={10} cols={3} /></div>;
}
