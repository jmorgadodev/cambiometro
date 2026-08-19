function normalized(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(?:ilustre|i)\.?\s+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function aliasesFor(comuna) {
  const name = normalized(comuna.nombre_comuna);
  const compactName = name.replace(/\s+/g, "");
  return [
    `municipalidad de ${name}`,
    `municipalidad ${name}`,
    `municipio de ${name}`,
    `municipio ${name}`,
    `municipalidad de ${compactName}`,
    `municipalidad ${compactName}`,
  ];
}

export function createMunicipalityRegistry(communes) {
  if (!Array.isArray(communes) || communes.length !== 346) {
    throw new Error(`MUNICIPALITY_CATALOG_INVALID: se esperaban 346 comunas y se recibieron ${communes?.length ?? 0}`);
  }

  const aliases = new Map();
  for (const commune of communes) {
    if (!commune.tiene_municipalidad_propia) continue;
    for (const alias of aliasesFor(commune)) aliases.set(alias, commune.id);
  }

  aliases.set("municipalidad de cabo de hornos y antartica", "muni-cabodehornos");
  aliases.set("municipalidad cabo de hornos y antartica", "muni-cabodehornos");
  aliases.set("municipalidad de navarino", "muni-cabodehornos");
  aliases.set("municipalidad de paihuano", "muni-paihuano");
  aliases.set("municipalidad de la calera", "muni-lacalera");
  aliases.set("municipalidad de marchigue", "muni-marchigue");
  aliases.set("municipalidad de marchige", "muni-marchigue");
  aliases.set("municipalidad de llay llay", "muni-llayllay");
  aliases.set("municipalidad de puerto natales", "muni-natales");
  aliases.set("municipalidad de trehuaco", "muni-treguaco");
  aliases.set("municipalidad de rapa nui", "muni-isladepascua");
  aliases.set("municipalidad de isla de pascua rapa nui", "muni-isladepascua");
  aliases.set("municipalidad de san vicente de tagua tagua", "muni-sanvicente");

  return {
    resolve(officialName) {
      const key = normalized(officialName);
      const keyWithoutParentheticalAlias = key.replace(/\s+\([^)]*\)$/, "").trim();
      const known = aliases.get(key) ?? aliases.get(keyWithoutParentheticalAlias);
      if (known) return known;
      if (/\bmunicipalidad\b|\bmunicipio\b/.test(key)) {
        throw new Error(`CPLT_UNKNOWN_MUNICIPALITY: ${officialName}`);
      }
      return null;
    },
  };
}
