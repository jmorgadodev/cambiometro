import fetch from "node-fetch";

const munis = [
  { name: "Maipú (maipu.cl)", url: "https://www.maipu.cl" },
  { name: "Maipú (municipalidadmaipu.cl)", url: "https://www.municipalidadmaipu.cl" },
  { name: "Santiago", url: "https://www.munistgo.cl" },
  { name: "Las Condes", url: "https://www.lascondes.cl" },
  { name: "Antofagasta", url: "https://www.municipalidadantofagasta.cl" },
  { name: "Punta Arenas", url: "https://www.puntaarenas.cl" },
  { name: "Cabo de Hornos (admin Antártica)", url: "https://www.imcabodehornos.cl" }
];

async function run() {
  for (const m of munis) {
    try {
      const res = await fetch(m.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml"
        }
      });
      const html = await res.text();
      console.log(`\n=== ${m.name} (${m.url}) ===`);
      const regex = /href=["']([^"']*(?:facebook|instagram|twitter|x\.com|youtube)[^"']*)["']/gi;
      let match;
      const links = new Set();
      while ((match = regex.exec(html)) !== null) {
        links.add(match[1]);
      }
      console.log(Array.from(links));
    } catch (e) {
      console.log(`Error for ${m.name}:`, e.message);
    }
  }
}

run();
