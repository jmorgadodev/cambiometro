import fs from 'fs';
import path from 'path';
import { MUNICIPALIDADES_SEED } from '../../lib/municipalidades.ts';
import { fetchInfoProbidad } from '../etl/connectors/cplt.mjs';
import { readJsonIfPresent, writeFileAtomic } from '../etl/safe-file.mjs';

const outputRoot = path.join(process.cwd(), "data", "lake", "projections", "funcionarios-v1");

const normalizeStr = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log("Iniciando Extractor por Lotes (InfoProbidad 2024)...");
  fs.mkdirSync(outputRoot, { recursive: true });

  const months = [
      { start: '2024-01-01', end: '2024-01-31' },
      { start: '2024-02-01', end: '2024-02-28' },
      { start: '2024-03-01', end: '2024-03-15' }, // Split March because it has many records
      { start: '2024-03-16', end: '2024-03-31' },
      { start: '2024-04-01', end: '2024-04-30' },
      { start: '2024-05-01', end: '2024-05-31' },
      { start: '2024-06-01', end: '2024-06-30' },
      { start: '2024-07-01', end: '2024-07-31' },
      { start: '2024-08-01', end: '2024-08-31' },
      { start: '2024-09-01', end: '2024-09-30' },
      { start: '2024-10-01', end: '2024-10-31' },
      { start: '2024-11-01', end: '2024-11-30' },
      { start: '2024-12-01', end: '2024-12-31' },
  ];

  let totalAgregadosGlobal = 0;

  for (const { start, end } of months) {
      console.log(`\n[Lote] Descargando desde ${start} hasta ${end}...`);
      try {
          const records = await fetchInfoProbidad({ 
              from: start, 
              to: end, 
              pageSize: 500, // Small page size for safety
              concurrency: 1 
          });

          console.log(`[Lote] Obtenidas ${records.length} declaraciones reales verificadas.`);

          const funcionariosPorComuna = {};
          
          for (const b of records) {
              if (!b.person || !b.person.name) continue;

              const nombre = b.person.name;
              let muniName = "";
              let comuna = null;
              
              if (b.publicBodies) {
                  for (const pb of b.publicBodies) {
                      const pbName = pb.name || "";
                      if (!pbName.toLowerCase().includes("municipalidad") && !pbName.toLowerCase().includes("comuna")) continue;
                      
                      const normalizedMuniName = normalizeStr(pbName);
                      comuna = MUNICIPALIDADES_SEED.find(m => normalizedMuniName.includes(normalizeStr(m.nombre_comuna)));
                      if (comuna) {
                          muniName = pbName;
                          break;
                      }
                  }
              }
              
              if (!comuna && b.declaracion && b.declaracion.Datos_Entidad_Por_La_Que_Declara) {
                  const pbName = b.declaracion.Datos_Entidad_Por_La_Que_Declara.Nombre_Entidad || "";
                  if (pbName.toLowerCase().includes("municipalidad") || pbName.toLowerCase().includes("comuna")) {
                      const normalizedMuniName = normalizeStr(pbName);
                      comuna = MUNICIPALIDADES_SEED.find(m => normalizedMuniName.includes(normalizeStr(m.nombre_comuna)));
                      if (comuna) muniName = pbName;
                  }
              }

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
                      remuneracion_bruta_mensual: 0,
                      fecha_ingreso: b.fecha || "2024-01-01",
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

          let agregadosEnLote = 0;

          // Actualizar los JSON por comuna inmediatamente
          for (const comunaId in funcionariosPorComuna) {
              const outPath = path.join(outputRoot, `${comunaId}.json`);
              let existingRecords = [];
              try {
                  existingRecords = readJsonIfPresent(outPath, []);
              } catch {
                  existingRecords = [];
              }

              const nuevos = funcionariosPorComuna[comunaId];
              for (const c of nuevos) {
                  if (!existingRecords.some(r => r.nombre_completo === c.nombre_completo)) {
                      existingRecords.push(c);
                      agregadosEnLote++;
                  }
              }

              writeFileAtomic(outPath, JSON.stringify(existingRecords, null, 2), "utf8");
          }

          totalAgregadosGlobal += agregadosEnLote;
          console.log(`[Lote] Añadidos ${agregadosEnLote} funcionarios municipales en este lote.`);

      } catch (err) {
          console.error(`[Error Lote] Falló la extracción para ${start} - ${end}:`, err.message);
      }

      // Throttling: Pausar 5 segundos antes del siguiente lote para no saturar al Estado
      console.log(`[Throttling] Esperando 5 segundos antes del próximo lote...`);
      await delay(5000);
  }

  console.log("==========================================");
  console.log(`[Extracción Finalizada] Se añadieron un total de ${totalAgregadosGlobal} funcionarios reales.`);
  console.log("==========================================");
}

run().catch(console.error);
