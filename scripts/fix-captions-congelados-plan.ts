/**
 * Pies de imagen del alcance detallado "congelados": al subir una foto se guardaba
 * como pie el nombre de la tarea/actividad de ESE momento, y quedaba con las
 * erratas que después se corrigieron en el cronograma ("Soprotes", "Torre -Armado"…).
 * Si el pie es ese nombre (igual o con diferencias mínimas: espacios, tildes, ≤3
 * letras), se vacía para que siga al nombre actual (captionEfectivo). Los pies
 * escritos a mano y los de la biblioteca (catalogoImagenId) no se tocan.
 * Uso: npx dotenv -e .env.production -o -- npx tsx scripts/fix-captions-congelados-plan.ts [--aplicar]
 */
import fs from 'fs'
import { prisma } from '../src/lib/prisma'

const APLICAR = process.argv.includes('--aplicar')

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

function distancia(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
  }
  return d[a.length][b.length]
}

async function main() {
  const planes = await prisma.planTrabajo.findMany({ select: { id: true, alcanceDetallado: true, proyecto: { select: { codigo: true } } } })
  const cambios: { id: string; proyecto: string; antes: string; nombre: string }[] = []

  for (const plan of planes) {
    const nombres = new Map<string, string>()
    for (const e of (plan.alcanceDetallado as any[]) ?? []) {
      if (e?.edtRefId) nombres.set(`e:${e.edtRefId}`, e.edtNombre)
      for (const s of e?.subItems ?? []) {
        if (s.actividadRefId) nombres.set(`s:${s.actividadRefId}`, s.actividadNombre)
        for (const t of s.tareas ?? []) if (t.tareaRefId) nombres.set(`t:${t.tareaRefId}`, t.nombre)
      }
    }
    const imgs = await prisma.planTrabajoImagen.findMany({
      where: { planTrabajoId: plan.id, catalogoImagenId: null, NOT: [{ caption: null }, { caption: '' }] },
      select: { id: true, caption: true, edtRef: true, subItemRef: true, tareaRef: true },
    })
    for (const img of imgs) {
      const nombre = img.tareaRef ? nombres.get(`t:${img.tareaRef}`) : img.subItemRef ? nombres.get(`s:${img.subItemRef}`) : nombres.get(`e:${img.edtRef}`)
      if (!nombre) continue
      const a = normalizar(img.caption!)
      const b = normalizar(nombre)
      if (a === b || distancia(a, b) <= 3) cambios.push({ id: img.id, proyecto: plan.proyecto.codigo, antes: img.caption!, nombre })
    }
  }

  for (const c of cambios) console.log(`${c.proyecto} | "${c.antes}"${c.antes === c.nombre ? '' : `  →  "${c.nombre}"`}`)
  console.log(`\n${cambios.length} pie(s) pasan a seguir el nombre actual.`)
  if (!APLICAR) { console.log('Vista previa. Para aplicar: --aplicar'); return }

  fs.writeFileSync(`scripts/respaldo-captions-plan-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify(cambios, null, 2))
  await prisma.planTrabajoImagen.updateMany({ where: { id: { in: cambios.map(c => c.id) } }, data: { caption: '' } })
  console.log('Aplicado.')
}
main().finally(() => prisma.$disconnect())
