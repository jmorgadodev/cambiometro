import { ListadoSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <ListadoSkeleton title="Cargando rankings de remuneraciones y gastos..." cardsCount={6} />;
}
