// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/importar-plantilla
// 🔧 Descripción: Importar componentes de plantillas en cotizaciones existentes
// ✅ POST: Importar equipos, servicios o gastos desde una plantilla
// ✍️ Autor: GYS AI Assistant
// 📅 Creación: 2025-01-24
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

interface ConflictInfo {
  tipo: 'equipo' | 'servicio' | 'gasto'
  nombreOriginal: string
  nombreConflicto: string
  accionRecomendada: 'reemplazar' | 'mantener_ambos' | 'cancelar'
}

interface ImportResponse {
  equiposImportados: number
  serviciosImportados: number
  gastosImportados: number
  conflictos: ConflictInfo[]
  totalesActualizados: {
    equipos: { interno: number; cliente: number }
    servicios: { interno: number; cliente: number }
    gastos: { interno: number; cliente: number }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🔍 Importar plantilla - ID:', id)
    const session = await getServerSession(authOptions)
    console.log('🔍 Session:', session ? 'exists' : 'null', session?.user ? 'user exists' : 'no user')

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'No autorizado - sesión inválida' }, { status: 401 })
    }

    const data = await request.json()
    const {
      plantillaId,
      tipo,
      opciones = {}
    }: {
      plantillaId: string
      tipo: 'equipos' | 'servicios' | 'gastos'
      opciones?: {
        mantenerNombres?: boolean
        sobreescribirDuplicados?: boolean
        prefijoNombre?: string
      }
    } = data

    // Validar parámetros
    if (!plantillaId || !tipo) {
      return NextResponse.json({
        error: 'plantillaId y tipo son requeridos'
      }, { status: 400 })
    }

    if (!['equipos', 'servicios', 'gastos'].includes(tipo)) {
      return NextResponse.json({
        error: 'tipo debe ser: equipos, servicios o gastos'
      }, { status: 400 })
    }

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cotizacionEquipo: { include: { cotizacionEquipoItem: true } },
        cotizacionServicio: { include: { cotizacionServicioItem: true } },
        cotizacionGasto: { include: { cotizacionGastoItem: true } }
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Verificar que la plantilla existe (puede ser completa o independiente)
    let plantilla: any = null
    let esPlantillaIndependiente = false

    // Primero intentar encontrar en plantillas completas
    plantilla = await prisma.plantilla.findUnique({
      where: { id: plantillaId },
      include: {
        plantillaEquipo: { include: { plantillaEquipoItem: true } },
        plantillaServicio: { include: { plantillaServicioItem: true } },
        plantillaGasto: { include: { plantillaGastoItem: true } }
      }
    })

    if (!plantilla) {
      // Si no es completa, buscar en plantillas independientes
      if (tipo === 'equipos') {
        plantilla = await prisma.plantillaEquipoIndependiente.findUnique({
          where: { id: plantillaId },
          include: {
            plantillaEquipoItemIndependiente: {
              include: {
                catalogoEquipo: true
              }
            }
          }
        })
        esPlantillaIndependiente = true
      } else if (tipo === 'servicios') {
        plantilla = await prisma.plantillaServicioIndependiente.findUnique({
          where: { id: plantillaId },
          include: {
            plantillaServicioItemIndependiente: {
              include: {
                catalogoServicio: true,
                recurso: true,
                unidadServicio: true
              }
            }
          }
        })
        esPlantillaIndependiente = true
      } else if (tipo === 'gastos') {
        plantilla = await prisma.plantillaGastoIndependiente.findUnique({
          where: { id: plantillaId },
          include: {
            plantillaGastoItemIndependiente: true
          }
        })
        esPlantillaIndependiente = true
      }
    }

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    // Normalizar acceso a items para plantillas independientes
    if (esPlantillaIndependiente) {
      if (tipo === 'equipos' && plantilla.plantillaEquipoItemIndependiente) {
        plantilla.items = plantilla.plantillaEquipoItemIndependiente
      } else if (tipo === 'servicios' && plantilla.plantillaServicioItemIndependiente) {
        plantilla.items = plantilla.plantillaServicioItemIndependiente
      } else if (tipo === 'gastos' && plantilla.plantillaGastoItemIndependiente) {
        plantilla.items = plantilla.plantillaGastoItemIndependiente
      }
    }

    // Validar que la plantilla tenga contenido para el tipo solicitado
    if (esPlantillaIndependiente) {
      // Para plantillas independientes, verificar que tenga items (excepto servicios que pueden estar vacíos)
      if (tipo !== 'servicios' && (!plantilla.items || plantilla.items.length === 0)) {
        return NextResponse.json({
          error: `La plantilla no contiene ${tipo} para importar`
        }, { status: 400 })
      }
    } else {
      // Para plantillas completas, verificar las secciones correspondientes
      if (tipo === 'equipos' && (!plantilla.plantillaEquipo || plantilla.plantillaEquipo.length === 0)) {
        return NextResponse.json({
          error: 'La plantilla no contiene equipos para importar'
        }, { status: 400 })
      }

      if (tipo === 'servicios' && (!plantilla.plantillaServicio || plantilla.plantillaServicio.length === 0)) {
        return NextResponse.json({
          error: 'La plantilla no contiene servicios para importar'
        }, { status: 400 })
      }

      if (tipo === 'gastos' && (!plantilla.plantillaGasto || plantilla.plantillaGasto.length === 0)) {
        return NextResponse.json({
          error: 'La plantilla no contiene gastos para importar'
        }, { status: 400 })
      }
    }

    // Detectar conflictos
    const conflictos = detectarConflictos(cotizacion, plantilla, tipo, opciones, esPlantillaIndependiente)

    // Si hay conflictos críticos y no se permite sobreescribir, cancelar
    const conflictosCriticos = conflictos.filter(c => c.accionRecomendada === 'cancelar')
    if (conflictosCriticos.length > 0 && !opciones.sobreescribirDuplicados) {
      return NextResponse.json({
        error: 'Existen conflictos que impiden la importación',
        conflictos: conflictosCriticos
      }, { status: 400 })
    }

    // Realizar la importación usando una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      let equiposImportados = 0
      let serviciosImportados = 0
      let gastosImportados = 0

      // Importar equipos
      if (tipo === 'equipos') {
        if (esPlantillaIndependiente) {
          // Para plantillas independientes de equipos, crear un solo grupo
          let nombreFinal = plantilla.nombre
          if (!opciones.mantenerNombres) {
            nombreFinal = resolverNombreConflicto(
              nombreFinal,
              cotizacion.cotizacionEquipo?.map(e => e.nombre) || [],
              opciones.prefijoNombre
            )
          }

          // Calcular subtotales para la plantilla independiente
          const subtotalInterno = plantilla.items.reduce((sum: number, item: any) => sum + (item.costoInterno || 0), 0)
          const subtotalCliente = plantilla.items.reduce((sum: number, item: any) => sum + (item.costoCliente || 0), 0)

          const nuevoEquipo = await tx.cotizacionEquipo.create({
            data: {
              id: randomUUID(),
              cotizacionId: id,
              nombre: nombreFinal,
              descripcion: plantilla.descripcion,
              subtotalInterno,
              subtotalCliente,
              updatedAt: new Date(),
              cotizacionEquipoItem: {
                create: plantilla.items.map((item: any) => ({
                  id: randomUUID(),
                  ...(item.catalogoEquipoId && {
                    catalogoEquipo: { connect: { id: item.catalogoEquipoId } }
                  }),
                  codigo: item.codigo || '',
                  descripcion: item.descripcion || '',
                  categoria: item.categoria || '',
                  unidad: item.unidad || '',
                  marca: item.marca || '',
                  cantidad: item.cantidad || 0,
                  precioInterno: item.precioInterno || 0,
                  precioCliente: item.precioCliente || 0,
                  costoInterno: item.costoInterno || 0,
                  costoCliente: item.costoCliente || 0,
                  updatedAt: new Date(),
                }))
              }
            }
          })
          equiposImportados++
        } else if (plantilla.plantillaEquipo) {
          // Para plantillas completas, importar cada grupo de equipos
          for (const equipoGrupo of plantilla.plantillaEquipo) {
            // Resolver nombre si hay conflicto
            let nombreFinal = equipoGrupo.nombre
            if (!opciones.mantenerNombres) {
              nombreFinal = resolverNombreConflicto(
                nombreFinal,
                cotizacion.cotizacionEquipo?.map(e => e.nombre) || [],
                opciones.prefijoNombre
              )
            }

            const nuevoEquipo = await tx.cotizacionEquipo.create({
              data: {
                id: randomUUID(),
                cotizacionId: id,
                nombre: nombreFinal,
                descripcion: equipoGrupo.descripcion,
                subtotalInterno: equipoGrupo.subtotalInterno || 0,
                subtotalCliente: equipoGrupo.subtotalCliente || 0,
                updatedAt: new Date(),
                cotizacionEquipoItem: {
                  create: (equipoGrupo.plantillaEquipoItem || []).map((item: any) => ({
                    id: randomUUID(),
                    ...(item.catalogoEquipoId && {
                      catalogoEquipo: { connect: { id: item.catalogoEquipoId } }
                    }),
                    codigo: item.codigo || '',
                    descripcion: item.descripcion || '',
                    edtId: item.edtId || null,
                    unidad: item.unidad || '',
                    marca: item.marca || '',
                    cantidad: item.cantidad || 0,
                    precioInterno: item.precioInterno || 0,
                    precioCliente: item.precioCliente || 0,
                    costoInterno: item.costoInterno || 0,
                    costoCliente: item.costoCliente || 0,
                    updatedAt: new Date(),
                  }))
                }
              }
            })
            equiposImportados++
          }
        }
      }

      // Importar servicios
      if (tipo === 'servicios') {
        if (esPlantillaIndependiente) {
          // Para plantillas independientes de servicios, crear un solo grupo
          let nombreFinal = plantilla.nombre
          if (!opciones.mantenerNombres) {
            nombreFinal = resolverNombreConflicto(
              nombreFinal,
              cotizacion.cotizacionServicio?.map(s => s.nombre) || [],
              opciones.prefijoNombre
            )
          }

          // Calcular subtotales para la plantilla independiente
          const subtotalInterno = plantilla.items.reduce((sum: number, item: any) => sum + (item.costoInterno || 0), 0)
          const subtotalCliente = plantilla.items.reduce((sum: number, item: any) => sum + (item.costoCliente || 0), 0)

          // Usar edtId directo de la plantilla o buscar uno por defecto
          let edtId = plantilla.edtId
          if (!edtId) {
            // Buscar primer EDT disponible como fallback
            const defaultEdt = await tx.edt.findFirst({
              orderBy: { nombre: 'asc' }
            })
            edtId = defaultEdt?.id
          }
          if (!edtId) {
            throw new Error('No se encontró ningún EDT disponible. Por favor, cree al menos un EDT antes de importar servicios.')
          }

          const nuevoServicio = await tx.cotizacionServicio.create({
            data: {
              id: randomUUID(),
              cotizacionId: id,
              nombre: nombreFinal,
              edtId: edtId,
              subtotalInterno,
              subtotalCliente,
              updatedAt: new Date(),
              ...(plantilla.items && plantilla.items.length > 0 && {
                cotizacionServicioItem: {
                  create: plantilla.items.map((item: any) => ({
                    id: randomUUID(),
                    catalogoServicioId: item.catalogoServicioId || null,
                    edtId: item.edtId || edtId,
                    unidadServicioId: item.unidadServicioId,
                    recursoId: item.recursoId,
                    unidadServicioNombre: item.unidadServicioNombre || '',
                    recursoNombre: item.recursoNombre || '',
                    formula: item.formula || '',
                    horaBase: item.horaBase || null,
                    horaRepetido: item.horaRepetido || null,
                    horaUnidad: item.horaUnidad || null,
                    horaFijo: item.horaFijo || null,
                    costoHora: item.costoHora || 0,
                    nombre: item.catalogoServicio?.nombre || item.nombre || '',
                    descripcion: item.descripcion || '',
                    cantidad: item.cantidad || 0,
                    horaTotal: item.horaTotal || 0,
                    factorSeguridad: item.factorSeguridad || 1.0,
                    margen: item.margen || 1.0,
                    costoInterno: item.costoInterno || 0,
                    costoCliente: item.costoCliente || 0,
                    orden: item.orden || 0,
                    updatedAt: new Date(),
                  }))
                }
              })
            }
          })
          serviciosImportados++
        } else if (plantilla.plantillaServicio) {
          // Para plantillas completas, importar cada grupo de servicios
          for (const servicioGrupo of plantilla.plantillaServicio) {
            let nombreFinal = servicioGrupo.nombre
            if (!opciones.mantenerNombres) {
              nombreFinal = resolverNombreConflicto(
                nombreFinal,
                cotizacion.cotizacionServicio?.map(s => s.nombre) || [],
                opciones.prefijoNombre
              )
            }

            const nuevoServicio = await tx.cotizacionServicio.create({
              data: {
                id: randomUUID(),
                cotizacionId: id,
                nombre: nombreFinal,
                edtId: servicioGrupo.edtId || null,
                subtotalInterno: servicioGrupo.subtotalInterno || 0,
                subtotalCliente: servicioGrupo.subtotalCliente || 0,
                updatedAt: new Date(),
                cotizacionServicioItem: {
                  create: (servicioGrupo.plantillaServicioItem || []).map((item: any) => ({
                    id: randomUUID(),
                    catalogoServicioId: item.catalogoServicioId || null,
                    edtId: item.edtId || null,
                    unidadServicioId: item.unidadServicioId,
                    recursoId: item.recursoId,
                    unidadServicioNombre: item.unidadServicioNombre || '',
                    recursoNombre: item.recursoNombre || '',
                    formula: item.formula || '',
                    horaBase: item.horaBase || null,
                    horaRepetido: item.horaRepetido || null,
                    horaUnidad: item.horaUnidad || null,
                    horaFijo: item.horaFijo || null,
                    costoHora: item.costoHora || 0,
                    nombre: item.catalogoServicio?.nombre || item.nombre || '',
                    descripcion: item.descripcion || '',
                    cantidad: item.cantidad || 0,
                    horaTotal: item.horaTotal || 0,
                    factorSeguridad: item.factorSeguridad || 1.0,
                    margen: item.margen || 1.0,
                    costoInterno: item.costoInterno || 0,
                    costoCliente: item.costoCliente || 0,
                    orden: item.orden || 0,
                    updatedAt: new Date(),
                  }))
                }
              }
            })
            serviciosImportados++
          }
        }
      }

      // Importar gastos
      if (tipo === 'gastos') {
        if (esPlantillaIndependiente) {
          // Para plantillas independientes de gastos, crear un solo grupo
          let nombreFinal = plantilla.nombre
          if (!opciones.mantenerNombres) {
            nombreFinal = resolverNombreConflicto(
              nombreFinal,
              cotizacion.cotizacionGasto?.map(g => g.nombre) || [],
              opciones.prefijoNombre
            )
          }

          // Calcular subtotales para la plantilla independiente
          const subtotalInterno = plantilla.items.reduce((sum: number, item: any) => sum + (item.costoInterno || 0), 0)
          const subtotalCliente = plantilla.items.reduce((sum: number, item: any) => sum + (item.costoCliente || 0), 0)

          const nuevoGasto = await tx.cotizacionGasto.create({
            data: {
              id: randomUUID(),
              cotizacionId: id,
              nombre: nombreFinal,
              descripcion: plantilla.descripcion,
              subtotalInterno,
              subtotalCliente,
              updatedAt: new Date(),
              cotizacionGastoItem: {
                create: plantilla.items.map((item: any) => ({
                  id: randomUUID(),
                  nombre: item.nombre || '',
                  descripcion: item.descripcion || null,
                  cantidad: item.cantidad || 0,
                  precioUnitario: item.precioUnitario || 0,
                  factorSeguridad: item.factorSeguridad || 1.0,
                  margen: item.margen || 1.0,
                  costoInterno: item.costoInterno || 0,
                  costoCliente: item.costoCliente || 0,
                  updatedAt: new Date(),
                }))
              }
            }
          })
          gastosImportados++
        } else if (plantilla.plantillaGasto) {
          // Para plantillas completas, importar cada grupo de gastos
          for (const gastoGrupo of plantilla.plantillaGasto) {
            let nombreFinal = gastoGrupo.nombre
            if (!opciones.mantenerNombres) {
              nombreFinal = resolverNombreConflicto(
                nombreFinal,
                cotizacion.cotizacionGasto?.map(g => g.nombre) || [],
                opciones.prefijoNombre
              )
            }

            const nuevoGasto = await tx.cotizacionGasto.create({
              data: {
                id: randomUUID(),
                cotizacionId: id,
                nombre: nombreFinal,
                descripcion: gastoGrupo.descripcion,
                subtotalInterno: gastoGrupo.subtotalInterno || 0,
                subtotalCliente: gastoGrupo.subtotalCliente || 0,
                updatedAt: new Date(),
                cotizacionGastoItem: {
                  create: (gastoGrupo.plantillaGastoItem || []).map((item: any) => ({
                    id: randomUUID(),
                    nombre: item.nombre || '',
                    descripcion: item.descripcion || null,
                    cantidad: item.cantidad || 0,
                    precioUnitario: item.precioUnitario || 0,
                    factorSeguridad: item.factorSeguridad || 1.0,
                    margen: item.margen || 1.0,
                    costoInterno: item.costoInterno || 0,
                    costoCliente: item.costoCliente || 0,
                    updatedAt: new Date(),
                  }))
                }
              }
            })
            gastosImportados++
          }
        }
      }

      // Registrar la importación (solo para plantillas principales, no independientes)
      if (!esPlantillaIndependiente) {
        await tx.cotizacionPlantillaImport.create({
          data: {
            id: randomUUID(),
            cotizacionId: id,
            plantillaId: plantillaId,
            tipoImportacion: tipo,
            usuarioId: session.user.id
          }
        })
      }

      // Recalcular totales de la cotización
      const totalesActualizados = await recalcularTotalesCotizacion(tx, id)

      return {
        equiposImportados,
        serviciosImportados,
        gastosImportados,
        totalesActualizados
      }
    })

    const response: ImportResponse = {
      ...resultado,
      conflictos
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('❌ Error al importar plantilla:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    return NextResponse.json({
      error: 'Error interno del servidor',
      detalles: error instanceof Error ? error.message : 'Error desconocido',
      debug: {
        errorType: error?.constructor?.name || 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : null
      }
    }, { status: 500 })
  }
}

// Funciones auxiliares

function detectarConflictos(
  cotizacion: any,
  plantilla: any,
  tipo: string,
  opciones: any,
  esPlantillaIndependiente: boolean = false
): ConflictInfo[] {
  const conflictos: ConflictInfo[] = []

  if (tipo === 'equipos') {
    const nombresExistentes = cotizacion.cotizacionEquipo?.map((e: any) => e.nombre) || []
    if (esPlantillaIndependiente) {
      // Para plantillas independientes, verificar conflicto con el nombre de la plantilla
      if (nombresExistentes.includes(plantilla.nombre)) {
        conflictos.push({
          tipo: 'equipo',
          nombreOriginal: plantilla.nombre,
          nombreConflicto: plantilla.nombre,
          accionRecomendada: opciones.sobreescribirDuplicados ? 'reemplazar' : 'mantener_ambos'
        })
      }
    } else if (plantilla.plantillaEquipo) {
      // Para plantillas completas, verificar cada grupo
      plantilla.plantillaEquipo.forEach((equipo: any) => {
        if (nombresExistentes.includes(equipo.nombre)) {
          conflictos.push({
            tipo: 'equipo',
            nombreOriginal: equipo.nombre,
            nombreConflicto: equipo.nombre,
            accionRecomendada: opciones.sobreescribirDuplicados ? 'reemplazar' : 'mantener_ambos'
          })
        }
      })
    }
  }

  if (tipo === 'servicios') {
    const nombresExistentes = cotizacion.cotizacionServicio?.map((s: any) => s.nombre) || []
    if (esPlantillaIndependiente) {
      // Para plantillas independientes, verificar conflicto con el nombre de la plantilla
      if (nombresExistentes.includes(plantilla.nombre)) {
        conflictos.push({
          tipo: 'servicio',
          nombreOriginal: plantilla.nombre,
          nombreConflicto: plantilla.nombre,
          accionRecomendada: opciones.sobreescribirDuplicados ? 'reemplazar' : 'mantener_ambos'
        })
      }
    } else if (plantilla.plantillaServicio) {
      // Para plantillas completas, verificar cada grupo
      plantilla.plantillaServicio.forEach((servicio: any) => {
        if (nombresExistentes.includes(servicio.nombre)) {
          conflictos.push({
            tipo: 'servicio',
            nombreOriginal: servicio.nombre,
            nombreConflicto: servicio.nombre,
            accionRecomendada: opciones.sobreescribirDuplicados ? 'reemplazar' : 'mantener_ambos'
          })
        }
      })
    }
  }

  if (tipo === 'gastos') {
    const nombresExistentes = cotizacion.cotizacionGasto?.map((g: any) => g.nombre) || []
    if (esPlantillaIndependiente) {
      // Para plantillas independientes, verificar conflicto con el nombre de la plantilla
      if (nombresExistentes.includes(plantilla.nombre)) {
        conflictos.push({
          tipo: 'gasto',
          nombreOriginal: plantilla.nombre,
          nombreConflicto: plantilla.nombre,
          accionRecomendada: opciones.sobreescribirDuplicados ? 'reemplazar' : 'mantener_ambos'
        })
      }
    } else if (plantilla.plantillaGasto) {
      // Para plantillas completas, verificar cada grupo
      plantilla.plantillaGasto.forEach((gasto: any) => {
        if (nombresExistentes.includes(gasto.nombre)) {
          conflictos.push({
            tipo: 'gasto',
            nombreOriginal: gasto.nombre,
            nombreConflicto: gasto.nombre,
            accionRecomendada: opciones.sobreescribirDuplicados ? 'reemplazar' : 'mantener_ambos'
          })
        }
      })
    }
  }

  return conflictos
}

function resolverNombreConflicto(
  nombreOriginal: string,
  nombresExistentes: string[],
  prefijo?: string
): string {
  let nombreFinal = nombreOriginal
  let contador = 1

  while (nombresExistentes.includes(nombreFinal)) {
    nombreFinal = prefijo
      ? `${prefijo} ${nombreOriginal} (${contador})`
      : `${nombreOriginal} (${contador})`
    contador++
  }

  return nombreFinal
}

async function recalcularTotalesCotizacion(tx: any, cotizacionId: string) {
  // Recalcular totales de equipos
  const equiposTotal = await tx.cotizacionEquipo.aggregate({
    where: { cotizacionId },
    _sum: {
      subtotalInterno: true,
      subtotalCliente: true
    }
  })

  // Recalcular totales de servicios
  const serviciosTotal = await tx.cotizacionServicio.aggregate({
    where: { cotizacionId },
    _sum: {
      subtotalInterno: true,
      subtotalCliente: true
    }
  })

  // Recalcular totales de gastos
  const gastosTotal = await tx.cotizacionGasto.aggregate({
    where: { cotizacionId },
    _sum: {
      subtotalInterno: true,
      subtotalCliente: true
    }
  })

  // Calcular grand total
  const totalInterno = (equiposTotal._sum.subtotalInterno || 0) +
                      (serviciosTotal._sum.subtotalInterno || 0) +
                      (gastosTotal._sum.subtotalInterno || 0)

  const totalCliente = (equiposTotal._sum.subtotalCliente || 0) +
                      (serviciosTotal._sum.subtotalCliente || 0) +
                      (gastosTotal._sum.subtotalCliente || 0)

  // Actualizar cotización
  await tx.cotizacion.update({
    where: { id: cotizacionId },
    data: {
      totalEquiposInterno: equiposTotal._sum.subtotalInterno || 0,
      totalEquiposCliente: equiposTotal._sum.subtotalCliente || 0,
      totalServiciosInterno: serviciosTotal._sum.subtotalInterno || 0,
      totalServiciosCliente: serviciosTotal._sum.subtotalCliente || 0,
      totalGastosInterno: gastosTotal._sum.subtotalInterno || 0,
      totalGastosCliente: gastosTotal._sum.subtotalCliente || 0,
      totalInterno,
      totalCliente,
      grandTotal: totalCliente
    }
  })

  return {
    equipos: {
      interno: equiposTotal._sum.subtotalInterno || 0,
      cliente: equiposTotal._sum.subtotalCliente || 0
    },
    servicios: {
      interno: serviciosTotal._sum.subtotalInterno || 0,
      cliente: serviciosTotal._sum.subtotalCliente || 0
    },
    gastos: {
      interno: gastosTotal._sum.subtotalInterno || 0,
      cliente: gastosTotal._sum.subtotalCliente || 0
    }
  }
}