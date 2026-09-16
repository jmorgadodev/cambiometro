/**
 * Worker ETL histórico desactivado.
 *
 * La plataforma actual ingiere por workflows separados, valida releases y
 * publica desde R2. Este entrypoint se conserva como referencia histórica,
 * pero no debe consultar fuentes ni escribir D1/KV/R2. El retorno temprano
 * evita que una eventual ejecución manual vuelva a activar el pipeline
 * anterior.
 */

export interface Env {
  ENVIRONMENT?: string;
}

const worker = {
  async scheduled() {
    console.warn(
      "[ETL legacy] Worker congelado: use los workflows versionados con R2 como origen canónico.",
    );
  },
};

export default worker;
