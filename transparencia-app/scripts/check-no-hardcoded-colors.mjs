#!/usr/bin/env node

/**
 * Guardia G1: Scanner de colores hardcodeados
 * Verifica que ningún archivo en app/ y components/ contenga valores de color literales (hex, rgb, hsl).
 * Todos los colores deben derivar de tokens CSS (var(--...)) definidos en globals.css o partidos.config.ts.
 */

import fs from 'fs';
import path from 'path';

const WHITELIST_FILES = new Set([
  path.normalize('app/globals.css'),
  path.normalize('lib/partidos.config.ts'),
  path.normalize('lib/theme-tokens.ts'),
  path.normalize('lib/contrast-tokens.test.ts'),
]);

const DIRECTORIES_TO_SCAN = ['app', 'components'];

const HEX_COLOR_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
// Matches rgb(...) / rgba(...) / hsl(...) / hsla(...) that do not use CSS vars
const RAW_RGB_HSL_REGEX = /\b(?:rgb|rgba|hsl|hsla)\(\s*(?!\s*var\()[^)]+\)/gi;

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['node_modules', '.next', '.git', 'artifacts', 'scratch'].includes(file)) {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (/\.(tsx?|jsx?|css)$/.test(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

let totalViolations = 0;
const violationsByFile = new Map();

for (const dir of DIRECTORIES_TO_SCAN) {
  const files = getAllFiles(dir);

  for (const file of files) {
    const relPath = path.normalize(file);
    if (WHITELIST_FILES.has(relPath)) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Ignore comment-only lines
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }

      const hexMatches = line.match(HEX_COLOR_REGEX);
      const rgbMatches = line.match(RAW_RGB_HSL_REGEX);

      const matches = [];
      if (hexMatches) matches.push(...hexMatches);
      if (rgbMatches) matches.push(...rgbMatches);

      if (matches.length > 0) {
        if (!violationsByFile.has(relPath)) {
          violationsByFile.set(relPath, []);
        }
        violationsByFile.get(relPath).push({
          line: index + 1,
          matches,
          code: trimmed,
        });
        totalViolations += matches.length;
      }
    });
  }
}

console.log('='.repeat(70));
console.log('🛡️  GUARDIA G1: Scanner de Colores Hardcodeados');
console.log('='.repeat(70));

if (totalViolations === 0) {
  console.log('✅ CERO colores hardcodeados detectados en app/ y components/.');
  console.log('   Todos los estilos respetan el sistema de tokens semánticos.');
  console.log('='.repeat(70));
  process.exit(0);
} else {
  console.error(`❌ Se encontraron ${totalViolations} violaciones de color hardcodeado:\n`);
  for (const [file, issues] of violationsByFile.entries()) {
    console.error(`📄 ${file}:`);
    for (const issue of issues) {
      console.error(`   Línea ${issue.line}: [${issue.matches.join(', ')}] -> ${issue.code}`);
    }
    console.error('');
  }
  console.error('Por favor reemplaza estos colores con tokens semánticos (var(--...)) o añádelos a la whitelist.');
  console.log('='.repeat(70));
  process.exit(1);
}
