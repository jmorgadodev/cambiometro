import type { Metadata } from "next";
import { Suspense } from "react";
import GlobalSearchPage from "@/components/GlobalSearchPage";

export const metadata: Metadata = {
  title: "Buscador global — El Cambiómetro",
  description: "Busca personas, remuneraciones, municipalidades y organismos en registros públicos publicados.",
  alternates: { canonical: "/buscar" },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="container-main" aria-busy="true" />}>
      <GlobalSearchPage />
    </Suspense>
  );
}
