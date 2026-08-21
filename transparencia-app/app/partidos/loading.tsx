import { ListadoSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return <ListadoSkeleton title="Cargando partidos políticos..." cardsCount={6} />;
}
