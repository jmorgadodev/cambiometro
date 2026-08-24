const base = process.argv[2] ?? "http://127.0.0.1:8788";
const routes = ["/", "/politico", "/municipalidades", "/servicios-publicos", "/entidades", "/transferencias", "/api/v1/health/data"];
const results = [];
for (const route of routes) {
  const started = performance.now();
  const response = await fetch(new URL(route, base));
  results.push({ route, status: response.status, ms: Math.round(performance.now() - started) });
  if (response.status >= 500) throw new Error(`${route} respondió ${response.status}`);
}
console.log(JSON.stringify(results));
