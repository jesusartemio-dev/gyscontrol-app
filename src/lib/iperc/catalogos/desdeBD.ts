// ===================================================
// 📁 desdeBD.ts
// 📌 Los catálogos del IPERC leídos de la base, con los .ts como respaldo.
//
// Hasta ahora los catálogos eran constantes del código: corregir un dato
// exigía commit, deploy y un script sobre lo ya generado. Ahora viven en BD y
// el especialista SSOMA los edita desde /seguridad/catalogo-iperc.
//
// Si las tablas están vacías —por ejemplo antes de correr el seed— se usan las
// constantes de siempre. Así el IPERC nunca deja de generarse por un catálogo
// sin poblar.
// ===================================================

import { prisma } from '@/lib/prisma'
import { PELIGROS_CATALOGO, formatearCatalogoMarkdown } from './peligros'
import { CONTROLES_CATALOGO, formatearControlesMarkdown } from './controles'
import { MATRIZ_RIESGO, formatearMatrizMarkdown, type NivelRiesgo } from './matrizRiesgo'

const TTL_MS = 5 * 60 * 1000

interface Cache {
  peligros: string
  controles: string
  matriz: string
  matrizMapa: Record<string, { valor: number; nivel: NivelRiesgo }>
  expira: number
}
let cache: Cache | null = null

/** Para que un cambio en el catálogo se vea sin esperar los 5 minutos. */
export function limpiarCacheCatalogosIperc() {
  cache = null
}

export interface CatalogosIperc {
  peligrosMarkdown: string
  controlesMarkdown: string
  matrizMarkdown: string
  /** '3C' → { valor, nivel }. Lo usa el cálculo del nivel. */
  matriz: Record<string, { valor: number; nivel: NivelRiesgo }>
}

export async function cargarCatalogosIperc(): Promise<CatalogosIperc> {
  if (cache && cache.expira > Date.now()) {
    return {
      peligrosMarkdown: cache.peligros,
      controlesMarkdown: cache.controles,
      matrizMarkdown: cache.matriz,
      matriz: cache.matrizMapa,
    }
  }

  let peligros: string
  let controles: string
  let matriz: string
  let matrizMapa: Record<string, { valor: number; nivel: NivelRiesgo }>

  try {
    const [filasPeligro, filasControl, filasMatriz] = await Promise.all([
      prisma.ipercCatalogoPeligro.findMany({
        where: { activo: true },
        orderBy: [{ categoria: 'asc' }, { orden: 'asc' }, { peligro: 'asc' }],
      }),
      prisma.ipercCatalogoControl.findMany({
        where: { activo: true },
        orderBy: [{ tipoPeligro: 'asc' }, { jerarquia: 'asc' }, { orden: 'asc' }],
      }),
      prisma.ipercCatalogoMatriz.findMany({ orderBy: [{ severidad: 'asc' }, { probabilidad: 'asc' }] }),
    ])

    peligros = filasPeligro.length > 0 ? markdownPeligros(filasPeligro) : formatearCatalogoMarkdown()
    controles = filasControl.length > 0 ? markdownControles(filasControl) : formatearControlesMarkdown()

    if (filasMatriz.length > 0) {
      matriz = markdownMatriz(filasMatriz)
      matrizMapa = Object.fromEntries(
        filasMatriz.map(m => [
          `${m.severidad}${m.probabilidad}`,
          { valor: m.valor, nivel: m.nivel as NivelRiesgo },
        ]),
      )
    } else {
      matriz = formatearMatrizMarkdown()
      matrizMapa = MATRIZ_RIESGO
    }
  } catch {
    // Sin BD disponible el IPERC igual se genera con las constantes.
    peligros = formatearCatalogoMarkdown()
    controles = formatearControlesMarkdown()
    matriz = formatearMatrizMarkdown()
    matrizMapa = MATRIZ_RIESGO
  }

  cache = { peligros, controles, matriz, matrizMapa, expira: Date.now() + TTL_MS }
  return { peligrosMarkdown: peligros, controlesMarkdown: controles, matrizMarkdown: matriz, matriz: matrizMapa }
}

// ─── Formato para el prompt ─────────────────────────────────────────────────

function markdownPeligros(filas: Array<{ categoria: string; peligro: string; riesgo: string; consecuencia: string }>) {
  const porCategoria = new Map<string, typeof filas>()
  for (const p of filas) {
    if (!porCategoria.has(p.categoria)) porCategoria.set(p.categoria, [])
    porCategoria.get(p.categoria)!.push(p)
  }
  const lineas = [`# CATÁLOGO DE PELIGROS GYS (${filas.length} items)\n`]
  for (const [cat, items] of porCategoria) {
    lineas.push(`\n## ${cat}\n`)
    for (const p of items) {
      lineas.push(`- **${p.peligro}** → Riesgo: ${p.riesgo} → Consecuencia: ${p.consecuencia}`)
    }
  }
  return lineas.join('\n')
}

function markdownControles(filas: Array<{ tipoPeligro: string; jerarquia: string; texto: string }>) {
  const porTipo = new Map<string, typeof filas>()
  for (const c of filas) {
    if (!porTipo.has(c.tipoPeligro)) porTipo.set(c.tipoPeligro, [])
    porTipo.get(c.tipoPeligro)!.push(c)
  }
  const lineas = [`# CATÁLOGO DE CONTROLES GYS (${filas.length} items)\n`]
  lineas.push('Jerarquía de controles: eliminar > sustituir > ingenieria > administrativo > epp')
  lineas.push('Para "eliminar" y "sustituir" usar "NA" si no es técnicamente viable.\n')
  for (const [tipo, items] of porTipo) {
    lineas.push(`\n## ${tipo}\n`)
    const porJ = new Map<string, string[]>()
    for (const c of items) {
      if (!porJ.has(c.jerarquia)) porJ.set(c.jerarquia, [])
      porJ.get(c.jerarquia)!.push(c.texto)
    }
    for (const [j, textos] of porJ) {
      lineas.push(`**${j}**:`)
      for (const t of textos) lineas.push(`- ${t}`)
    }
  }
  return lineas.join('\n')
}

function markdownMatriz(filas: Array<{ severidad: number; probabilidad: string; valor: number; nivel: string }>) {
  const letras = [...new Set(filas.map(f => f.probabilidad))].sort()
  const severidades = [...new Set(filas.map(f => f.severidad))].sort((a, b) => a - b)
  const buscar = (s: number, p: string) => filas.find(f => f.severidad === s && f.probabilidad === p)

  const lineas = [
    '# MATRIZ DE EVALUACIÓN DEL RIESGO (D.S. 024-2016-EM)',
    '',
    '## Escalas',
    '- **Severidad**: 1=Catastrófica, 2=Mortal, 3=Permanente, 4=Temporal, 5=Menor',
    '- **Probabilidad**: A=Común, B=Ha sucedido, C=Podría suceder, D=Raro, E=Prácticamente imposible',
    '',
    '## Tabla (Severidad × Probabilidad → Valor: Nivel)',
    '',
    `|   | ${letras.join(' | ')} |`,
    `|---|${letras.map(() => '---').join('|')}|`,
  ]
  for (const s of severidades) {
    const celdas = letras.map(p => {
      const m = buscar(s, p)
      return m ? `${m.valor}:${m.nivel}` : ''
    })
    lineas.push(`| ${s} | ${celdas.join(' | ')} |`)
  }
  return lineas.join('\n')
}
