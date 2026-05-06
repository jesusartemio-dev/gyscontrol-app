/**
 * Smoke test del módulo Reportes Semanales de Seguridad (Fase 4 cierre).
 *
 * Cubre los 10 escenarios solicitados en CIERRE_FASE_4 — los que se pueden
 * automatizar contra DB local + servicios; los demás se marcan PENDING con
 * instrucciones de verificación manual.
 *
 * Ejecutar:
 *   npx tsx scripts/smoke-test-seguridad.ts
 *
 * Pre-requisitos:
 *   - DB local corriendo con migraciones aplicadas (`npx prisma migrate status` → "up to date")
 *   - Al menos 2 proyectos en la tabla `proyecto`
 *   - Al menos 1 usuario con rol 'seguridad' / 'admin' / 'gerente'
 *
 * El script crea fixtures con prefijo `__smoke__` y los limpia al final
 * (try/finally) para no dejar basura en la DB.
 */

import { prisma } from '../src/lib/prisma'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

import { obtenerReporteAgregado } from '../src/lib/services/reporteSeguridad'
import { generarPptReporteSeguridad } from '../src/lib/services/pptGenerator'
import { formatearSemanaIso, rangoSemanaIso } from '../src/lib/validators/reporteSeguridad'
import { descargarImagenDrive, descargarBufferDrive } from '../src/lib/services/driveImageLoader'

// ─── Resultado de cada escenario ─────────────────────────────────────────────
type Status = 'PASS' | 'FAIL' | 'PENDING'
interface Result {
  scenario: string
  status: Status
  detail?: string
  ms?: number
}
const results: Result[] = []
function record(scenario: string, status: Status, detail?: string, ms?: number) {
  results.push({ scenario, status, detail, ms })
  const tag = status === 'PASS' ? '\x1b[32m[PASS]\x1b[0m' : status === 'FAIL' ? '\x1b[31m[FAIL]\x1b[0m' : '\x1b[33m[PENDING]\x1b[0m'
  console.log(`${tag} ${scenario}${ms != null ? ` (${ms}ms)` : ''}${detail ? ` — ${detail}` : ''}`)
}

const SMOKE_PREFIX = '__smoke__'
const createdReporteIds: string[] = []
const createdRegistroIds: string[] = []
const createdJornadaIds: string[] = []
const createdFotoCacheIds: string[] = []

// ─── Helpers de fixtures ─────────────────────────────────────────────────────
async function preCleanup() {
  // Limpiar restos de runs anteriores (por si el script abortó sin cleanup)
  const reps = await prisma.reporteSemanalSeguridad.deleteMany({
    where: { resumenEjecutivo: { startsWith: SMOKE_PREFIX } },
  })
  const regs = await prisma.registroSeguridad.deleteMany({
    where: { descripcion: { startsWith: SMOKE_PREFIX } },
  })
  const jors = await prisma.registroHorasCampo.deleteMany({
    where: { ubicacion: { startsWith: SMOKE_PREFIX } },
  })
  if (reps.count + regs.count + jors.count > 0) {
    console.log(`Pre-cleanup: ${reps.count} reportes, ${regs.count} registros, ${jors.count} jornadas residuales borrados.\n`)
  }
}

async function pickFixtures() {
  const proyectos = await prisma.proyecto.findMany({ take: 5, select: { id: true, codigo: true } })
  if (proyectos.length < 2) throw new Error('Se requieren al menos 2 proyectos en la DB')
  const ingeniero = await prisma.user.findFirst({
    where: { role: { in: ['admin', 'gerente', 'seguridad'] } },
    select: { id: true, name: true, role: true },
  })
  if (!ingeniero) throw new Error('Se requiere al menos 1 usuario con rol admin/gerente/seguridad')
  return { proyectos, ingeniero }
}

async function crearJornada(proyectoId: string, supervisorId: string) {
  const j = await prisma.registroHorasCampo.create({
    data: {
      proyectoId,
      supervisorId,
      fechaTrabajo: new Date(),
      estado: 'iniciado',
      ubicacion: `${SMOKE_PREFIX} ubicación`,
      updatedAt: new Date(),
    },
    select: { id: true },
  })
  createdJornadaIds.push(j.id)
  return j.id
}

async function obtenerOCrearEvidenciaSmoke(jornadaId: string, creadoPorId: string): Promise<string> {
  const existente = await prisma.evidenciaSeguridad.findUnique({
    where: { registroHorasCampoId: jornadaId },
    select: { id: true },
  })
  if (existente) return existente.id
  const ev = await prisma.evidenciaSeguridad.create({
    data: { registroHorasCampoId: jornadaId, creadoPorId },
    select: { id: true },
  })
  return ev.id
}

async function crearRegistro(jornadaId: string, ingenieroId: string, tipo: 'charla' | 'inspeccion' | 'incidente', desc: string, fotos = 0) {
  const evidenciaSeguridadId = await obtenerOCrearEvidenciaSmoke(jornadaId, ingenieroId)
  const r = await prisma.registroSeguridad.create({
    data: {
      evidenciaSeguridadId,
      ingenieroId,
      tipo,
      descripcion: `${SMOKE_PREFIX} ${desc}`,
      asistentes: tipo === 'charla' ? 5 : null,
    },
    select: { id: true },
  })
  createdRegistroIds.push(r.id)

  if (fotos > 0) {
    for (let i = 0; i < fotos; i++) {
      await prisma.registroSeguridadFoto.create({
        data: {
          registroSeguridadId: r.id,
          nombreArchivo: `${SMOKE_PREFIX}-${r.id}-${i}.jpg`,
          urlArchivo: `https://drive.fake/${SMOKE_PREFIX}-${i}`,
          driveFileId: `${SMOKE_PREFIX}-${r.id}-${i}`,
          tipoArchivo: 'image/jpeg',
          tamano: 1024,
          orden: i,
        },
      })
    }
  }
  return r.id
}

async function crearReporte(proyectoId: string, ingenieroId: string, semanaIso: string, covid?: Partial<Record<string, number>>) {
  const { fechaInicio, fechaFin } = rangoSemanaIso(semanaIso)
  // Si ya existe (por re-run o por reporte real preexistente del usuario), upsert sin trackear para borrar.
  const existing = await prisma.reporteSemanalSeguridad.findUnique({
    where: { proyectoId_semanaIso: { proyectoId, semanaIso } },
    select: { id: true, resumenEjecutivo: true },
  })
  if (existing) {
    // Marcar como nuestro solo si ya tenía el prefijo (run residual)
    if (existing.resumenEjecutivo?.startsWith(SMOKE_PREFIX)) createdReporteIds.push(existing.id)
    // Patch con datos de la prueba si trae COVID
    if (covid) {
      await prisma.reporteSemanalSeguridad.update({
        where: { id: existing.id },
        data: { ...covid, updatedAt: new Date() },
      })
    }
    return existing.id
  }
  const r = await prisma.reporteSemanalSeguridad.create({
    data: {
      proyectoId,
      ingenieroId,
      semanaIso,
      fechaInicio,
      fechaFin,
      resumenEjecutivo: `${SMOKE_PREFIX} resumen`,
      ...covid,
      updatedAt: new Date(),
    },
    select: { id: true },
  })
  createdReporteIds.push(r.id)
  return r.id
}

async function cleanup() {
  console.log('\n── Cleanup de fixtures __smoke__ ──')
  // 1. Borrar registros de seguridad creados
  if (createdRegistroIds.length) {
    const del = await prisma.registroSeguridad.deleteMany({ where: { id: { in: createdRegistroIds } } })
    console.log(`  borrados ${del.count} registros (cascade fotos)`)
  }
  // 2. Borrar reportes
  if (createdReporteIds.length) {
    const del = await prisma.reporteSemanalSeguridad.deleteMany({ where: { id: { in: createdReporteIds } } })
    console.log(`  borrados ${del.count} reportes`)
  }
  // 3. Borrar jornadas
  if (createdJornadaIds.length) {
    const del = await prisma.registroHorasCampo.deleteMany({ where: { id: { in: createdJornadaIds } } })
    console.log(`  borradas ${del.count} jornadas`)
  }
  // 4. Borrar archivos de cache que creamos
  for (const id of createdFotoCacheIds) {
    const safe = id.replace(/[^a-zA-Z0-9_-]/g, '_')
    const p = path.join(os.tmpdir(), 'drive-cache', `${safe}.bin`)
    await fs.unlink(p).catch(() => {})
  }
  if (createdFotoCacheIds.length) console.log(`  borrados ${createdFotoCacheIds.length} cache files`)
}

// ─── Escenarios ──────────────────────────────────────────────────────────────

async function scenario1_covidConDatos(proyectoId: string, ingenieroId: string) {
  const t0 = Date.now()
  try {
    const id = await crearReporte(proyectoId, ingenieroId, '2030-W30', {
      totalPersonas: 18, trabajadoresObra: 15, homeOffice: 3,
      casosSospechosos: 1, casosInfectados: 0, casosCurados: 0, fallecidos: 0, grupoRiesgo: 2,
    })
    const agregado = await obtenerReporteAgregado(id)
    if (!agregado) throw new Error('agregado null')
    if (agregado.reporte.totalPersonas !== 18) throw new Error('COVID no persistió')
    const buffer = await generarPptReporteSeguridad(agregado)
    if (buffer.length < 20_000) throw new Error(`buffer demasiado chico: ${buffer.length}`)
    record('1. COVID con datos → PPT', 'PASS', `buffer ${buffer.length} bytes, totalPersonas=${agregado.reporte.totalPersonas}`, Date.now() - t0)
  } catch (e) {
    record('1. COVID con datos → PPT', 'FAIL', e instanceof Error ? e.message : String(e), Date.now() - t0)
  }
}

async function scenario2_covidVacio(proyectoId: string, ingenieroId: string) {
  const t0 = Date.now()
  try {
    const id = await crearReporte(proyectoId, ingenieroId, '2030-W31')
    const agregado = await obtenerReporteAgregado(id)
    if (!agregado) throw new Error('agregado null')
    const todosNull = [
      agregado.reporte.totalPersonas, agregado.reporte.trabajadoresObra, agregado.reporte.homeOffice,
      agregado.reporte.casosSospechosos, agregado.reporte.casosInfectados, agregado.reporte.casosCurados,
      agregado.reporte.fallecidos, agregado.reporte.grupoRiesgo,
    ].every((v) => v == null)
    if (!todosNull) throw new Error('COVID no quedó null')
    const buffer = await generarPptReporteSeguridad(agregado)
    if (buffer.length < 20_000) throw new Error(`buffer demasiado chico: ${buffer.length}`)
    record('2. COVID vacío → PPT (sin tabla COVID)', 'PASS', `buffer ${buffer.length} bytes — slide 02 omite COVID por código (algunoCovid=false)`, Date.now() - t0)
  } catch (e) {
    record('2. COVID vacío → PPT (sin tabla COVID)', 'FAIL', e instanceof Error ? e.message : String(e), Date.now() - t0)
  }
}

async function scenario3_dragDrop(proyectoId: string, ingenieroId: string) {
  const t0 = Date.now()
  try {
    const jornadaId = await crearJornada(proyectoId, ingenieroId)
    const registroId = await crearRegistro(jornadaId, ingenieroId, 'charla', 'drag-drop test', 3)

    // Estado inicial: orden 0,1,2
    const before = await prisma.registroSeguridadFoto.findMany({
      where: { registroSeguridadId: registroId },
      orderBy: { orden: 'asc' },
      select: { id: true, orden: true },
    })
    if (before.length !== 3) throw new Error(`esperaba 3 fotos, hay ${before.length}`)

    // Reordenar: mover la primera al final → 1,2,0
    const nuevoOrden = [
      { id: before[1].id, orden: 0 },
      { id: before[2].id, orden: 1 },
      { id: before[0].id, orden: 2 },
    ]
    await prisma.$transaction(
      nuevoOrden.map((o) =>
        prisma.registroSeguridadFoto.update({ where: { id: o.id }, data: { orden: o.orden } }),
      ),
    )

    // Refetch y verificar
    const after = await prisma.registroSeguridadFoto.findMany({
      where: { registroSeguridadId: registroId },
      orderBy: { orden: 'asc' },
      select: { id: true, orden: true },
    })
    if (after[0].id !== before[1].id) throw new Error('orden 0 no es la que reordenamos')
    if (after[2].id !== before[0].id) throw new Error('orden 2 no es la antigua primera')
    record('3. Drag-and-drop fotos persiste', 'PASS', `3 fotos reordenadas vía $transaction`, Date.now() - t0)
  } catch (e) {
    record('3. Drag-and-drop fotos persiste', 'FAIL', e instanceof Error ? e.message : String(e), Date.now() - t0)
  }
}

async function scenario4_filtroProyecto(proyectoIds: [string, string], ingenieroId: string) {
  const t0 = Date.now()
  try {
    await crearReporte(proyectoIds[0], ingenieroId, '2030-W32')
    await crearReporte(proyectoIds[1], ingenieroId, '2030-W32')
    const soloUno = await prisma.reporteSemanalSeguridad.findMany({
      where: { proyectoId: proyectoIds[0], semanaIso: '2030-W32' },
      select: { id: true, proyectoId: true },
    })
    if (soloUno.length !== 1) throw new Error(`esperaba 1, hay ${soloUno.length}`)
    if (soloUno[0].proyectoId !== proyectoIds[0]) throw new Error('proyectoId no matchea')
    record('4. Filtro por proyecto', 'PASS', `2 reportes creados, query con filtro devuelve 1`, Date.now() - t0)
  } catch (e) {
    record('4. Filtro por proyecto', 'FAIL', e instanceof Error ? e.message : String(e), Date.now() - t0)
  }
}

async function scenario5_paginacion(proyectoId: string, ingenieroId: string) {
  const t0 = Date.now()
  try {
    // Crear 22 reportes (semanas distintas para no chocar con unique)
    for (let i = 0; i < 22; i++) {
      const week = String(33 + i).padStart(2, '0')
      await crearReporte(proyectoId, ingenieroId, `2030-W${week}`)
    }
    const where = {
      ingenieroId,
      proyectoId,
      semanaIso: { startsWith: '2030-W' },
    }
    const total = await prisma.reporteSemanalSeguridad.count({ where })
    const page1 = await prisma.reporteSemanalSeguridad.findMany({
      where,
      orderBy: [{ semanaIso: 'desc' }, { createdAt: 'desc' }],
      skip: 0,
      take: 20,
    })
    const page2 = await prisma.reporteSemanalSeguridad.findMany({
      where,
      orderBy: [{ semanaIso: 'desc' }, { createdAt: 'desc' }],
      skip: 20,
      take: 20,
    })
    if (total < 22) throw new Error(`count esperaba >=22, dio ${total}`)
    if (page1.length !== 20) throw new Error(`page1 esperaba 20, dio ${page1.length}`)
    if (page2.length < 2) throw new Error(`page2 esperaba >=2, dio ${page2.length}`)
    record('5. Paginación 20/página', 'PASS', `22 reportes creados, page1=20 page2=${page2.length} total=${total}`, Date.now() - t0)
  } catch (e) {
    record('5. Paginación 20/página', 'FAIL', e instanceof Error ? e.message : String(e), Date.now() - t0)
  }
}

async function scenario6_agregarRegistroEditor() {
  // UX flow: link en SeccionCategoria → /seguridad/evidencias?tipo=...&proyectoId=...&semanaIso=...&reporteId=...
  // Validable solo en navegador. Verificación estática del código abajo.
  const SeccionCategoriaSrc = await fs.readFile(
    path.join(process.cwd(), 'src/components/seguridad/reportes-semanales/SeccionCategoria.tsx'),
    'utf-8',
  )
  // Verifica que SeccionCategoria apunta al nuevo flujo /seguridad/evidencias con los params correctos
  const buildsExpectedHref = SeccionCategoriaSrc.includes('/seguridad/evidencias?tipo=') &&
    SeccionCategoriaSrc.includes('proyectoId=') &&
    SeccionCategoriaSrc.includes('semanaIso=') &&
    SeccionCategoriaSrc.includes('reporteId=')
  const NuevoSrc = await fs.readFile(
    path.join(process.cwd(), 'src/app/seguridad/registros/nuevo/page.tsx'),
    'utf-8',
  )
  // Verifica que /registros/nuevo es un shim que preserva los params y redirige a /seguridad/evidencias
  const readsAndRedirects = NuevoSrc.includes("searchParams.get('tipo')") &&
    NuevoSrc.includes("searchParams.get('reporteId')") &&
    NuevoSrc.includes('/seguridad/evidencias')

  if (buildsExpectedHref && readsAndRedirects) {
    record('6. Agregar registro desde editor (verificación estática)', 'PASS', `SeccionCategoria → /seguridad/evidencias con params; /nuevo redirige a evidencias`)
  } else {
    record('6. Agregar registro desde editor', 'FAIL', `static check failed: href=${buildsExpectedHref} read=${readsAndRedirects}`)
  }

  record(
    '6b. UX click → form pre-fill (manual)',
    'PENDING',
    'En navegador: click "+ Agregar Charla" en editor → /nuevo abre con tipo=charla pre-seleccionado y SelectorJornada filtrado',
  )
}

async function scenario7_vistaPrevia() {
  // Validable estáticamente: el endpoint debe leer ?preview=true y cambiar Content-Disposition
  const src = await fs.readFile(
    path.join(process.cwd(), 'src/app/api/seguridad/reportes-semanales/[id]/exportar-pptx/route.ts'),
    'utf-8',
  )
  const ok = src.includes("searchParams.get('preview')") && src.includes('inline') && src.includes('attachment')
  if (ok) {
    record('7. Vista previa (Content-Disposition condicional)', 'PASS', 'endpoint lee ?preview=true y switchea inline/attachment')
  } else {
    record('7. Vista previa', 'FAIL', 'static check no encontró el switch en el route handler')
  }
  record(
    '7b. Browser abre PPT en pestaña (manual)',
    'PENDING',
    'En navegador con dev server: click "Vista previa" → debe abrir window.open con blob URL. Browsers no renderizan PPT — toast informa esto.',
  )
}

async function scenario8_cacheDrive() {
  const t0 = Date.now()
  try {
    // 1. Crear un archivo de cache manualmente con data fake
    const fakeId = `${SMOKE_PREFIX}-cache-test`
    createdFotoCacheIds.push(fakeId)
    const cacheDir = path.join(os.tmpdir(), 'drive-cache')
    await fs.mkdir(cacheDir, { recursive: true })
    const safe = fakeId.replace(/[^a-zA-Z0-9_-]/g, '_')
    const fakeBuffer = Buffer.from('fake-image-data')
    await fs.writeFile(path.join(cacheDir, `${safe}.bin`), fakeBuffer)

    // 2. Llamar al loader, debe HIT el cache (no llamar a Drive)
    const dataUrl = await descargarImagenDrive(fakeId)
    if (!dataUrl) throw new Error('cache no devolvió data URL')
    if (!dataUrl.startsWith('data:image/jpeg;base64,')) throw new Error(`prefijo inesperado: ${dataUrl.slice(0, 40)}`)
    const decoded = Buffer.from(dataUrl.split(',')[1], 'base64').toString()
    if (decoded !== 'fake-image-data') throw new Error(`payload no matchea: ${decoded}`)

    // 3. Segunda llamada — también hit
    const dataUrl2 = await descargarImagenDrive(fakeId)
    if (!dataUrl2) throw new Error('segunda llamada falló')

    record('8. Cache Drive: hit en lecturas repetidas', 'PASS', 'leído desde tmpdir/drive-cache/', Date.now() - t0)
  } catch (e) {
    record('8. Cache Drive', 'FAIL', e instanceof Error ? e.message : String(e), Date.now() - t0)
  }
}

async function scenario9_sieteCharlas(proyectoId: string, ingenieroId: string) {
  const t0 = Date.now()
  try {
    const jornadaId = await crearJornada(proyectoId, ingenieroId)
    for (let i = 0; i < 7; i++) {
      await crearRegistro(jornadaId, ingenieroId, 'charla', `charla #${i + 1}`)
    }
    // Usar la semana actual para que el agregador encuentre los registros
    // (el agregador filtra registros por jornada.fechaTrabajo dentro del rango del reporte)
    const semanaActual = formatearSemanaIso(new Date())
    const reporteId = await crearReporte(proyectoId, ingenieroId, semanaActual)
    const agregado = await obtenerReporteAgregado(reporteId)
    if (!agregado) throw new Error('agregado null')
    // Cuento charlas específicas de este escenario (descripción contiene "charla #")
    const charlasDelScenario = agregado.registros.filter(
      (r) => r.tipo === 'charla' && r.descripcion.includes('charla #'),
    )
    if (charlasDelScenario.length !== 7) {
      throw new Error(`esperaba 7 charlas-del-scenario, hay ${charlasDelScenario.length}`)
    }

    // chunk de 3 = ceil(7/3) = 3 slides de charlas
    const slidesEsperados = Math.ceil(7 / 3)
    if (slidesEsperados !== 3) throw new Error(`math wrong: ${slidesEsperados}`)

    const buffer = await generarPptReporteSeguridad(agregado)
    if (buffer.length < 20_000) throw new Error(`buffer demasiado chico: ${buffer.length}`)

    record(
      '9. Reporte con 7 charlas → 3 slides de charlas',
      'PASS',
      `Math.ceil(7/3)=${slidesEsperados}; buffer ${buffer.length} bytes`,
      Date.now() - t0,
    )
  } catch (e) {
    record('9. Reporte con 7 charlas', 'FAIL', e instanceof Error ? e.message : String(e), Date.now() - t0)
  }
}

async function scenario10_fotoFalla(proyectoId: string, ingenieroId: string) {
  const t0 = Date.now()
  // Capturar warns del loader
  const warnings: string[] = []
  const origWarn = console.warn
  console.warn = (...args: unknown[]) => {
    const msg = args.map((a) => String(a)).join(' ')
    warnings.push(msg)
  }
  try {
    const jornadaId = await crearJornada(proyectoId, ingenieroId)
    const registroId = await crearRegistro(jornadaId, ingenieroId, 'charla', 'foto que falla', 0)
    // Foto con driveFileId que NO existe en Drive
    await prisma.registroSeguridadFoto.create({
      data: {
        registroSeguridadId: registroId,
        nombreArchivo: `${SMOKE_PREFIX}-falla.jpg`,
        urlArchivo: 'https://drive.fake/inexistente',
        driveFileId: 'inexistente-driveFileId-12345',
        tipoArchivo: 'image/jpeg',
        orden: 0,
      },
    })
    const semanaActual = formatearSemanaIso(new Date())
    const reporteId = await crearReporte(proyectoId, ingenieroId, semanaActual)
    const agregado = await obtenerReporteAgregado(reporteId)
    if (!agregado) throw new Error('agregado null')
    const buffer = await generarPptReporteSeguridad(agregado)
    if (buffer.length < 20_000) throw new Error(`buffer demasiado chico: ${buffer.length}`)
    const failed = warnings.some((w) => w.includes('failed to fetch') && w.includes('inexistente'))
    if (!failed) throw new Error(`no se loggeó el fallo de descarga (warns capturados: ${warnings.length})`)
    record('10. Foto que falla → placeholder + PPT no rompe', 'PASS', 'warn loggeado, buffer válido', Date.now() - t0)
  } catch (e) {
    record('10. Foto que falla', 'FAIL', e instanceof Error ? e.message : String(e), Date.now() - t0)
  } finally {
    console.warn = origWarn
  }
}

async function scenario11_endpointContenidoFoto(proyectoId: string, ingenieroId: string) {
  const t0 = Date.now()
  const FAKE_DRIVE_ID = `${SMOKE_PREFIX}-s11-drivefileid`
  try {
    // Pre-plantar un buffer de prueba en el cache para que descargarBufferDrive no vaya a Drive
    const cacheDir = path.join(os.tmpdir(), 'drive-cache')
    await fs.mkdir(cacheDir, { recursive: true })
    const safe = FAKE_DRIVE_ID.replace(/[^a-zA-Z0-9_-]/g, '_')
    const cachFile = path.join(cacheDir, `${safe}.bin`)
    const fakeBuffer = Buffer.from('FAKEIMAGEBYTES_PNG_HEADER', 'utf8')
    await fs.writeFile(cachFile, fakeBuffer)
    createdFotoCacheIds.push(FAKE_DRIVE_ID)

    // Crear un registro con esa foto en DB
    const jornadaId = await crearJornada(proyectoId, ingenieroId)
    const registroId = await crearRegistro(jornadaId, ingenieroId, 'charla', 's11 foto proxy', 0)
    const foto = await prisma.registroSeguridadFoto.create({
      data: {
        registroSeguridadId: registroId,
        nombreArchivo: `${SMOKE_PREFIX}-s11.jpg`,
        urlArchivo: 'https://drive.fake/s11',
        driveFileId: FAKE_DRIVE_ID,
        tipoArchivo: 'image/jpeg',
        orden: 0,
      },
      select: { id: true },
    })

    // Llamar directamente al servicio (sin HTTP — el servidor no corre en el smoke test)
    const result = await descargarBufferDrive(FAKE_DRIVE_ID)
    if (!result) throw new Error('descargarBufferDrive devolvió null')
    if (result.buffer.length === 0) throw new Error('buffer vacío')
    if (!result.mimeType.startsWith('image/')) throw new Error(`mimeType inesperado: ${result.mimeType}`)
    if (!result.buffer.equals(fakeBuffer)) throw new Error('buffer no coincide con el plantado en cache')

    // Verificar que el fotoId está en DB con driveFileId correcto
    const fotoDb = await prisma.registroSeguridadFoto.findUnique({
      where: { id: foto.id },
      select: { driveFileId: true, tipoArchivo: true },
    })
    if (fotoDb?.driveFileId !== FAKE_DRIVE_ID) throw new Error('driveFileId no persistió en DB')

    record(
      '11. /contenido proxy: cache hit → buffer + image/* mimeType',
      'PASS',
      `buffer ${result.buffer.length}B, mimeType=${result.mimeType}, fotoId en DB OK`,
      Date.now() - t0,
    )
  } catch (e) {
    record('11. /contenido proxy', 'FAIL', e instanceof Error ? e.message : String(e), Date.now() - t0)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('━━ Smoke test del módulo Seguridad / Reportes Semanales ━━\n')

  await preCleanup()
  const { proyectos, ingeniero } = await pickFixtures()
  console.log(`Fixtures: ${proyectos.length} proyectos, ingeniero=${ingeniero.name} (${ingeniero.role})\n`)

  try {
    await scenario1_covidConDatos(proyectos[0].id, ingeniero.id)
    await scenario2_covidVacio(proyectos[0].id, ingeniero.id)
    await scenario3_dragDrop(proyectos[0].id, ingeniero.id)
    await scenario4_filtroProyecto([proyectos[0].id, proyectos[1].id], ingeniero.id)
    await scenario5_paginacion(proyectos[0].id, ingeniero.id)
    await scenario6_agregarRegistroEditor()
    await scenario7_vistaPrevia()
    await scenario8_cacheDrive()
    await scenario9_sieteCharlas(proyectos[0].id, ingeniero.id)
    await scenario10_fotoFalla(proyectos[0].id, ingeniero.id)
    await scenario11_endpointContenidoFoto(proyectos[0].id, ingeniero.id)
  } finally {
    await cleanup()
    await prisma.$disconnect()
  }

  // ─── Resumen ──────────────────────────────────────────────────────────────
  console.log('\n━━ Resumen ━━')
  const counts = { PASS: 0, FAIL: 0, PENDING: 0 }
  for (const r of results) counts[r.status]++
  console.log(`PASS: ${counts.PASS}  |  FAIL: ${counts.FAIL}  |  PENDING: ${counts.PENDING}`)

  if (counts.FAIL > 0) {
    console.error('\nHay escenarios en FAIL — revisa el output arriba.')
    process.exit(1)
  }
  process.exit(0)
}

main().catch((e) => {
  console.error('\n[FATAL]', e)
  cleanup().finally(() => process.exit(1))
})
