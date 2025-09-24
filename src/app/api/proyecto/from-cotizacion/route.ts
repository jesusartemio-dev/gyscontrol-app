// ===================================================
// 📁 Archivo: from-cotizacion/route.ts
// 📌 Crea un proyecto a partir de una cotización aprobada
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProyectoFromCotizacionSchema } from '@/lib/validators/proyecto'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

// ✅ Tipo explícito para cotización con includes
type CotizacionConIncludes = Prisma.CotizacionGetPayload<{
  include: {
    cliente: true
    equipos: { include: { items: true } }
    servicios: { include: { items: true } }
    gastos: { include: { items: true } }
    fases: true
    cronograma: {
      include: {
        categoriaServicio: true
        responsable: true
        cotizacionFase: true
        tareas: {
          include: {
            responsable: true
          }
        }
      }
    }
  }
}>

// ✅ Types for cotizacion items
type CotizacionEquipoItem = {
  id: string
  catalogoEquipoId: string
  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string
  cantidad: number
  precioInterno: number
  precioCliente: number
  costoInterno: number
  costoCliente: number
}

type CotizacionServicioItem = {
  id: string
  catalogoServicioId: string
  categoria: string
  costoHora: number
  margen: number
  nombre: string
  horaTotal: number
  costoInterno: number
  costoCliente: number
}

type CotizacionGastoItem = {
  id: string
  nombre: string
  descripcion: string
  cantidad: number
  precioUnitario: number
  factorSeguridad: number
  margen: number
  costoInterno: number
  costoCliente: number
}

// ✅ Types for cotizacion groups with items
type CotizacionEquipoWithItems = {
  id: string
  nombre: string
  descripcion: string
  subtotalInterno: number
  subtotalCliente: number
  items: CotizacionEquipoItem[]
}

type CotizacionServicioWithItems = {
  id: string
  nombre: string
  categoria: string
  subtotalInterno: number
  subtotalCliente: number
  items: CotizacionServicioItem[]
}

type CotizacionGastoWithItems = {
  id: string
  nombre: string
  descripcion: string
  subtotalInterno: number
  subtotalCliente: number
  items: CotizacionGastoItem[]
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // ✅ Validate request body using the new schema (includes cotizacionId)
    const validatedData = createProyectoFromCotizacionSchema.parse(body)
    const { 
      cotizacionId, 
      nombre, 
      fechaInicio, 
      fechaFin, 
      gestorId, 
      estado = 'creado',
      totalEquiposInterno,
      totalServiciosInterno,
      totalGastosInterno,
      totalInterno,
      totalCliente,
      descuento,
      grandTotal,
      clienteId,
      comercialId
    } = validatedData

    // ✅ Validate required fields
    if (!cotizacionId) {
      return NextResponse.json(
        { error: 'cotizacionId es requerido' },
        { status: 400 }
      )
    }

    const cotizacion: CotizacionConIncludes | null = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: true,
        equipos: { include: { items: true } },
        servicios: { include: { items: true } },
        gastos: { include: { items: true } },
        fases: true,
        cronograma: {
          include: {
            categoriaServicio: true,
            responsable: true,
            cotizacionFase: true,
            tareas: {
              include: {
                responsable: true
              }
            }
          }
        }
      },
    })

    if (!cotizacion || cotizacion.estado !== 'aprobada') {
      return NextResponse.json({ error: 'Cotización no válida o no aprobada' }, { status: 400 })
    }

    // ✅ Validar que la cotización tenga cliente y comercial asignados
    if (!cotizacion.clienteId || !cotizacion.comercialId || !cotizacion.cliente) {
      return NextResponse.json({ 
        error: 'La cotización debe tener cliente y comercial asignados' 
      }, { status: 400 })
    }

    // 🔁 Auto-generate project code using cliente.codigo + formatted numeroSecuencia
    const cliente = cotizacion.cliente
    const currentSequence = cliente.numeroSecuencia || 1
    
    // 📡 Format sequence number: 2 digits if < 100, 3 digits if >= 100
    const formattedSequence = currentSequence < 100 
      ? currentSequence.toString().padStart(2, '0')
      : currentSequence.toString().padStart(3, '0')
    
    const generatedCodigo = `${cliente.codigo}${formattedSequence}`

    // 🔁 Update client's sequence number for next project
    await prisma.cliente.update({
      where: { id: cliente.id },
      data: { numeroSecuencia: currentSequence + 1 }
    })

    // 🔁 Calculate totals from request data or cotización data as fallback
    const finalTotalEquiposInterno = totalEquiposInterno ?? cotizacion.equipos.reduce((sum: number, grupo) => sum + (grupo as any).subtotalInterno, 0)
    const finalTotalServiciosInterno = totalServiciosInterno ?? cotizacion.servicios.reduce((sum: number, grupo) => sum + grupo.subtotalInterno, 0)
    const finalTotalGastosInterno = totalGastosInterno ?? cotizacion.gastos.reduce((sum: number, grupo) => sum + grupo.subtotalInterno, 0)
    const finalTotalInterno = totalInterno ?? (finalTotalEquiposInterno + finalTotalServiciosInterno + finalTotalGastosInterno)
    
    const finalTotalCliente = totalCliente ?? cotizacion.totalCliente ?? 0
    const finalDescuento = descuento ?? cotizacion.descuento ?? 0
    const finalGrandTotal = grandTotal ?? cotizacion.grandTotal ?? finalTotalCliente

    const proyecto = await prisma.proyecto.create({
      data: {
        clienteId: clienteId ?? cotizacion.clienteId,
        comercialId: comercialId ?? cotizacion.comercialId,
        gestorId,
        cotizacionId,
        nombre,
        codigo: generatedCodigo, // ✅ Use auto-generated code
        estado,
        fechaInicio: new Date(fechaInicio),
        fechaFin: fechaFin ? new Date(fechaFin) : undefined,

        totalEquiposInterno: finalTotalEquiposInterno,
        totalServiciosInterno: finalTotalServiciosInterno,
        totalGastosInterno: finalTotalGastosInterno,
        totalInterno: finalTotalInterno,
        totalCliente: finalTotalCliente,
        descuento: finalDescuento,
        grandTotal: finalGrandTotal,

        equipos: {
          create: cotizacion.equipos.map((grupo) => ({
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            subtotalInterno: (grupo as any).subtotalInterno,
            subtotalCliente: (grupo as any).subtotalCliente,
            responsableId: gestorId,
            items: {
              create: grupo.items.map((item) => ({
                catalogoEquipoId: item.catalogoEquipoId,
                codigo: item.codigo,
                descripcion: item.descripcion,
                categoria: item.categoria,
                unidad: item.unidad,
                marca: item.marca,
                cantidad: item.cantidad,
                precioInterno: item.precioInterno,
                precioCliente: item.precioCliente,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
              })),
            },
          })),
        },

        servicios: {
          create: cotizacion.servicios.map((grupo) => ({
            nombre: grupo.nombre,
            categoria: grupo.categoria,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            responsableId: gestorId,
            items: {
              create: grupo.items.map((item) => ({
                catalogoServicioId: item.catalogoServicioId,
                categoria: item.categoria,
                costoHoraInterno: item.costoHora,
                costoHoraCliente: item.costoHora * item.margen,
                nombre: item.nombre,
                cantidadHoras: item.horaTotal,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
              })),
            },
          })),
        },

        gastos: {
          create: cotizacion.gastos.map((grupo) => ({
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            items: {
              create: grupo.items.map((item) => ({
                nombre: item.nombre,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                factorSeguridad: item.factorSeguridad,
                margen: item.margen,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
              })),
            },
          })),
        },
      },
    })

    // ✅ Convertir EDTs comerciales a jerarquía completa de 4 niveles
    let cronogramaConvertido = 0
    if (cotizacion.cronograma && cotizacion.cronograma.length > 0) {
      try {
        console.log(`📅 Convirtiendo ${cotizacion.cronograma.length} EDTs comerciales a jerarquía de 4 niveles para proyecto ${proyecto.id}`)

        // Crear cronograma comercial
        const cronogramaComercial = await (prisma as any).proyectoCronograma.create({
          data: {
            proyectoId: proyecto.id,
            tipo: 'comercial',
            nombre: 'Cronograma Comercial',
            copiadoDesdeCotizacionId: cotizacion.id,
            esBaseline: true,
            version: 1
          }
        })

        console.log(`✅ Cronograma comercial creado: ${cronogramaComercial.id}`)

        // ✅ PASO 1: Crear TODAS las fases desde la cotización primero
        const fasesMap = new Map<string, string>() // Map<cotizacionFaseId, proyectoFaseId>

        if (cotizacion.fases && cotizacion.fases.length > 0) {
          console.log(`📋 Creando ${cotizacion.fases.length} fases desde cotización...`)

          for (const faseCotizacion of cotizacion.fases) {
            const nuevaFase = await (prisma as any).proyectoFase.create({
              data: {
                proyectoId: proyecto.id,
                proyectoCronogramaId: cronogramaComercial.id,
                nombre: faseCotizacion.nombre,
                descripcion: faseCotizacion.descripcion,
                orden: faseCotizacion.orden,
                estado: 'planificado',
                porcentajeAvance: 0,
                fechaInicioPlan: faseCotizacion.fechaInicioPlan ? new Date(faseCotizacion.fechaInicioPlan) : undefined,
                fechaFinPlan: faseCotizacion.fechaFinPlan ? new Date(faseCotizacion.fechaFinPlan) : undefined
              }
            })
            fasesMap.set(faseCotizacion.id, nuevaFase.id)
            console.log(`✅ Fase creada: ${nuevaFase.nombre} (${nuevaFase.id})`)
          }
        } else {
          // Crear fase por defecto si no hay fases en la cotización
          const fasePorDefecto = await (prisma as any).proyectoFase.create({
            data: {
              proyectoId: proyecto.id,
              proyectoCronogramaId: cronogramaComercial.id,
              nombre: 'Fase Principal',
              descripcion: 'Fase principal del proyecto',
              orden: 1,
              estado: 'planificado',
              porcentajeAvance: 0
            }
          })
          fasesMap.set('default', fasePorDefecto.id)
          console.log(`✅ Fase por defecto creada: ${fasePorDefecto.id}`)
        }

        // ✅ PASO 2: Crear EDTs y asociarlos a las fases correspondientes
        console.log(`🔧 Creando ${cotizacion.cronograma.length} EDTs...`)

        for (const edtComercial of cotizacion.cronograma) {
          console.log(`🔧 Procesando EDT comercial: ${edtComercial.id} - ${edtComercial.nombre}`)

          // Determinar fase para el EDT
          let faseId: string | undefined
          if (edtComercial.cotizacionFaseId && fasesMap.has(edtComercial.cotizacionFaseId)) {
            faseId = fasesMap.get(edtComercial.cotizacionFaseId)
            console.log(`📋 EDT asignado a fase: ${faseId}`)
          } else if (fasesMap.has('default')) {
            faseId = fasesMap.get('default')
            console.log(`📋 EDT asignado a fase por defecto: ${faseId}`)
          } else {
            // Si no hay fase por defecto, usar la primera fase creada
            faseId = Array.from(fasesMap.values())[0]
            console.log(`📋 EDT asignado a primera fase disponible: ${faseId}`)
          }

          // Obtener categoriaServicioId - puede venir directamente o a través de la relación
          let categoriaServicioId = edtComercial.categoriaServicioId
          if (!categoriaServicioId && edtComercial.categoriaServicio) {
            categoriaServicioId = edtComercial.categoriaServicio.id
          }

          // Si no hay categoriaServicioId, intentar obtenerlo del servicio relacionado
          if (!categoriaServicioId) {
            // Buscar el servicio correspondiente para obtener la categoría
            const servicioRelacionado = cotizacion.servicios.find(s =>
              s.id === edtComercial.cotizacionServicioId
            )
            if (servicioRelacionado) {
              // categoria es un string, necesitamos encontrar la CategoriaServicio por nombre
              const categoriaServicio = await prisma.categoriaServicio.findFirst({
                where: { nombre: servicioRelacionado.categoria }
              })
              if (categoriaServicio) {
                categoriaServicioId = categoriaServicio.id
              }
            }
          }

          if (!categoriaServicioId) {
            console.warn(`⚠️ EDT comercial ${edtComercial.id} no tiene categoriaServicioId válido, usando categoría genérica`)
            // Buscar una categoría de servicio por defecto o crear una genérica
            const categoriaDefault = await prisma.categoriaServicio.findFirst({
              where: { nombre: { contains: 'General' } }
            }) || await prisma.categoriaServicio.findFirst()

            if (categoriaDefault) {
              categoriaServicioId = categoriaDefault.id
            } else {
              console.error(`❌ No se pudo encontrar categoriaServicioId para EDT ${edtComercial.id}, saltando...`)
              continue
            }
          }

          try {
            const edtProyecto = await (prisma as any).proyectoEdt.create({
              data: {
                proyectoId: proyecto.id,
                proyectoCronogramaId: cronogramaComercial.id,
                proyectoFaseId: faseId,
                nombre: edtComercial.nombre || `EDT ${edtComercial.id}`,
                categoriaServicioId: categoriaServicioId,
                zona: edtComercial.zona,
                fechaInicioPlan: edtComercial.fechaInicioComercial,
                fechaFinPlan: edtComercial.fechaFinComercial,
                horasPlan: new Prisma.Decimal(edtComercial.horasEstimadas || 0),
                responsableId: edtComercial.responsableId,
                descripcion: edtComercial.descripcion,
                prioridad: edtComercial.prioridad || 'media',
                estado: 'planificado',
                porcentajeAvance: 0
              }
            })

            console.log(`✅ EDT proyecto creado: ${edtProyecto.id} desde comercial ${edtComercial.id}`)

            // Convertir tareas comerciales a tareas ejecutables (4to nivel)
            if (edtComercial.tareas && edtComercial.tareas.length > 0) {
              console.log(`📝 Procesando ${edtComercial.tareas.length} tareas para EDT ${edtProyecto.id}`)

              for (const tareaComercial of edtComercial.tareas) {
                console.log(`📝 Procesando tarea: ${tareaComercial.nombre}`)

                // Crear tarea incluso si no tiene fechas específicas
                const fechaInicio = tareaComercial.fechaInicio || edtComercial.fechaInicioComercial || new Date()
                const fechaFin = tareaComercial.fechaFin || edtComercial.fechaFinComercial || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 días por defecto

                try {
                  const tareaProyecto = await (prisma as any).proyectoTarea.create({
                    data: {
                      proyectoEdtId: edtProyecto.id,
                      proyectoCronogramaId: cronogramaComercial.id,
                      nombre: tareaComercial.nombre || `Tarea ${tareaComercial.id}`,
                      descripcion: tareaComercial.descripcion,
                      fechaInicio: fechaInicio,
                      fechaFin: fechaFin,
                      horasEstimadas: tareaComercial.horasEstimadas,
                      prioridad: tareaComercial.prioridad || 'media',
                      responsableId: tareaComercial.responsableId,
                      estado: 'pendiente',
                      porcentajeCompletado: 0
                    }
                  })

                  console.log(`✅ Tarea ejecutable creada: ${tareaProyecto.id} desde comercial ${tareaComercial.id}`)

                  // Crear registro de horas inicial basado en la tarea
                  if (tareaComercial.horasEstimadas && Number(tareaComercial.horasEstimadas) > 0) {
                    try {
                      // Obtener el primer servicio de proyecto para asociar las horas
                      const primerServicioProyecto = await prisma.proyectoServicio.findFirst({
                        where: { proyectoId: proyecto.id }
                      })

                      await prisma.registroHoras.create({
                        data: {
                          proyectoId: proyecto.id,
                          proyectoServicioId: primerServicioProyecto?.id || '',
                          categoria: edtComercial.categoriaServicio?.nombre || 'Sin categoría',
                          nombreServicio: tareaComercial.nombre || `Tarea ${tareaComercial.id}`,
                          recursoId: '', // TODO: Determinar recurso apropiado
                          recursoNombre: 'Recurso por asignar',
                          usuarioId: tareaComercial.responsableId || gestorId,
                          fechaTrabajo: fechaInicio,
                          horasTrabajadas: Number(tareaComercial.horasEstimadas),
                          descripcion: `Tarea ejecutable: ${tareaComercial.nombre || `Tarea ${tareaComercial.id}`}`,
                          proyectoEdtId: edtProyecto.id,
                          categoriaServicioId: categoriaServicioId
                        }
                      })

                      console.log(`✅ Registro de horas creado para tarea ${tareaProyecto.id}`)
                    } catch (horasError) {
                      console.warn(`⚠️ Error creando registro de horas para tarea ${tareaProyecto.id}:`, horasError)
                    }
                  }
                } catch (tareaError) {
                  console.error(`❌ Error creando tarea ${tareaComercial.nombre}:`, tareaError)
                }
              }
            } else {
              console.log(`ℹ️ EDT ${edtProyecto.id} no tiene tareas asociadas`)
            }
          } catch (edtError) {
            console.error(`❌ Error creando EDT ${edtComercial.nombre}:`, edtError)
          }
        }

        cronogramaConvertido = cotizacion.cronograma.length
        console.log(`✅ Conversión completa: Jerarquía de 4 niveles creada para proyecto ${proyecto.id}`)
      } catch (cronogramaError) {
        console.error('❌ Error en conversión de cronograma:', cronogramaError)
        // No fallar la creación del proyecto por errores en el cronograma
        cronogramaConvertido = 0
      }
    }

    return NextResponse.json({
      ...proyecto,
      cronogramaConvertido
    })
  } catch (error) {
    console.error('❌ Error al crear proyecto desde cotización:', error)
    return NextResponse.json({ error: 'Error interno al crear proyecto' }, { status: 500 })
  }
}
