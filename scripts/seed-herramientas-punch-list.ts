/**
 * Script: seed-herramientas-punch-list.ts
 *
 * Registra el catálogo del Punch List Eléctrico Instrumental en
 * `catalogo_herramienta` con stock inicial registrado vía `registrarMovimiento`
 * (mismo efecto que POST /api/logistica/almacen/herramientas).
 *
 * - Codificación: HME-MAN-XXX | HME-ELE-XXX | HME-MED-XXX
 * - Consulta el último correlativo por categoría para NO reiniciar desde 001
 * - Inserción secuencial, no paralela
 * - Ignora duplicados (P2002) loggeándolos
 *
 * Uso: npx tsx scripts/seed-herramientas-punch-list.ts
 */

import { prisma } from '@/lib/prisma'
import { registrarMovimiento, getAlmacenCentral } from '@/lib/services/almacen'

type Categoria = 'manuales' | 'electricas' | 'medicion'

const PREFIJO: Record<Categoria, string> = {
  manuales: 'HME-MAN',
  electricas: 'HME-ELE',
  medicion: 'HME-MED',
}

interface ItemSeed {
  categoria: Categoria
  nombre: string
  cantidadInicial: number
}

const HERRAMIENTAS: ItemSeed[] = [
  // ─── MANUALES ──────────────────────────────────────────────
  { categoria: 'manuales', nombre: 'Alicate de Corte', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Alicate Universal', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Alicate de Punta', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Alicate Pelacable', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Alicate de Presión', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Arco de Sierra', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Brocha 2"', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Cizalla para Cable', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Cutter', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Destornillador Plano', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Destornillador Estrella', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Dobladora Hidráulica de Tubos Conduit Metálico + Accesorios', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Escalera Tijera de Fibra de Vidrio 3 Pasos', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Escalera Tijera de Fibra de Vidrio 6 Pasos', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Escalera Tijera de Fibra de Vidrio 8 Pasos', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Escuadra', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Espátula de Metal', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Hoja de Sierra', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Lima Redonda', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Lima Plana', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Lima Media Luna', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Lima Triangular', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Llave Allen en Milímetros (Juego)', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Llave Allen en Pulgadas (Juego)', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Llave Francesa 12"', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Llave Mixta (Juego)', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Llave Pico de Loro', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Llave Ratchet (Juego)', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Llave Stilson 14"', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Llave Thorx (Juego)', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Martillo de Bola', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Martillo para Montaje de Andamio', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Maleta de Herramientas de Nylon', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Maleta de Herramientas de Plástico', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Meneke Hembra Monofásico + Tierra 16A', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Meneke Macho Monofásico + Tierra 16A', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Nivel Torpedo Pequeño', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Perillero Plano', cantidadInicial: 3 },
  { categoria: 'manuales', nombre: 'Perillero Estrella', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Prensa Terminal Hidráulica', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Prensa Terminal Ojal', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Prensa Terminal Tubular', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Pulpo para Meneke Monofásico 16A', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Sacabocado Hidráulico', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Soga 20m', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Trípode + Mordaza', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Wincha Métrica 5m', cantidadInicial: 2 },
  { categoria: 'manuales', nombre: 'Wincha Pasacable de Metal', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Wincha Pasacable de PVC', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Cepillo de Metal', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Cincel Plano para Percutor', cantidadInicial: 1 },
  { categoria: 'manuales', nombre: 'Cincel Punta para Percutor', cantidadInicial: 1 },

  // ─── ELÉCTRICAS ────────────────────────────────────────────
  { categoria: 'electricas', nombre: 'Amoladora Inalámbrica', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Amoladora Alámbrica', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Extensión Eléctrica Meneke 16A Monofásico', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Taladro Eléctrico + Accesorios', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Taladro Percutor Inalámbrico', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Tarraja Eléctrica / Roscadora + Accesorios', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Pistola de Calor Inalámbrica', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Sopladora Inalámbrica', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Taladro Inalámbrico + 2 Baterías', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Broca de Concreto 3/8"', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Broca Cobaltada 1/8"', cantidadInicial: 2 },
  { categoria: 'electricas', nombre: 'Broca Cobaltada 5/32"', cantidadInicial: 2 },
  { categoria: 'electricas', nombre: 'Broca Cobaltada 3/16"', cantidadInicial: 2 },
  { categoria: 'electricas', nombre: 'Broca Cobaltada 1/4"', cantidadInicial: 2 },
  { categoria: 'electricas', nombre: 'Broca Cobaltada 5/16"', cantidadInicial: 2 },
  { categoria: 'electricas', nombre: 'Broca Cobaltada 3/8"', cantidadInicial: 2 },
  { categoria: 'electricas', nombre: 'Broca Cobaltada 1/2"', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Copa Hexagonal para Taladro 5/16"', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Copa Hexagonal para Taladro 3/8"', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Copa Hexagonal para Taladro 16mm', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Copa Hexagonal para Taladro 19mm', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Copa Hexagonal para Taladro 25mm', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Copa Hexagonal para Taladro 38mm', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Sierra Copa + Adaptador 1/2 x 1 x 1/4"', cantidadInicial: 2 },
  { categoria: 'electricas', nombre: 'Sierra Copa + Adaptador 1"', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Sierra Copa + Adaptador 1 1/2"', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Lima Rotativa SF-5 para Acero Inoxidable', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Enchufe Leviton Macho', cantidadInicial: 1 },
  { categoria: 'electricas', nombre: 'Enchufe Leviton Hembra', cantidadInicial: 1 },

  // ─── MEDICIÓN ──────────────────────────────────────────────
  { categoria: 'medicion', nombre: 'Impresora Panduit', cantidadInicial: 1 },
  { categoria: 'medicion', nombre: 'Impresora Biovin', cantidadInicial: 1 },
  { categoria: 'medicion', nombre: 'Megómetro Mastech', cantidadInicial: 1 },
  { categoria: 'medicion', nombre: 'Multímetro Fluke', cantidadInicial: 1 },
  { categoria: 'medicion', nombre: 'Detector de Tensión tipo Lapicero', cantidadInicial: 1 },
]

async function obtenerSiguienteCorrelativo(categoria: Categoria): Promise<number> {
  const prefijo = PREFIJO[categoria]
  const existentes = await prisma.catalogoHerramienta.findMany({
    where: { codigo: { startsWith: `${prefijo}-` } },
    select: { codigo: true },
  })
  if (existentes.length === 0) return 1
  // Extraer correlativo numérico y tomar el máximo
  let max = 0
  for (const { codigo } of existentes) {
    const partes = codigo.split('-')
    const num = parseInt(partes[partes.length - 1] ?? '0', 10)
    if (Number.isFinite(num) && num > max) max = num
  }
  return max + 1
}

async function main() {
  // 1. Usuario para registrar los movimientos
  const usuario =
    (await prisma.user.findFirst({ where: { email: 'jesusartemiodev@gmail.com' } })) ??
    (await prisma.user.findFirst({ where: { role: 'admin' } }))
  if (!usuario) throw new Error('No se encontró un usuario admin para registrar los movimientos')

  // 2. Almacén central
  const almacen = await getAlmacenCentral()

  console.log(`👤 Usuario: ${usuario.email}`)
  console.log(`🏬 Almacén: ${almacen.nombre ?? almacen.id}\n`)

  // 3. Correlativo siguiente por categoría
  const siguiente: Record<Categoria, number> = {
    manuales: await obtenerSiguienteCorrelativo('manuales'),
    electricas: await obtenerSiguienteCorrelativo('electricas'),
    medicion: await obtenerSiguienteCorrelativo('medicion'),
  }
  console.log(`📇 Correlativos iniciales:`)
  console.log(`   manuales  → ${PREFIJO.manuales}-${String(siguiente.manuales).padStart(3, '0')}`)
  console.log(`   electricas → ${PREFIJO.electricas}-${String(siguiente.electricas).padStart(3, '0')}`)
  console.log(`   medicion  → ${PREFIJO.medicion}-${String(siguiente.medicion).padStart(3, '0')}`)
  console.log()

  // 4. Inserción secuencial
  let exitosos = 0
  let saltados = 0
  let fallidos = 0
  const errores: string[] = []

  for (const item of HERRAMIENTAS) {
    const num = siguiente[item.categoria]++
    const codigo = `${PREFIJO[item.categoria]}-${String(num).padStart(3, '0')}`

    try {
      await prisma.$transaction(async (tx) => {
        const herr = await tx.catalogoHerramienta.create({
          data: {
            codigo,
            nombre: item.nombre,
            categoria: item.categoria,
            descripcion: 'Punch List Eléctrico Instrumental',
            gestionPorUnidad: false,
            unidadMedida: 'unidad',
          },
        })
        if (item.cantidadInicial > 0) {
          await registrarMovimiento(
            {
              almacenId: almacen.id,
              tipo: 'alta_herramienta',
              catalogoHerramientaId: herr.id,
              cantidad: item.cantidadInicial,
              usuarioId: usuario.id,
              observaciones: 'Alta inicial — Punch List Eléctrico Instrumental',
            },
            tx as any
          )
        }
      })
      console.log(`✓ ${codigo}  ${item.nombre}  (cant: ${item.cantidadInicial})`)
      exitosos++
    } catch (error: any) {
      if (error?.code === 'P2002') {
        console.log(`⚠ ${codigo}  ${item.nombre}  — código ya existe, salto`)
        saltados++
        // Como el código colisionó, no avanzamos el correlativo otra vez: lo que
        // pasó es que ya había una herramienta con ese código. El siguiente
        // item intentará con num+1 automáticamente (ya está incrementado arriba).
      } else {
        console.log(`✗ ${codigo}  ${item.nombre}  — ${error?.message ?? error}`)
        fallidos++
        errores.push(`${codigo} (${item.nombre}): ${error?.message ?? error}`)
      }
    }
  }

  console.log('\n━━━━━━━━━━━━ Resumen ━━━━━━━━━━━━')
  console.log(`Intentados: ${HERRAMIENTAS.length}`)
  console.log(`Exitosos:   ${exitosos}`)
  console.log(`Saltados:   ${saltados}  (código duplicado)`)
  console.log(`Fallidos:   ${fallidos}`)
  if (errores.length) {
    console.log('\nDetalle de errores:')
    errores.forEach(e => console.log(`  - ${e}`))
  }
}

main()
  .catch(e => {
    console.error('Error fatal:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
