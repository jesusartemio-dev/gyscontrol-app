/**
 * Importa a la base de datos LOCAL (DATABASE_URL de `.env`, NUNCA de
 * `.env.production`) el JSON generado por `sync-catalogo-servicio-prod-export.ts`.
 *
 * IMPORTANTE — reconciliación por `nombre`, NUNCA por `id`: se confirmó que
 * local y producción tienen `id`s DISTINTOS para las mismas filas (ej. los 5
 * FaseDefault que comparten nombre en ambos entornos tienen UUIDs
 * completamente distintos) — el supuesto original de "local viene de un dump
 * de prod, comparten ids" era incorrecto. FaseDefault/Edt/UnidadServicio/
 * Recurso tienen `nombre` `@unique`, así que se usan como clave de
 * reconciliación: si existe localmente una fila con ese `nombre`, se
 * actualiza conservando su `id` LOCAL (nunca se reescribe una PK ya
 * referenciada por otras filas locales); si no existe, se crea nueva
 * reusando el `id` de prod (no hay colisión posible). Se construye un mapa
 * `prodId -> localId` por tabla para remapear las FKs (`Edt.faseDefaultId`,
 * `CatalogoServicio.categoriaId/unidadServicioId/recursoId`).
 *
 * `CatalogoServicio` no tiene un `nombre` `@unique` en el schema, así que se
 * reconcilia por el par (`nombre`, `categoriaId` YA remapeado a local).
 *
 * Filas de prod cuyas FKs no se puedan remapear (referencian una fila que no
 * existe ni en prod-export ni en local) se reportan y se saltan — nunca se
 * inserta una fila con una FK inválida.
 *
 * Dry-run por defecto (solo reporta qué se crearía/actualizaría), --apply
 * para escribir de verdad. `--eliminar-huerfanos` (solo tiene efecto junto
 * con --apply) borra las filas locales de CatalogoServicio cuyo `nombre` ya
 * no existe en el export de prod — SOLO si no tienen ninguna referencia FK
 * local (cotización/plantilla/proyecto ya creados apuntando a ellas); las
 * que sí tienen referencias se reportan y se saltan, nunca se fuerza el
 * borrado.
 *
 * Uso:
 *   npx tsx scripts/sync-catalogo-servicio-local-import.ts -- --file data/catalogo-servicio-prod-export-<timestamp>.json
 *   npx tsx scripts/sync-catalogo-servicio-local-import.ts -- --file data/catalogo-servicio-prod-export-<timestamp>.json --apply
 *   npx tsx scripts/sync-catalogo-servicio-local-import.ts -- --file data/catalogo-servicio-prod-export-<timestamp>.json --apply --eliminar-huerfanos
 */

import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '../src/lib/prisma'
import type { TipoRecurso, OrigenRecurso } from '@prisma/client'

interface ExportPayload {
  metadata: { exportedAt: string; counts: Record<string, number> }
  data: {
    faseDefault: FaseDefaultRow[]
    edt: EdtRow[]
    unidadServicio: UnidadServicioRow[]
    recurso: RecursoRow[]
    catalogoServicio: CatalogoServicioRow[]
  }
}

interface FaseDefaultRow {
  id: string; nombre: string; descripcion: string | null; orden: number
  activo: boolean; duracionDias: number; color: string | null; createdAt: string
}
interface EdtRow {
  id: string; nombre: string; descripcion: string | null; faseDefaultId: string | null; createdAt: string
}
interface UnidadServicioRow { id: string; nombre: string; createdAt: string }
interface RecursoRow {
  id: string; nombre: string; tipo: TipoRecurso; origen: OrigenRecurso; costoHora: number
  costoHoraProyecto: number | null; descripcion: string | null; orden: number
  activo: boolean; createdAt: string
}
interface CatalogoServicioRow {
  id: string; categoriaId: string; unidadServicioId: string; recursoId: string
  nombre: string; descripcion: string; horaBase: number | null; horaRepetido: number | null
  createdAt: string; orden: number | null; cantidad: number | null; nivelDificultad: number | null
}

function leerArchivo(): ExportPayload {
  const idx = process.argv.indexOf('--file')
  if (idx === -1 || !process.argv[idx + 1]) {
    throw new Error('Falta --file <ruta-al-json-exportado>')
  }
  const filePath = path.resolve(process.argv[idx + 1])
  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el archivo: ${filePath}`)
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

interface Contadores { creados: number; actualizados: number }

async function main() {
  const apply = process.argv.includes('--apply')
  const eliminarHuerfanos = process.argv.includes('--eliminar-huerfanos')
  const payload = leerArchivo()
  const { faseDefault, edt, unidadServicio, recurso, catalogoServicio } = payload.data

  console.log(`📦 Import de: ${payload.metadata.exportedAt}`)
  console.log(apply ? '\n🚀 Modo APLICAR — se van a escribir datos en LOCAL\n' : '\n🔎 Modo DRY-RUN — no se modifica nada (se consulta local para simular el resultado)\n')

  const mapaFaseDefault = new Map<string, string>() // prodId -> localId
  const mapaEdt = new Map<string, string>()
  const mapaUnidadServicio = new Map<string, string>()
  const mapaRecurso = new Map<string, string>()

  // 1. FaseDefault — reconciliado por nombre (@unique)
  const cFaseDefault: Contadores = { creados: 0, actualizados: 0 }
  for (const row of faseDefault) {
    const existente = await prisma.faseDefault.findUnique({ where: { nombre: row.nombre } })
    if (existente) {
      mapaFaseDefault.set(row.id, existente.id)
      cFaseDefault.actualizados++
      if (apply) {
        await prisma.faseDefault.update({
          where: { id: existente.id },
          data: { descripcion: row.descripcion, orden: row.orden, activo: row.activo, duracionDias: row.duracionDias, color: row.color, updatedAt: new Date() },
        })
      }
    } else {
      mapaFaseDefault.set(row.id, row.id)
      cFaseDefault.creados++
      if (apply) {
        await prisma.faseDefault.create({
          data: { id: row.id, nombre: row.nombre, descripcion: row.descripcion, orden: row.orden, activo: row.activo, duracionDias: row.duracionDias, color: row.color, createdAt: new Date(row.createdAt), updatedAt: new Date() },
        })
      }
    }
  }
  console.log(`   - FaseDefault: ${cFaseDefault.creados} nuevas, ${cFaseDefault.actualizados} actualizadas`)

  // 2. Edt — reconciliado por nombre, remapea faseDefaultId
  const cEdt: Contadores = { creados: 0, actualizados: 0 }
  for (const row of edt) {
    const faseDefaultIdLocal = row.faseDefaultId ? mapaFaseDefault.get(row.faseDefaultId) ?? null : null
    const existente = await prisma.edt.findUnique({ where: { nombre: row.nombre } })
    if (existente) {
      mapaEdt.set(row.id, existente.id)
      cEdt.actualizados++
      if (apply) {
        await prisma.edt.update({ where: { id: existente.id }, data: { descripcion: row.descripcion, faseDefaultId: faseDefaultIdLocal } })
      }
    } else {
      mapaEdt.set(row.id, row.id)
      cEdt.creados++
      if (apply) {
        await prisma.edt.create({ data: { id: row.id, nombre: row.nombre, descripcion: row.descripcion, faseDefaultId: faseDefaultIdLocal, createdAt: new Date(row.createdAt) } })
      }
    }
  }
  console.log(`   - Edt: ${cEdt.creados} nuevos, ${cEdt.actualizados} actualizados`)

  // 3. UnidadServicio — reconciliado por nombre, tabla hoja (sin FKs salientes)
  const cUnidad: Contadores = { creados: 0, actualizados: 0 }
  for (const row of unidadServicio) {
    const existente = await prisma.unidadServicio.findUnique({ where: { nombre: row.nombre } })
    if (existente) {
      mapaUnidadServicio.set(row.id, existente.id)
      cUnidad.actualizados++
    } else {
      mapaUnidadServicio.set(row.id, row.id)
      cUnidad.creados++
      if (apply) {
        await prisma.unidadServicio.create({ data: { id: row.id, nombre: row.nombre, createdAt: new Date(row.createdAt), updatedAt: new Date() } })
      }
    }
  }
  console.log(`   - UnidadServicio: ${cUnidad.creados} nuevas, ${cUnidad.actualizados} ya existían (sin cambios — tabla hoja sin más campos)`)

  // 4. Recurso — reconciliado por nombre, tabla hoja
  const cRecurso: Contadores = { creados: 0, actualizados: 0 }
  for (const row of recurso) {
    const existente = await prisma.recurso.findUnique({ where: { nombre: row.nombre } })
    if (existente) {
      mapaRecurso.set(row.id, existente.id)
      cRecurso.actualizados++
      if (apply) {
        await prisma.recurso.update({
          where: { id: existente.id },
          data: { tipo: row.tipo, origen: row.origen, costoHora: row.costoHora, costoHoraProyecto: row.costoHoraProyecto, descripcion: row.descripcion, orden: row.orden, activo: row.activo },
        })
      }
    } else {
      mapaRecurso.set(row.id, row.id)
      cRecurso.creados++
      if (apply) {
        await prisma.recurso.create({
          data: { id: row.id, nombre: row.nombre, tipo: row.tipo, origen: row.origen, costoHora: row.costoHora, costoHoraProyecto: row.costoHoraProyecto, descripcion: row.descripcion, orden: row.orden, activo: row.activo, createdAt: new Date(row.createdAt) },
        })
      }
    }
  }
  console.log(`   - Recurso: ${cRecurso.creados} nuevos, ${cRecurso.actualizados} actualizados`)

  // 5. CatalogoServicio — reconciliado por (nombre, categoriaId LOCAL), remapea las 3 FKs
  const cCatalogo: Contadores = { creados: 0, actualizados: 0 }
  const sinRemapear: { id: string; nombre: string; motivo: string }[] = []

  for (const row of catalogoServicio) {
    const categoriaIdLocal = mapaEdt.get(row.categoriaId)
    const unidadServicioIdLocal = mapaUnidadServicio.get(row.unidadServicioId)
    const recursoIdLocal = mapaRecurso.get(row.recursoId)

    if (!categoriaIdLocal || !unidadServicioIdLocal || !recursoIdLocal) {
      sinRemapear.push({
        id: row.id,
        nombre: row.nombre,
        motivo: `FK sin remapear (edt=${!!categoriaIdLocal}, unidad=${!!unidadServicioIdLocal}, recurso=${!!recursoIdLocal})`,
      })
      continue
    }

    const existente = await prisma.catalogoServicio.findFirst({ where: { nombre: row.nombre, categoriaId: categoriaIdLocal } })

    if (existente) {
      cCatalogo.actualizados++
      if (apply) {
        await prisma.catalogoServicio.update({
          where: { id: existente.id },
          data: {
            descripcion: row.descripcion,
            horaBase: row.horaBase,
            horaRepetido: row.horaRepetido,
            orden: row.orden,
            cantidad: row.cantidad,
            nivelDificultad: row.nivelDificultad,
            unidadServicioId: unidadServicioIdLocal,
            recursoId: recursoIdLocal,
            updatedAt: new Date(),
          },
        })
      }
    } else {
      cCatalogo.creados++
      if (apply) {
        await prisma.catalogoServicio.create({
          data: {
            id: randomUUID(),
            categoriaId: categoriaIdLocal,
            unidadServicioId: unidadServicioIdLocal,
            recursoId: recursoIdLocal,
            nombre: row.nombre,
            descripcion: row.descripcion,
            horaBase: row.horaBase,
            horaRepetido: row.horaRepetido,
            orden: row.orden,
            cantidad: row.cantidad,
            nivelDificultad: row.nivelDificultad,
            createdAt: new Date(row.createdAt),
            updatedAt: new Date(),
          },
        })
      }
    }
  }
  console.log(`   - CatalogoServicio: ${cCatalogo.creados} nuevos, ${cCatalogo.actualizados} actualizados${sinRemapear.length ? `, ${sinRemapear.length} SALTADOS (FK rota)` : ''}`)

  if (sinRemapear.length > 0) {
    console.log('\n⚠️  Filas de CatalogoServicio saltadas por FK sin remapear:')
    sinRemapear.forEach(r => console.log(`   - ${r.nombre} (${r.id}): ${r.motivo}`))
  }

  // 6. Huérfanas — filas locales cuyo nombre ya no existe en el export de prod.
  const nombresProd = new Set(catalogoServicio.map(r => r.nombre))
  const localesActuales = await prisma.catalogoServicio.findMany({
    select: { id: true, nombre: true, edt: { select: { nombre: true } } },
  })
  const huerfanas = localesActuales.filter(r => !nombresProd.has(r.nombre))

  if (huerfanas.length > 0) {
    console.log(`\n🗑️  ${huerfanas.length} filas locales huérfanas (nombre ya no existe en prod):`)

    let eliminadas = 0
    let enUso = 0
    for (const h of huerfanas) {
      const [cotizacion, plantilla, proyecto, plantillaIndep] = await Promise.all([
        prisma.cotizacionServicioItem.count({ where: { catalogoServicioId: h.id } }),
        prisma.plantillaServicioItem.count({ where: { catalogoServicioId: h.id } }),
        prisma.proyectoServicioCotizadoItem.count({ where: { catalogoServicioId: h.id } }),
        prisma.plantillaServicioItemIndependiente.count({ where: { catalogoServicioId: h.id } }),
      ])
      const referencias = cotizacion + plantilla + proyecto + plantillaIndep

      if (referencias > 0) {
        enUso++
        console.log(`   - EN USO, no se elimina (${referencias} referencias): ${h.edt.nombre} | ${h.nombre}`)
        continue
      }

      if (eliminarHuerfanos && apply) {
        await prisma.catalogoServicio.delete({ where: { id: h.id } })
        eliminadas++
      } else {
        console.log(`   - ${h.edt.nombre} | ${h.nombre}${eliminarHuerfanos ? '' : ' (usar --eliminar-huerfanos para borrar)'}`)
      }
    }

    if (eliminarHuerfanos && apply) {
      console.log(`\n   ✅ ${eliminadas}/${huerfanas.length} huérfanas eliminadas${enUso ? `, ${enUso} conservadas por estar en uso` : ''}.`)
    }
  } else {
    console.log('\n✅ Ninguna fila local huérfana.')
  }

  console.log(apply ? '\n✅ Sincronización aplicada.' : '\nNada modificado (dry-run). Para aplicar de verdad, vuelve a correr con --apply')
}

main()
  .catch(e => {
    console.error('❌ Error:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
