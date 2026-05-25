/**
 * Fixes broken patterns left by fix-normalize-search.mjs:
 * normalizeStr(expr?)  →  normalizeStr(expr)   (trailing ? is invalid syntax)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const ROOT = join(process.cwd(), 'src')
let filesFixed = 0
let totalFixes = 0

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (['node_modules', '.next'].includes(entry)) continue
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

  // normalizeStr(anything ending in ?) → normalizeStr(anything)
  // The ? here is an extra trailing char from optional chaining that got mis-captured.
  // normalizeStr already handles null/undefined so the ? is never needed.
  // We match the full normalizeStr(...?) call, being careful to handle nested parens.
  // Simple approach: find normalizeStr( then scan to matching ), check if it ends with ?
  let result = ''
  let i = 0
  while (i < src.length) {
    const idx = src.indexOf('normalizeStr(', i)
    if (idx === -1) {
      result += src.slice(i)
      break
    }
    result += src.slice(i, idx + 'normalizeStr('.length)
    // Find the matching closing paren
    let depth = 1
    let j = idx + 'normalizeStr('.length
    while (j < src.length && depth > 0) {
      if (src[j] === '(') depth++
      else if (src[j] === ')') depth--
      if (depth > 0) j++
    }
    // src[j] is now the closing )
    // The inner content is src[idx + 'normalizeStr('.length .. j]
    const inner = src.slice(idx + 'normalizeStr('.length, j)
    // Fix: if inner ends with ? but NOT with ?. (to preserve valid optional chaining mid-expression)
    // A trailing standalone ? means optional chaining was attached to the last property
    // and the normalizeStr call made the ? dangling. We just remove it.
    let fixedInner = inner
    if (inner.endsWith('?')) {
      fixedInner = inner.slice(0, -1)
      count++
    }
    result += fixedInner + ')'
    i = j + 1
  }
  src = result

  if (src !== original) {
    writeFileSync(filePath, src, 'utf8')
    filesFixed++
    totalFixes += count
    console.log(`  ✓ ${filePath.replace(process.cwd(), '').replace(/\\/g, '/')}  (${count} fixes)`)
  }
}

console.log('Fixing trailing ? inside normalizeStr() calls...\n')
walk(ROOT)
console.log(`\nDone. ${filesFixed} files fixed, ${totalFixes} fixes total.`)
