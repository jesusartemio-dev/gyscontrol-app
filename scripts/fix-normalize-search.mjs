/**
 * Replaces .toLowerCase().includes(x.toLowerCase()) patterns with
 * normalizeStr(a).includes(normalizeStr(b)) across all frontend TS/TSX files.
 * Also handles word-split search patterns.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const ROOT = join(process.cwd(), 'src')
const IMPORT_FROM = '@/lib/utils'
const FUNC = 'normalizeStr'

let filesChanged = 0
let totalReplacements = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      // skip node_modules, .next, api routes (server-side)
      if (['node_modules', '.next', 'api'].includes(entry)) continue
      walk(full)
    } else if (['.ts', '.tsx'].includes(extname(full))) {
      processFile(full)
    }
  }
}

function processFile(filePath) {
  let src = readFileSync(filePath, 'utf8')
  const original = src
  let count = 0

  // Pattern 1: expr.toLowerCase().includes(expr2.toLowerCase())
  // Replace with: normalizeStr(expr).includes(normalizeStr(expr2))
  // We match simple member-expression chains like:
  //   (item.foo || item.bar).toLowerCase()  or  item.foo.toLowerCase()
  src = src.replace(
    /(\([^)]+\)|[\w?.[\]'"]+)\.toLowerCase\(\)\.includes\(\s*(\([^)]+\)|[\w?.[\]'"]+)\.toLowerCase\(\)\s*\)/g,
    (_, a, b) => {
      count++
      return `${FUNC}(${a}).includes(${FUNC}(${b}))`
    }
  )

  // Pattern 2: const s = term.toLowerCase() used as: field.toLowerCase().includes(s)
  // These are rarer one-off cases — leave for manual; the above covers most.

  // Pattern 3: word split — searchTerm.toLowerCase().trim().split(...)
  // e.g.: const words = searchTerm.toLowerCase().trim().split(...)
  // Replace the .toLowerCase().trim() piece specifically in split chains
  src = src.replace(
    /([\w.[\]'"?]+)\.toLowerCase\(\)\.trim\(\)/g,
    (_, a) => {
      count++
      return `${FUNC}(${a})`
    }
  )

  // Pattern 4: standalone .toLowerCase() on haystack in word search context:
  // const haystack = `...`.toLowerCase()   or   ).toLowerCase()
  // Only replace when followed by nothing (not .includes), so we handle the
  // `haystack` variable pattern:
  //   const haystack = `${x} ${y}`.toLowerCase()
  src = src.replace(
    /(`[^`]*`)\.toLowerCase\(\)/g,
    (_, a) => {
      count++
      return `${FUNC}(${a})`
    }
  )

  if (count === 0) return

  // Ensure normalizeStr is imported from @/lib/utils
  if (!src.includes(FUNC)) return // no replacements took effect somehow

  // Check existing import from @/lib/utils
  const importRegex = /^(import\s*\{[^}]*\}\s*from\s*['"]@\/lib\/utils['"])/m
  const match = src.match(importRegex)
  if (match) {
    const importLine = match[1]
    if (!importLine.includes(FUNC)) {
      // Add normalizeStr to the existing import
      src = src.replace(importRegex, (full) =>
        full.replace(/\{([^}]*)\}/, (_, inner) => `{ ${inner.trim()}, ${FUNC} }`)
      )
    }
  } else {
    // Add a new import at the top (after 'use client' if present)
    if (src.startsWith("'use client'") || src.startsWith('"use client"')) {
      src = src.replace(/^(['"]use client['"])\n/, `$1\n\nimport { ${FUNC} } from '${IMPORT_FROM}'\n`)
    } else {
      src = `import { ${FUNC} } from '${IMPORT_FROM}'\n` + src
    }
  }

  if (src !== original) {
    writeFileSync(filePath, src, 'utf8')
    filesChanged++
    totalReplacements += count
    console.log(`  ✓ ${filePath.replace(process.cwd(), '').replace(/\\/g, '/')}  (${count} replacements)`)
  }
}

console.log('Normalizing search filters across src/...\n')
walk(ROOT)
console.log(`\nDone. ${filesChanged} files changed, ${totalReplacements} replacements total.`)
