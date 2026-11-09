// MPP (matriz EPP × puestos) como TEXTO para ida y vuelta con una IA:
//
//   EPP 12: Casco de seguridad dieléctrico (CABEZA)
//   Usan: Residente de obra; Supervisor SSOMA; Técnico electricista
//   Observaciones: -
//   ---
//
// "Usan" lista los puestos que llevan ese EPP ("ninguno" = nadie). Los EPP
// salen del catálogo: desde el texto no se agregan ni se quitan, solo se
// cambia quién los usa y las observaciones. Puestos con nombre parecido se
// reconocen (sin tildes, mayúsculas, o una parte única del nombre).

export interface ItemMppTexto {
  id: string
  orden: number
  asignaciones: Record<string, boolean>
  observaciones: string | null
  mppEppCatalogo: { nombre: string; parteCuerpo: string; durabilidad?: string | null }
}

export interface CambioItemMpp {
  id: string
  orden: number
  nombre: string
  asignaciones: Record<string, boolean>
  observaciones?: string | null
  agregados: string[]
  quitados: string[]
  obsCambia: boolean
}

export interface ResultadoMpp {
  cambios: CambioItemMpp[]
  sinCambios: number
  errores: string[]
  bloques: number
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const sinMarcas = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^\*\*|\*\*$/g, '').trim()

export function instruccionesMpp(puestos: string[]): string {
  return `INSTRUCCIONES PARA LA IA
Eres especialista en seguridad y salud ocupacional (Perú, D.S. 024-2016-EM).
Revisa esta Matriz de EPP por puesto: indica qué puestos deben usar cada EPP
según los riesgos de su trabajo, y agrega observaciones útiles.
Reglas de formato (una aplicación lee tu respuesta automáticamente):
1. Un bloque por EPP que empieza con "EPP <n>: <nombre>" (cópialo igual) y
   termina con "---". No agregues ni quites EPP.
2. "Usan:" con los puestos separados por ";" — usa EXACTAMENTE estos nombres:
   ${puestos.join('; ')}
   Escribe "Usan: ninguno" si ningún puesto lo usa.
3. "Observaciones:" en una línea ("-" si no hay). Texto plano, sin tablas.
=== FIN DE INSTRUCCIONES ===`
}

export function itemsATexto(items: ItemMppTexto[], puestos: string[], titulo?: string): string {
  const cab = titulo ? [`MPP — ${titulo} (${items.length} EPP)`, ''] : []
  return [
    ...cab,
    ...items.map((it) => {
      const usan = puestos.filter((p) => it.asignaciones[p])
      return [
        `EPP ${it.orden}: ${it.mppEppCatalogo.nombre} (${it.mppEppCatalogo.parteCuerpo})`,
        `Usan: ${usan.length ? usan.join('; ') : 'ninguno'}`,
        `Observaciones: ${it.observaciones?.trim() || '-'}`,
        '---',
      ].join('\n')
    }),
  ].join('\n')
}

/** Reconoce un puesto escrito por la IA contra la lista real. */
function resolverPuesto(texto: string, puestos: string[]): string | null {
  const n = norm(texto)
  if (!n) return null
  const exacto = puestos.find((p) => norm(p) === n)
  if (exacto) return exacto
  const parecidos = puestos.filter((p) => norm(p).includes(n) || n.includes(norm(p)))
  return parecidos.length === 1 ? parecidos[0] : null
}

export function textoAItems(texto: string, items: ItemMppTexto[], puestos: string[]): ResultadoMpp {
  const res: ResultadoMpp = { cambios: [], sinCambios: 0, errores: [], bloques: 0 }
  let lineas = texto.replace(/\r\n?/g, '\n').split('\n')
  const fin = lineas.findIndex((l) => /^=+\s*FIN DE INSTRUCCIONES/i.test(l.trim()))
  if (fin >= 0) lineas = lineas.slice(fin + 1)

  type Bloque = { orden: number; nombre: string; usan: string | null; obs: string | null; linea: number }
  const bloques: Bloque[] = []
  let actual: Bloque | null = null
  lineas.forEach((cruda, i) => {
    const t = sinMarcas(cruda.replace(/^[\s#>*-]+(?=EPP)/i, ''))
    let m: RegExpExecArray | null
    if ((m = /^EPP\s+(\d+)\s*[:.—–-]\s*(.*)$/i.exec(t))) {
      actual = { orden: Number(m[1]), nombre: m[2].replace(/\s*\([^()]*\)\s*$/, '').trim(), usan: null, obs: null, linea: i + 1 }
      bloques.push(actual)
      return
    }
    if (!actual) return
    const b = actual as Bloque
    if (/^-{3,}$/.test(t)) { actual = null; return }
    if ((m = /^(?:[-•*]\s*)?(?:usan|puestos|lo usan)\s*:\s*(.*)$/i.exec(t))) { b.usan = m[1].trim(); return }
    if ((m = /^(?:[-•*]\s*)?observaci[oó]n(?:es)?\s*:\s*(.*)$/i.exec(t))) { b.obs = m[1].trim(); return }
  })
  res.bloques = bloques.length
  if (!bloques.length) {
    res.errores.push('No encontré ningún bloque "EPP <n>: …". Pegá el texto con el mismo formato que se copió.')
    return res
  }

  const vistos = new Set<string>()
  for (const b of bloques) {
    const ref = `EPP ${b.orden} (línea ${b.linea})`
    let item = items.find((it) => it.orden === b.orden)
    // Si el número no coincide con el nombre, se busca por nombre.
    if (b.nombre && (!item || norm(item.mppEppCatalogo.nombre) !== norm(b.nombre))) {
      const porNombre = items.find((it) => norm(it.mppEppCatalogo.nombre) === norm(b.nombre))
      if (porNombre) item = porNombre
    }
    if (!item) { res.errores.push(`${ref}: no existe en este MPP`); continue }
    if (vistos.has(item.id)) { res.errores.push(`${ref}: "${item.mppEppCatalogo.nombre}" aparece dos veces`); continue }
    vistos.add(item.id)

    let asignaciones = { ...item.asignaciones }
    const agregados: string[] = []
    const quitados: string[] = []
    if (b.usan !== null) {
      const v = b.usan.trim()
      const lista = /^(ninguno|nadie|-|n\/?a)$/i.test(v) ? [] : v.split(v.includes(';') ? ';' : ',').map((x) => x.trim()).filter(Boolean)
      const elegidos = new Set<string>()
      let conError = false
      for (const p of lista) {
        const real = resolverPuesto(p, puestos)
        if (!real) { res.errores.push(`${ref}: el puesto "${p}" no está en el MPP`); conError = true } else elegidos.add(real)
      }
      if (conError) continue
      asignaciones = Object.fromEntries(puestos.map((p) => [p, elegidos.has(p)]))
      for (const p of puestos) {
        const antes = !!item.asignaciones[p]
        if (!antes && elegidos.has(p)) agregados.push(p)
        if (antes && !elegidos.has(p)) quitados.push(p)
      }
    }
    const obsNueva = b.obs === null ? undefined : (/^(-|ninguna?|n\/?a)$/i.test(b.obs) ? '' : b.obs)
    const obsCambia = obsNueva !== undefined && (obsNueva || '') !== (item.observaciones?.trim() || '')

    if (agregados.length || quitados.length || obsCambia) {
      res.cambios.push({
        id: item.id, orden: item.orden, nombre: item.mppEppCatalogo.nombre,
        asignaciones, agregados, quitados, obsCambia,
        ...(obsCambia ? { observaciones: obsNueva || null } : {}),
      })
    } else {
      res.sinCambios++
    }
  }
  return res
}
