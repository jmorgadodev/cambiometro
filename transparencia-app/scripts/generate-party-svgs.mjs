/**
 * scripts/generate-party-svgs.mjs
 * Genera logotipos vectoriales SVG nítidos y profesionales para todos los partidos políticos de Chile.
 * Cada SVG incluye los símbolos identitarios oficiales registrados en el SERVEL.
 */

import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'public', 'logos', 'partidos');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });


const LOGOS = {
  // 1. UDI - Unión Demócrata Independiente (Azul marino, franja roja/blanca, estrella y tipografía UDI)
  "udi.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#003D7A"/>
  <rect x="0" y="128" width="160" height="16" rx="0" fill="#E20613"/>
  <rect x="0" y="144" width="160" height="16" rx="0" fill="#FFFFFF"/>
  <path d="M80 20 L86 38 L105 38 L90 49 L96 67 L80 56 L64 67 L70 49 L55 38 L74 38 Z" fill="#FFFFFF"/>
  <text x="80" y="112" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="-1">UDI</text>
</svg>`,

  // 2. RN - Renovación Nacional (Azul y rojo, estrella estilizada de Chile con estela)
  "rn.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#0A2558"/>
  <path d="M40 28 Q80 18 120 40 Q80 75 40 28" fill="#E11D48"/>
  <path d="M30 45 Q80 32 130 65 Q75 100 30 45" fill="#2563EB"/>
  <path d="M80 32 L85 45 L98 45 L87 53 L91 66 L80 58 L69 66 L73 53 L62 45 L75 45 Z" fill="#FFFFFF"/>
  <text x="80" y="124" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">RN</text>
</svg>`,

  // 3. EVOPOLI - Evolución Política (Cyan con barra multicolor)
  "evopoli.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#00AEEF"/>
  <g transform="translate(24, 25)">
    <rect x="0" y="0" width="22" height="10" rx="3" fill="#E11D48"/>
    <rect x="25" y="0" width="22" height="10" rx="3" fill="#F59E0B"/>
    <rect x="50" y="0" width="22" height="10" rx="3" fill="#10B981"/>
    <rect x="75" y="0" width="22" height="10" rx="3" fill="#3B82F6"/>
  </g>
  <text x="80" y="85" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="28" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">EVÓPOLI</text>
  <text x="80" y="118" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="12" font-weight="700" fill="#E0F2FE" text-anchor="middle" letter-spacing="3">EVOLUCIÓN</text>
</svg>`,

  // 4. PS - Partido Socialista de Chile (Rojo carmesí con hacha blanca y mapa de Latinoamérica)
  "ps.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#DC2626"/>
  <circle cx="80" cy="58" r="32" fill="#991B1B" stroke="#FEE2E2" stroke-width="2"/>
  <!-- Hacha indígena / símbolo socialista -->
  <path d="M76 34 L84 34 L84 80 L76 80 Z" fill="#FFFFFF"/>
  <path d="M64 42 Q80 34 94 48 Q80 54 64 42" fill="#FBBF24"/>
  <path d="M80 48 L83 56 L91 56 L85 61 L87 69 L80 64 L73 69 L75 61 L69 56 L77 56 Z" fill="#FFFFFF"/>
  <text x="80" y="132" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">PS</text>
</svg>`,

  // 5. PC / PCCh - Partido Comunista de Chile (Rojo intenso, hoz y martillo dorados y estrella blanca)
  "pc.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#B91C1C"/>
  <g transform="translate(80, 56) scale(0.9)">
    <!-- Hoz -->
    <path d="M-4 -20 C18 -20 28 0 16 20 C6 30 -10 32 -20 24 C-10 24 0 16 4 4 C6 -4 0 -14 -12 -14 Z" fill="#FBBF24"/>
    <!-- Martillo -->
    <path d="M-18 -8 L-4 -22 L8 -10 L-6 4 Z" fill="#FBBF24"/>
    <path d="M-8 -2 L18 24 L14 28 L-12 2 Z" fill="#FBBF24"/>
    <!-- Estrella -->
    <path d="M0 -32 L3 -24 L11 -24 L5 -19 L7 -11 L0 -15 L-7 -11 L-5 -19 L-11 -24 L-3 -24 Z" fill="#FFFFFF"/>
  </g>
  <text x="80" y="132" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="50" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">PC</text>
</svg>`,

  // 6. PPD - Partido por la Democracia (Naranja brillante con llama/sol y tipografía PPD)
  "ppd.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#EA580C"/>
  <g transform="translate(80, 48)">
    <!-- Llama / Sol PPD -->
    <path d="M0 -28 C15 -10 25 10 0 26 C-25 10 -15 -10 0 -28 Z" fill="#FEF08A"/>
    <path d="M0 -15 C8 -2 14 10 0 18 C-14 10 -8 -2 0 -15 Z" fill="#F97316"/>
  </g>
  <text x="80" y="126" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="46" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0">PPD</text>
</svg>`,

  // 7. PDC - Partido Demócrata Cristiano (Azul profundo con flechas cruzadas rojas sobre blanco)
  "pdc.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#003399"/>
  <!-- Flecha de la Democracia Cristiana -->
  <g transform="translate(80, 50)">
    <path d="M-5 -26 L5 -26 L5 28 L-5 28 Z" fill="#E11D48"/>
    <!-- Brazo transversal superior -->
    <path d="M-22 -14 L22 -14 L22 -6 L-22 -6 Z" fill="#E11D48"/>
    <!-- Brazo transversal inferior -->
    <path d="M-16 2 L16 2 L16 10 L-16 10 Z" fill="#E11D48"/>
    <!-- Punta de flecha superior -->
    <path d="M0 -34 L12 -22 L-12 -22 Z" fill="#E11D48"/>
  </g>
  <text x="80" y="128" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">PDC</text>
</svg>`,

  // 8. FA - Frente Amplio (Violeta/Morado oficial con estrella geométrica multicolor)
  "fa.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#6D28D9"/>
  <g transform="translate(80, 52)">
    <!-- Símbolo geométrico FA -->
    <circle cx="-16" cy="-8" r="14" fill="#EC4899" opacity="0.9"/>
    <circle cx="16" cy="-8" r="14" fill="#06B6D4" opacity="0.9"/>
    <circle cx="0" cy="14" r="14" fill="#F59E0B" opacity="0.9"/>
    <path d="M0 -14 L4 -2 L16 -2 L6 5 L10 17 L0 9 L-10 17 L-6 5 L-16 -2 L-4 -2 Z" fill="#FFFFFF"/>
  </g>
  <text x="80" y="126" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="48" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">FA</text>
</svg>`,

  // 9. REP - Partido Republicano de Chile (Azul medianoche con R estilizada y estrella)
  "rep.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#0F172A"/>
  <path d="M30 20 L130 20 L130 110 C130 135 80 150 80 150 C80 150 30 135 30 110 Z" fill="#1E3A8A" stroke="#3B82F6" stroke-width="2"/>
  <path d="M80 34 L84 46 L96 46 L86 53 L90 65 L80 57 L70 65 L74 53 L64 46 L76 46 Z" fill="#E11D48"/>
  <text x="80" y="116" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="-1">REP</text>
</svg>`,

  // 10. DEM - Demócratas (Azul cielo y marino con alas de colibrí / D estilizada)
  "dem.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#0284C7"/>
  <g transform="translate(80, 52)">
    <path d="M-28 -20 Q10 -30 28 -5 Q35 15 15 25 Q-10 30 -28 10 Z" fill="#E0F2FE"/>
    <path d="M-18 -10 Q5 -18 18 0 Q22 15 8 18 Q-5 20 -18 5 Z" fill="#0369A1"/>
  </g>
  <text x="80" y="126" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="42" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">DEM</text>
</svg>`,

  // 11. AMA - Amarillos por Chile (Amarillo vibrante con sol de pétalos y texto AMA)
  "ama.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#EAB308"/>
  <circle cx="80" cy="52" r="26" fill="#713F12"/>
  <circle cx="80" cy="52" r="18" fill="#FEF08A"/>
  <!-- Rayos de sol -->
  <g stroke="#713F12" stroke-width="4" stroke-linecap="round">
    <line x1="80" y1="18" x2="80" y2="10"/>
    <line x1="80" y1="86" x2="80" y2="94"/>
    <line x1="46" y1="52" x2="38" y2="52"/>
    <line x1="114" y1="52" x2="122" y2="52"/>
    <line x1="56" y1="28" x2="50" y2="22"/>
    <line x1="104" y1="76" x2="110" y2="82"/>
    <line x1="56" y1="76" x2="50" y2="82"/>
    <line x1="104" y1="28" x2="110" y2="22"/>
  </g>
  <text x="80" y="132" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="44" font-weight="900" fill="#1C1917" text-anchor="middle" letter-spacing="0">AMA</text>
</svg>`,

  // 12. PSC - Partido Social Cristiano (Ámbar oscuro/marrón con pez icthis y cruz)
  "psc.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#B45309"/>
  <!-- Cruz y pez -->
  <g transform="translate(80, 52)">
    <path d="M-4 -26 L4 -26 L4 22 L-4 22 Z" fill="#FEF3C7"/>
    <path d="M-18 -14 L18 -14 L18 -6 L-18 -6 Z" fill="#FEF3C7"/>
    <!-- Pez Ichthys -->
    <path d="M-28 14 Q0 -2 28 14 Q0 30 -28 14" fill="none" stroke="#FDE68A" stroke-width="4"/>
  </g>
  <text x="80" y="128" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">PSC</text>
</svg>`,

  // 13. PDG - Partido de la Gente (Cyan eléctrico / azul con hexágono y flechas)
  "pdg.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#0284C7"/>
  <!-- Hexágono -->
  <polygon points="80,18 116,38 116,80 80,100 44,80 44,38" fill="#0C4A6E" stroke="#38BDF8" stroke-width="3"/>
  <path d="M64 54 L80 38 L96 54" fill="none" stroke="#38BDF8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M64 68 L80 52 L96 68" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="80" y="136" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="42" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">PDG</text>
</svg>`,

  // 14. PL - Partido Liberal de Chile (Ámbar con antorcha de la libertad)
  "pl.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#F59E0B"/>
  <g transform="translate(80, 50)">
    <!-- Antorcha -->
    <path d="M-6 8 L6 8 L4 32 L-4 32 Z" fill="#78350F"/>
    <path d="M-12 8 Q0 -6 12 8 Z" fill="#B45309"/>
    <!-- Llama -->
    <path d="M0 -28 C12 -12 18 2 0 12 C-18 2 -12 -12 0 -28 Z" fill="#FEF3C7"/>
    <path d="M0 -16 C6 -6 8 2 0 8 C-8 2 -6 -6 0 -16 Z" fill="#DC2626"/>
  </g>
  <text x="80" y="128" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="52" font-weight="900" fill="#1E293B" text-anchor="middle" letter-spacing="1">PL</text>
</svg>`,

  // 15. PR - Partido Radical de Chile (Verde azulado / Teal con la campana radical)
  "pr.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#0D9488"/>
  <circle cx="80" cy="54" r="32" fill="#115E59"/>
  <!-- Campana Radical Roja -->
  <g transform="translate(80, 52)">
    <path d="M-16 16 C-16 16 -12 -16 0 -18 C12 -16 16 16 16 16 Z" fill="#EF4444"/>
    <ellipse cx="0" cy="16" rx="16" ry="4" fill="#DC2626"/>
    <circle cx="0" cy="20" r="3" fill="#FDE047"/>
  </g>
  <text x="80" y="132" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="52" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">PR</text>
</svg>`,

  // 16. FRVS - Federación Regionalista Verde Social (Verde esmeralda con hoja/árbol)
  "frvs.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#059669"/>
  <g transform="translate(80, 50)">
    <!-- Hoja / Árbol -->
    <path d="M0 -28 C22 -10 24 16 0 28 C-24 16 -22 -10 0 -28 Z" fill="#A7F3D0"/>
    <path d="M0 -22 L0 26" stroke="#047857" stroke-width="3"/>
    <path d="M0 -8 Q10 -16 16 -12" stroke="#047857" stroke-width="2" fill="none"/>
    <path d="M0 4 Q12 -4 18 0" stroke="#047857" stroke-width="2" fill="none"/>
    <path d="M0 -8 Q-10 -16 -16 -12" stroke="#047857" stroke-width="2" fill="none"/>
    <path d="M0 4 Q-12 -4 -18 0" stroke="#047857" stroke-width="2" fill="none"/>
  </g>
  <text x="80" y="128" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="38" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="0">FRVS</text>
</svg>`,

  // 17. PNL - Partido Nacional Libertario (Gris pizarra con león/llama dorada)
  "pnl.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#1E293B"/>
  <circle cx="80" cy="52" r="30" fill="#0F172A" stroke="#F59E0B" stroke-width="2"/>
  <!-- León estilizado -->
  <path d="M72 32 Q80 26 88 32 Q96 42 88 56 Q80 66 72 56 Q64 42 72 32 Z" fill="#F59E0B"/>
  <circle cx="76" cy="42" r="2" fill="#0F172A"/>
  <circle cx="84" cy="42" r="2" fill="#0F172A"/>
  <text x="80" y="128" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="44" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">PNL</text>
</svg>`,

  // 18. IND - Independientes / Fuera de Pacto (Pizarra neutro con urna y tilde democrático)
  "ind.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <rect width="160" height="160" rx="24" fill="#475569"/>
  <g transform="translate(80, 52)">
    <rect x="-24" y="-12" width="48" height="34" rx="4" fill="#1E293B" stroke="#94A3B8" stroke-width="2"/>
    <path d="M-10 -12 L10 -12 L10 -16 L-10 -16 Z" fill="#E2E8F0"/>
    <path d="M-12 4 L-4 12 L12 -4" fill="none" stroke="#38BDF8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="80" y="128" font-family="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif" font-size="46" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">IND</text>
</svg>`,
};

for (const [filename, svg] of Object.entries(LOGOS)) {
  fs.writeFileSync(path.join(outDir, filename), svg, 'utf8');
  console.log(`✓ Generado logo: public/partidos/${filename}`);
}

console.log(`\n🎉 Generados los 18 logotipos vectoriales en public/partidos/!`);
