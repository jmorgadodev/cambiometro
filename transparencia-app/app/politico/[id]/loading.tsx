import { SkeletonFicha } from "@/components/ui/Skeleton";
export default function Loading() {
  return (
    <div className="container-main">
      <h1 style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}>Cargando</h1>
      <SkeletonFicha />
    </div>
  );
}
