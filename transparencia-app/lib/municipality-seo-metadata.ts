export interface MunicipalitySeoFacts {
  periodCount: number;
  budgetYear: number | null;
  populationCensusYear: number | null;
  hasVerifiedPurchases: boolean;
}

export function buildMunicipalitySeoMetadata(communeName: string, facts: MunicipalitySeoFacts) {
  const categories: string[] = [];
  if (facts.periodCount > 0) categories.push("Remuneraciones");
  if (facts.budgetYear !== null) categories.push("Presupuesto");
  if (facts.populationCensusYear !== null) categories.push("Censo");
  if (facts.hasVerifiedPurchases) categories.push("Compras públicas");

  const title = categories.length
    ? `Municipalidad de ${communeName}: ${categories.slice(0, 2).join(" y ")} | El Cambiómetro`
    : `Municipalidad de ${communeName} | Datos públicos | El Cambiómetro`;

  const availableData: string[] = [];
  if (facts.periodCount > 0) availableData.push(`remuneraciones municipales en ${facts.periodCount} períodos publicados`);
  if (facts.budgetYear !== null) availableData.push(`presupuesto SINIM ${facts.budgetYear}`);
  if (facts.populationCensusYear !== null) availableData.push(`población del Censo ${facts.populationCensusYear}`);
  if (facts.hasVerifiedPurchases) availableData.push("compras públicas vinculadas por RUT verificado");
  const description = availableData.length
    ? `Consulta datos de la Municipalidad de ${communeName}: ${availableData.join(", ")}. Revisa períodos, cifras y fuentes disponibles.`
    : `Consulta los datos públicos disponibles para la Municipalidad de ${communeName} y revisa sus fuentes.`;

  return { title, description };
}
