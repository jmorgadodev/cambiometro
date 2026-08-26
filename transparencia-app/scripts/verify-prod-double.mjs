import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_DELAY_MS = 10 * 60 * 1000;

export function parseDelayMs(value = process.env.VERIFY_SECOND_DELAY_MS) {
  if (value === undefined || value === "") return DEFAULT_DELAY_MS;
  const delayMs = Number(value);
  if (!Number.isInteger(delayMs) || delayMs < 0) {
    throw new Error("VERIFY_SECOND_DELAY_MS debe ser un entero >= 0.");
  }
  return delayMs;
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export function runVerificationPass(passNumber) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL("./verify-prod-full.mjs", import.meta.url))], {
      env: { ...process.env, VERIFY_PASS: String(passNumber) },
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`verify-prod-full pasada ${passNumber} terminó con código ${code ?? "null"}${signal ? ` (${signal})` : ""}.`));
    });
  });
}

export async function runDoubleVerification({ delayMs = parseDelayMs() } = {}) {
  console.log(`=== verify-prod-full: pasada 1/2 (${new Date().toISOString()}) ===`);
  await runVerificationPass(1);
  console.log(`=== verify-prod-full: esperando ${delayMs} ms para la pasada 2/2 ===`);
  await sleep(delayMs);
  console.log(`=== verify-prod-full: pasada 2/2 (${new Date().toISOString()}) ===`);
  await runVerificationPass(2);
  console.log("=== verify-prod-full: ambas pasadas verdes ===");
}

if (process.argv[1]?.endsWith("verify-prod-double.mjs")) {
  runDoubleVerification().catch((error) => {
    console.error("Doble verificación fallida:", error.message);
    process.exitCode = 1;
  });
}
