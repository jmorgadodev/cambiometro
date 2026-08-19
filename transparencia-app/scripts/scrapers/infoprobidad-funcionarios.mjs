import fs from 'fs';
import path from 'path';
import { MUNICIPALIDADES_SEED } from '../../lib/municipalidades.ts';
import { fetchInfoProbidad } from '../etl/connectors/cplt.mjs';
import { readJsonIfPresent, writeFileAtomic } from '../etl/safe-file.mjs';

const outputRoot = path.join(process.cwd(), "data", "lake", "projections", "funcionarios-v1");

const normalizeStr = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
};

async function run() {
  console.log("Iniciando Extractor de Funcionarios Reales (InfoProbidad)...\n");
  fs.mkdirSync(outputRoot, { recursive: true });

  console.log("[Fase 1] Extrayendo lote de declaraciones (InfoProbidad)...");
  
  // Extraemos un bloque de declaraciones de Enero 2023
  // Usamos un pageSize pequeño para no demorar horas, pero suficiente para cientos de registros
  const records = await fetchInfoProbidad({ 
      from: '2024-03-01', 
      to: '2024-03-31', 
      pageSize: 5000, 
      concurrency: 2 
  });

  console.log(`[OK] Obtenidas ${records.length} declaraciones reales verificadas.`);

  // Mapear funcionarios a comunas
  const funcionariosPorComuna = {};
  
  for (const b of records) {
    if (!b.nombre) continue;

    const nombre = b.nombre;
    let muniName = "";
    
    // Buscar el nombre del organismo en las organizaciones
    if (b.organizations && b.organizations.length > 0) {
        muniName = b.organizations[0].name || "";
    } else if (b.declaracion && b.declaracion.Datos_Entidad_Por_La_Que_Declara) {
        muniName = b.declaracion.Datos_Entidad_Por_La_Que_Declara.Nombre_Entidad || "";
    }

    if (!muniName.toLowerCase().includes("municipalidad") && !muniName.toLowerCase().includes("comuna")) {
        continue; // Solo nos interesan municipalidades
    }

    const normalizedMuniName = normalizeStr(muniName);
    
    // Buscar la comuna correspondiente en nuestro SEED por coincidencia de substring
    let comuna = MUNICIPALIDADES_SEED.find(m => normalizedMuniName.includes(normalizeStr(m.nombre_comuna)));
    
    if (comuna) {
        if (!funcionariosPorComuna[comuna.id]) funcionariosPorComuna[comuna.id] = [];
        funcionariosPorComuna[comuna.id].push({
            id_funcionario: b.id,
            nombre_completo: nombre,
            organo_nombre: `Municipalidad de ${comuna.nombre_comuna}`,
            organo_tipo: "municipalidad",
            cargo: (b.declaracion && b.declaracion.Datos_Entidad_Por_La_Que_Declara) ? (b.declaracion.Datos_Entidad_Por_La_Que_Declara.Cargo_o_Funcion || "Funcionario/a Público") : "Funcionario/a Público",
            estamento: "Sujeto de Probidad",
            tipo_contrato: "Titular",
            remuneracion_bruta_mensual: 0, // No está en la declaración
            fecha_ingreso: b.date || "2023-01-01",
            horas_extras_mes_anterior: 0,
            remuneracion_liquida_mensual: 0,
            grado_eus: "N/A",
            formacion: "Declaración Probidad",
            region: comuna.region,
            observaciones: "Dato verificado vía InfoProbidad (Declaración de Intereses y Patrimonio).",
            fuente: "InfoProbidad / CPLT",
            fuente_periodo: b.period
        });
    }
  }

  let totalAgregados = 0;

  // Actualizar los JSON existentes
  for (const comuna of MUNICIPALIDADES_SEED) {
    const outPath = path.join(outputRoot, `${comuna.id}.json`);
    const existingRecords = readJsonIfPresent(outPath, []);

    const nuevosFuncionarios = funcionariosPorComuna[comuna.id] || [];
    
    // Evitar duplicados
    for (const c of nuevosFuncionarios) {
        if (!existingRecords.some(r => r.nombre_completo === c.nombre_completo)) {
            existingRecords.push(c);
            totalAgregados++;
        }
    }

    writeFileAtomic(outPath, JSON.stringify(existingRecords, null, 2), "utf8");
  }

  console.log("==========================================");
  console.log(`[Crawler] Fase 1 completada. Se añadieron ${totalAgregados} funcionarios (Alcaldes, Concejales, Directivos) reales a la base de datos.`);
  console.log("==========================================");
}

run().catch(console.error);
