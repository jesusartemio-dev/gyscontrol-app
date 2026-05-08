// ===================================================
// 📁 Archivo: from-cotizacion/route.ts
// 📌 Crea un proyecto a partir de una cotización aprobada
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createProyectoFromCotizacionSchema } from '@/lib/validators/proyecto'
import { z } from 'zod'
import { Prisma, EstadoFase, EstadoTarea, EstadoActividad, EstadoEdt } from '@prisma/client'
import { randomUUID } from 'crypto'
import { calcularCompletitudGeneral } from '@/lib/tdr/completitud'
import type { TdrAnalisisCore } from '@/types/tdr'

// ✅ Tipo explícito para cotización con includes (5 niveles sin zonas)
type CotizacionConIncludes = Prisma.CotizacionGetPayload<{
  include: {
    cliente: true
    cotizacionEquipo: { include: { cotizacionEquipoItem: true } }
    cotizacionServicio: { include: { cotizacionServicioItem: true } }
    cotizacionGasto: { include: { cotizacionGastoItem: true } }
    fases: true
    cronograma: {
      include: {
        edt: true,
        responsable: true,
        cotizacionFase: true,
        cotizacionActividad: {
          include: {
            cotizacionTarea: {
              include: {
                responsable: true
              }
            }
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
    console.log('🚀 [API PROYECTO FROM COTIZACION] Iniciando creación de proyecto desde cotización')

    const body = await request.json()
    console.log('📦 [API PROYECTO FROM COTIZACION] Body recibido:', body)

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

    console.log('✅ [API PROYECTO FROM COTIZACION] Datos validados:', {
      cotizacionId,
      nombre,
      fechaInicio,
      gestorId,
      clienteId,
      comercialId
    })

    // ✅ Validate required fields
    if (!cotizacionId) {
      return NextResponse.json(
        { error: 'cotizacionId es requerido' },
        { status: 400 }
      )
    }

    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: true,
        cotizacionEquipo: { include: { cotizacionEquipoItem: true } },
        cotizacionServicio: { include: { cotizacionServicioItem: true } },
        cotizacionGasto: { include: { cotizacionGastoItem: true } },
        cotizacionCondicion: { orderBy: { orden: 'asc' } },
        cotizacionExclusion: { orderBy: { orden: 'asc' } },
        cotizacionFase: true,
        cotizacionEdt: {
          include: {
            edt: true,
            user: true,
            cotizacionFase: true,
            cotizacionActividad: {
              include: {
                cotizacionTarea: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      },
    }) as any

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
    const finalTotalEquiposInterno = totalEquiposInterno ?? cotizacion.cotizacionEquipo.reduce((sum: number, grupo: any) => sum + grupo.subtotalInterno, 0)
    const finalTotalServiciosInterno = totalServiciosInterno ?? cotizacion.cotizacionServicio.reduce((sum: number, grupo: any) => sum + grupo.subtotalInterno, 0)
    const finalTotalGastosInterno = totalGastosInterno ?? cotizacion.cotizacionGasto.reduce((sum: number, grupo: any) => sum + grupo.subtotalInterno, 0)
    const finalTotalInterno = totalInterno ?? (finalTotalEquiposInterno + finalTotalServiciosInterno + finalTotalGastosInterno)
    
    const finalTotalCliente = totalCliente ?? cotizacion.totalCliente ?? 0
    const finalDescuento = descuento ?? cotizacion.descuento ?? 0
    const finalGrandTotal = grandTotal ?? cotizacion.grandTotal ?? finalTotalCliente

    const proyecto = await prisma.proyecto.create({
      data: {
        id: randomUUID(),
        clienteId: clienteId ?? cotizacion.clienteId,
        comercialId: comercialId ?? cotizacion.comercialId,
        gestorId,
        cotizacionId,
        nombre,
        descripcion: nombre,
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
        moneda: cotizacion.moneda || 'USD',
        tipoCambio: cotizacion.tipoCambio || null,
        updatedAt: new Date(),

        proyectoEquipoCotizado: {
          create: cotizacion.cotizacionEquipo.map((grupo: any) => ({
            id: randomUUID(),
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            responsableId: gestorId,
            updatedAt: new Date(),
            proyectoEquipoCotizadoItem: {
              create: (grupo.cotizacionEquipoItem || []).map((item: any) => ({
                id: randomUUID(),
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
                updatedAt: new Date(),
              })),
            },
          })),
        },

        proyectoServicioCotizado: {
          create: cotizacion.cotizacionServicio.map((grupo: any) => ({
            id: randomUUID(),
            nombre: grupo.nombre,
            edtId: grupo.edtId,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            responsableId: gestorId,
            updatedAt: new Date(),
            proyectoServicioCotizadoItem: {
              create: (grupo.cotizacionServicioItem || []).map((item: any) => ({
                id: randomUUID(),
                catalogoServicioId: item.catalogoServicioId,
                edtId: item.edtId,
                costoHoraInterno: item.costoHora,
                costoHoraCliente: item.costoHora * item.margen,
                nombre: item.nombre,
                cantidadHoras: item.horaTotal,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
                updatedAt: new Date(),
              })),
            },
          })),
        },

        proyectoGastoCotizado: {
          create: cotizacion.cotizacionGasto.map((grupo: any) => ({
            id: randomUUID(),
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            updatedAt: new Date(),
            proyectoGastoCotizadoItem: {
              create: (grupo.cotizacionGastoItem || []).map((item: any) => ({
                id: randomUUID(),
                nombre: item.nombre,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                factorSeguridad: item.factorSeguridad,
                margen: item.margen,
                costoInterno: item.costoInterno,
                costoCliente: item.costoCliente,
                updatedAt: new Date(),
              })),
            },
          })),
        },
      },
    })

    // ─── Snapshot automático del análisis TDR de la cotización ──────────────────
    // Envuelto en try/catch para que un fallo NO rompa la creación del proyecto.
    // El snapshot puede crearse después con el botón "Importar de cotización".
    try {
      const tdrCot = await prisma.cotizacionTdrAnalisis.findFirst({
        where: { cotizacionId: cotizacion.id },
        orderBy: { createdAt: 'desc' },
      })

      if (tdrCot) {
        const {
          id: cotTdrId,
          cotizacionId: _omit1,
          createdAt: _omit2,
          updatedAt: _omit3,
          ...resto
        } = tdrCot

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const snapshotCreado = await prisma.proyectoTdrAnalisis.create({
          data: {
            ...(resto as any),
            proyectoId: proyecto.id,
            cotizacionTdrOrigenId: cotTdrId,
            desconectadoDeOrigen: false,
            fechaSnapshot: new Date(),
          },
        })

        const completitud = calcularCompletitudGeneral(snapshotCreado as unknown as TdrAnalisisCore)
        await prisma.proyectoTdrAnalisis.update({
          where: { id: snapshotCreado.id },
          data: { bloquesCompletitud: completitud.bloques },
        })

        console.log(`✅ [TDR] Snapshot creado para proyecto ${proyecto.id} desde cotización ${cotizacion.id}`)
      }
    } catch (tdrError) {
      console.error('[crearProyectoDesdeCotizacion] Error al crear snapshot TDR:', tdrError)
    }

    // ✅ Fix #10: Transferir condiciones y exclusiones de cotización → proyecto
    if (cotizacion.cotizacionCondicion && cotizacion.cotizacionCondicion.length > 0) {
      await Promise.all(cotizacion.cotizacionCondicion.map((cond: any) =>
        prisma.proyectoCondicion.create({
          data: {
            proyectoId: proyecto.id,
            catalogoCondicionId: cond.catalogoCondicionId,
            tipo: cond.tipo,
            descripcion: cond.descripcion,
            orden: cond.orden,
            updatedAt: new Date()
          }
        })
      ))
      console.log(`✅ [CONDICIONES] ${cotizacion.cotizacionCondicion.length} condiciones transferidas al proyecto`)
    }

    if (cotizacion.cotizacionExclusion && cotizacion.cotizacionExclusion.length > 0) {
      await Promise.all(cotizacion.cotizacionExclusion.map((exc: any) =>
        prisma.proyectoExclusion.create({
          data: {
            proyectoId: proyecto.id,
            catalogoExclusionId: exc.catalogoExclusionId,
            descripcion: exc.descripcion,
            orden: exc.orden,
            updatedAt: new Date()
          }
        })
      ))
      console.log(`✅ [EXCLUSIONES] ${cotizacion.cotizacionExclusion.length} exclusiones transferidas al proyecto`)
    }

    // ✅ Fix #9: Actualizar CrmOportunidad con proyectoId y estado
    try {
      const oportunidad = await prisma.crmOportunidad.findFirst({
        where: { cotizacionId }
      })
      if (oportunidad) {
        await prisma.crmOportunidad.update({
          where: { id: oportunidad.id },
          data: {
            proyectoId: proyecto.id,
            estado: 'seguimiento_proyecto',
            updatedAt: new Date()
          }
        })
        console.log(`✅ [CRM] Oportunidad ${oportunidad.id} actualizada: proyectoId=${proyecto.id}, estado=seguimiento_proyecto`)
      }
    } catch (crmError) {
      console.log('⚠️ [CRM] Error al actualizar oportunidad (no bloqueante):', crmError)
    }

    // ✅ Convertir EDTs comerciales a jerarquía completa de 5 niveles (sin zonas)
    // ✅ Crear SOLO cronograma comercial (baseline histórica)
    let cronogramaConvertido = 0
    console.log('🔍 [CRONOGRAMA] Verificando si hay cronograma en cotización...')
    console.log('🔍 [CRONOGRAMA] cotizacion.cotizacionEdt:', cotizacion.cotizacionEdt)
    console.log('🔍 [CRONOGRAMA] cotizacion.cotizacionEdt.length:', cotizacion.cotizacionEdt?.length)

    if (!cotizacion.cotizacionEdt || cotizacion.cotizacionEdt.length === 0) {
      console.log('⚠️ [CRONOGRAMA] No hay cronograma en la cotización, creando cronograma comercial vacío por defecto')
      // Crear solo cronograma comercial vacío por defecto
      try {
        const cronogramaComercial = await prisma.proyectoCronograma.create({
          data: {
            id: randomUUID(),
            proyectoId: proyecto.id,
            tipo: 'comercial',
            nombre: 'Cronograma Comercial',
            copiadoDesdeCotizacionId: cotizacion.id,
            esBaseline: false, // NO es baseline, es solo referencia histórica
            version: 1,
            updatedAt: new Date()
          }
        })
        console.log(`✅ [CRONOGRAMA] Cronograma comercial vacío creado con ID: ${cronogramaComercial.id}`)
      } catch (emptyCronogramaError) {
        console.log('❌ [CRONOGRAMA] Error creando cronograma comercial vacío:', emptyCronogramaError)
      }
      return NextResponse.json({
        ...proyecto,
        cronogramaConvertido: 0
      })
    }

    if (cotizacion.cotizacionEdt && cotizacion.cotizacionEdt.length > 0) {
      try {
        console.log(`📅 [CRONOGRAMA] Iniciando conversión de ${cotizacion.cotizacionEdt.length} EDTs comerciales a jerarquía de 5 niveles`)

        // ✅ PASO 1: Calcular offset de fechas para ajuste
        console.log('📅 [CRONOGRAMA] PASO 1: Calculando offset de fechas')
        const proyectoFechaInicio = new Date(fechaInicio)
        console.log('📅 [CRONOGRAMA] Fecha de inicio del proyecto:', proyectoFechaInicio.toISOString())

        const fechasCotizacion: Date[] = [
          // Fechas de fases
          ...cotizacion.cotizacionFase.flatMap((fase: any) => [
            fase.fechaInicioPlan,
            fase.fechaFinPlan
          ].filter((f: any) => f)),
          // Fechas de EDTs, actividades y tareas
          ...cotizacion.cotizacionEdt.flatMap((edt: any) => [
            edt.fechaInicioComercial,
            edt.fechaFinComercial,
            ...edt.cotizacionActividad.flatMap((act: any) => [
              act.fechaInicioComercial,
              act.fechaFinComercial,
              ...act.cotizacionTarea.flatMap((tarea: any) => [
                tarea.fechaInicio,
                tarea.fechaFin
              ].filter((f: any) => f))
            ].filter((f: any) => f))
          ].filter((f: any) => f))
        ]

        console.log('📅 [CRONOGRAMA] Fechas encontradas en cotización:', fechasCotizacion.length)
        console.log('📅 [CRONOGRAMA] Fechas específicas:', fechasCotizacion.map(f => f?.toISOString()).filter(Boolean))

        // Encontrar fecha más antigua
        const fechaMasAntigua = fechasCotizacion
          .filter(f => f)
          .sort((a, b) => a.getTime() - b.getTime())[0]

        console.log('📅 [CRONOGRAMA] Fecha más antigua en cotización:', fechaMasAntigua?.toISOString())

        let offsetMs = 0
        if (fechaMasAntigua) {
          offsetMs = proyectoFechaInicio.getTime() - fechaMasAntigua.getTime()
          console.log(`📅 [CRONOGRAMA] Offset calculado: ${Math.floor(offsetMs / (1000 * 60 * 60 * 24))} días (${offsetMs} ms)`)
        } else {
          console.log('⚠️ [CRONOGRAMA] No se encontraron fechas válidas en la cotización, offset = 0')
        }

        // ✅ Función para ajustar fechas (maneja null/undefined)
        const ajustarFecha = (fechaOriginal: Date | string | null): Date | null => {
          if (!fechaOriginal) return null
          const fecha = typeof fechaOriginal === 'string' ? new Date(fechaOriginal) : fechaOriginal
          const fechaAjustada = new Date(fecha.getTime() + offsetMs)
          console.log(`📅 [CRONOGRAMA] Ajustando fecha ${fecha.toISOString()} -> ${fechaAjustada.toISOString()}`)
          return fechaAjustada
        }

        // ✅ PASO 2: Crear CRONOGRAMA COMERCIAL (referencia histórica - NO baseline)
        console.log('🏗️ [CRONOGRAMA] PASO 2: Creando cronograma comercial')
        const cronogramaComercial = await prisma.proyectoCronograma.create({
          data: {
            id: randomUUID(),
            proyectoId: proyecto.id,
            tipo: 'comercial',
            nombre: 'Cronograma Comercial',
            copiadoDesdeCotizacionId: cotizacion.id,
            esBaseline: false, // NO es baseline, es solo referencia histórica
            version: 1,
            updatedAt: new Date()
          }
        })

        console.log(`✅ [CRONOGRAMA] Cronograma comercial creado con ID: ${cronogramaComercial.id}`)

        // ✅ PASO 3: Crear TODAS las fases para el cronograma comercial
        console.log('📋 [CRONOGRAMA] PASO 3: Creando fases para el cronograma comercial')
        const fasesComercialMap = new Map<string, string>() // Map<cotizacionFaseId, proyectoFaseId> para comercial

        console.log('📋 [CRONOGRAMA] Fases en cotización:', cotizacion.cotizacionFase?.length || 0)
        console.log('📋 [CRONOGRAMA] Detalle de fases:', cotizacion.cotizacionFase?.map((f: any) => ({ id: f.id, nombre: f.nombre })))

        if (cotizacion.cotizacionFase && cotizacion.cotizacionFase.length > 0) {
          console.log(`📋 [CRONOGRAMA] Creando ${cotizacion.cotizacionFase.length} fases para el cronograma comercial...`)

          for (const faseCotizacion of cotizacion.cotizacionFase) {
            console.log(`📋 [CRONOGRAMA] Procesando fase: ${faseCotizacion.nombre} (ID: ${faseCotizacion.id})`)

            // Crear fase en CRONOGRAMA COMERCIAL (fechas ajustadas según nueva fecha inicio)
            console.log('📋 [CRONOGRAMA] Creando fase comercial...')
            const nuevaFaseComercial = await (prisma as any).proyectoFase.create({
              data: {
                id: crypto.randomUUID(),
                proyectoId: proyecto.id,
                proyectoCronogramaId: cronogramaComercial.id,
                nombre: faseCotizacion.nombre,
                descripcion: faseCotizacion.descripcion,
                orden: faseCotizacion.orden,
                estado: EstadoFase.planificado,
                porcentajeAvance: 0,
                fechaInicioPlan: ajustarFecha(faseCotizacion.fechaInicioPlan),
                fechaFinPlan: ajustarFecha(faseCotizacion.fechaFinPlan),
                updatedAt: new Date()
              }
            })
            fasesComercialMap.set(faseCotizacion.id, nuevaFaseComercial.id)
            console.log(`✅ [CRONOGRAMA] Fase comercial creada: ${nuevaFaseComercial.nombre} (ID: ${nuevaFaseComercial.id})`)
          }
        } else {
          console.log('⚠️ [CRONOGRAMA] No hay fases en la cotización, creando fase por defecto...')

          // Crear fase por defecto si no hay fases en la cotización
          const fasePorDefectoComercial = await (prisma as any).proyectoFase.create({
            data: {
              id: crypto.randomUUID(),
              proyectoId: proyecto.id,
              proyectoCronogramaId: cronogramaComercial.id,
              nombre: 'Fase Principal',
              descripcion: 'Fase principal del proyecto',
              orden: 1,
              estado: EstadoTarea.pendiente,
              porcentajeAvance: 0,
              updatedAt: new Date()
            }
          })
          fasesComercialMap.set('default', fasePorDefectoComercial.id)
          console.log(`✅ [CRONOGRAMA] Fase comercial por defecto creada: ${fasePorDefectoComercial.nombre}`)
        }

        // ✅ PASO 4: Crear EDTs para el cronograma comercial
        console.log(`🔧 [CRONOGRAMA] PASO 4: Creando ${cotizacion.cotizacionEdt.length} EDTs para el cronograma comercial`)

        for (const edtComercial of cotizacion.cotizacionEdt) {
          console.log(`🔧 [CRONOGRAMA] Procesando EDT comercial: ${edtComercial.id} - ${edtComercial.nombre}`)
          console.log(`🔧 [CRONOGRAMA] EDT tiene ${edtComercial.cotizacionActividad?.length || 0} actividades`)

          // Determinar fase para el EDT en el cronograma comercial
          let faseComercialId: string | undefined

          if (edtComercial.cotizacionFaseId) {
            faseComercialId = fasesComercialMap.get(edtComercial.cotizacionFaseId)
            console.log(`📋 EDT asignado a fase: ${faseComercialId} (comercial)`)
          } else {
            // Usar fase por defecto
            faseComercialId = fasesComercialMap.get('default')
            console.log(`📋 EDT asignado a fase por defecto`)
          }

          // Obtener edtId - puede venir directamente o a través de la relación
          let edtId = edtComercial.edtId
          if (!edtId && edtComercial.edt) {
            edtId = edtComercial.edt.id
          }

          // Si no hay edtId, intentar obtenerlo del servicio relacionado
          if (!edtId) {
            // Buscar el servicio correspondiente para obtener la EDT
            const servicioRelacionado = cotizacion.cotizacionServicio.find((s: any) =>
              s.id === edtComercial.cotizacionServicioId
            )
            if (servicioRelacionado) {
              // categoria es un string, necesitamos encontrar la Edt por nombre
              const categoriaServicio = await prisma.edt.findFirst({
                where: { nombre: servicioRelacionado.categoria }
              })
              if (categoriaServicio) {
                edtId = categoriaServicio.id
              }
            }
          }

          if (!edtId) {
            console.warn(`⚠️ EDT comercial ${edtComercial.id} no tiene edtId válido, usando categoría genérica`)
            // Buscar una categoría de servicio por defecto o crear una genérica
            const categoriaDefault = await prisma.edt.findFirst({
              where: { nombre: { contains: 'General' } }
            }) || await prisma.edt.findFirst()

            if (categoriaDefault) {
              edtId = categoriaDefault.id
            } else {
              console.error(`❌ No se pudo encontrar edtId para EDT ${edtComercial.id}, saltando...`)
              continue
            }
          }

          try {
            console.log(`🔧 [CRONOGRAMA] Creando EDT comercial...`)
            // Crear EDT en CRONOGRAMA COMERCIAL (fechas ajustadas según nueva fecha inicio)
            const edtComercialProyecto = await (prisma as any).proyectoEdt.create({
              data: {
                id: crypto.randomUUID(),
                proyectoId: proyecto.id,
                proyectoCronogramaId: cronogramaComercial.id,
                proyectoFaseId: faseComercialId,
                nombre: edtComercial.nombre || `EDT ${edtComercial.id}`,
                edtId: edtId,
                zona: undefined,
                fechaInicioPlan: ajustarFecha(edtComercial.fechaInicioComercial),
                fechaFinPlan: ajustarFecha(edtComercial.fechaFinComercial),
                horasPlan: new Prisma.Decimal(edtComercial.horasEstimadas || 0),
                responsableId: edtComercial.responsableId,
                descripcion: edtComercial.descripcion,
                prioridad: edtComercial.prioridad || 'media',
                estado: EstadoEdt.planificado,
                porcentajeAvance: 0,
                updatedAt: new Date()
              }
            })
            console.log(`✅ [CRONOGRAMA] EDT comercial creado: ${edtComercialProyecto.nombre} (ID: ${edtComercialProyecto.id})`)
            console.log(`✅ [CRONOGRAMA] EDT creado exitosamente para: ${edtComercial.nombre}`)

            // Convertir actividades comerciales a actividades ejecutables (5 niveles sin zonas)
            // Process through actividades -> tareas hierarchy directly under EDT
            let actividadesComerciales = edtComercial.cotizacionActividad || []

            if (actividadesComerciales.length === 0) {
              // Create default actividad for EDTs without activities
              actividadesComerciales = [{
                id: `default-${edtComercial.id}`,
                nombre: `Actividad Principal - ${edtComercial.nombre || 'EDT'}`,
                fechaInicioComercial: edtComercial.fechaInicioComercial,
                fechaFinComercial: edtComercial.fechaFinComercial,
                estado: EstadoEdt.planificado,
                porcentajeAvance: 0,
                descripcion: 'Actividad principal del EDT',
                prioridad: 'media',
                cotizacionTarea: [] // Will be populated below
              }]
              console.log(`⚙️ Creada actividad por defecto para EDT ${edtComercialProyecto.nombre}`)
            }

            console.log(`⚙️ [CRONOGRAMA] Procesando ${actividadesComerciales.length} actividades para EDT ${edtComercialProyecto.id}`)

            for (const actividadComercial of actividadesComerciales) {
              console.log(`⚙️ [CRONOGRAMA] Procesando actividad: ${actividadComercial.nombre}`)

              // Create ProyectoActividad en CRONOGRAMA COMERCIAL (fechas ajustadas según nueva fecha inicio)
              const actividadComercialProyecto = await (prisma as any).proyectoActividad.create({
                data: {
                  id: crypto.randomUUID(),
                  proyectoEdtId: edtComercialProyecto.id,
                  proyectoCronogramaId: cronogramaComercial.id,
                  nombre: actividadComercial.nombre,
                  fechaInicioPlan: ajustarFecha(actividadComercial.fechaInicioComercial),
                  fechaFinPlan: ajustarFecha(actividadComercial.fechaFinComercial),
                  estado: EstadoTarea.pendiente,
                  porcentajeAvance: 0,
                  horasPlan: new Prisma.Decimal(actividadComercial.horasEstimadas || 0),
                  prioridad: actividadComercial.prioridad || 'media',
                  orden: 0,
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              })

              console.log(`✅ [CRONOGRAMA] ProyectoActividad creada: ${actividadComercialProyecto.nombre} (comercial ID: ${actividadComercialProyecto.id})`)

              // Process tareas within actividad
              let tareasComerciales = actividadComercial.cotizacionTarea || []

              if (tareasComerciales.length === 0) {
                // Create default tarea for activities without tareas
                tareasComerciales = [{
                  id: `default-${actividadComercial.id}`,
                  nombre: `Tarea Principal - ${actividadComercial.nombre}`,
                  descripcion: 'Tarea principal de la actividad',
                  fechaInicio: actividadComercial.fechaInicioComercial,
                  fechaFin: actividadComercial.fechaFinComercial,
                  horasEstimadas: edtComercial.horasEstimadas || 0,
                  prioridad: 'media',
                  responsableId: edtComercial.responsableId,
                  estado: 'pendiente'
                }]
                console.log(`📝 Creada tarea por defecto para actividad ${actividadComercialProyecto.nombre}`)
              }

              console.log(`📝 [CRONOGRAMA] Procesando ${tareasComerciales.length} tareas para actividad ${actividadComercialProyecto.id}`)

              for (const tareaComercial of tareasComerciales) {
                console.log(`📝 Procesando tarea: ${tareaComercial.nombre}`)

                // Crear tarea incluso si no tiene fechas específicas
                // Aplicar ajustarFecha para desplazar según nueva fecha de inicio del proyecto
                const fechaInicioOriginal = tareaComercial.fechaInicio || actividadComercial.fechaInicioComercial || new Date()
                const fechaFinOriginal = tareaComercial.fechaFin || actividadComercial.fechaFinComercial || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 días por defecto
                const fechaInicioAjustada = ajustarFecha(fechaInicioOriginal)
                const fechaFinAjustada = ajustarFecha(fechaFinOriginal)

                try {
                  // Crear tarea en CRONOGRAMA COMERCIAL (fechas ajustadas según nueva fecha inicio)
                  const tareaComercialProyecto = await prisma.proyectoTarea.create({
                    data: {
                      id: randomUUID(),
                      proyectoEdtId: edtComercialProyecto.id,
                      proyectoActividadId: actividadComercialProyecto.id,
                      proyectoCronogramaId: cronogramaComercial.id,
                      nombre: tareaComercial.nombre || `Tarea ${tareaComercial.id}`,
                      descripcion: tareaComercial.descripcion,
                      fechaInicio: fechaInicioAjustada ?? new Date(),
                      fechaFin: fechaFinAjustada ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                      fechaInicioReal: null,
                      fechaFinReal: null,
                      horasEstimadas: tareaComercial.horasEstimadas,
                      horasReales: 0,
                      prioridad: tareaComercial.prioridad || 'media',
                      responsableId: tareaComercial.responsableId,
                      estado: EstadoTarea.pendiente,
                      porcentajeCompletado: 0,
                      orden: 0,
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }
                  })

                  console.log(`✅ [CRONOGRAMA] ProyectoTarea creada: ${tareaComercialProyecto.nombre} (comercial ID: ${tareaComercialProyecto.id})`)

                  // Skip registro de horas creation during conversion to avoid foreign key issues
                  // This can be created later when the user assigns resources
                  console.log(`ℹ️ Registro de horas omitido para tarea ${tareaComercialProyecto.nombre}`)
                } catch (tareaError) {
                  console.log(`❌ Error creando tarea ${tareaComercial.nombre}`)
                }
              }
            }
          } catch (edtError) {
            console.log(`❌ Error creando EDT ${edtComercial.nombre}`)
          }
        }

        cronogramaConvertido = cotizacion.cotizacionEdt.length
        console.log(`✅ [CRONOGRAMA] Conversión completa: ${cronogramaConvertido} EDTs convertidos con jerarquía de 5 niveles`)
        console.log(`📊 [CRONOGRAMA] Resumen final:`)
        console.log(`   - Cronograma creado: 1 (comercial)`)
        console.log(`   - Fases creadas: ${fasesComercialMap.size}`)
        console.log(`   - EDTs creados: ${cotizacion.cotizacionEdt.length}`)
        console.log(`   - Total elementos jerarquía: ${fasesComercialMap.size + cotizacion.cotizacionEdt.length}`)
      } catch (cronogramaError) {
        console.log('❌ [CRONOGRAMA] Error en conversión de cronograma:', cronogramaError)
        console.log('❌ [CRONOGRAMA] Detalles del error:', cronogramaError instanceof Error ? cronogramaError.message : String(cronogramaError))
        // No fallar la creación del proyecto por errores en el cronograma
        cronogramaConvertido = 0
      }
    }

    return NextResponse.json({
      ...proyecto,
      cronogramaConvertido
    })
  } catch (error) {
    console.log('❌ Error al crear proyecto desde cotización:', error)
    console.log('❌ Stack trace:', error instanceof Error ? error.stack : String(error))
    
    // ✅ Proporcionar información específica del error para debugging
    let errorMessage = 'Error interno al crear proyecto'
    let errorDetails = ''
    
    if (error instanceof z.ZodError) {
      errorMessage = 'Error de validación de datos'
      errorDetails = JSON.stringify(error.errors, null, 2)
      console.log('❌ Zod validation errors:', errorDetails)
    } else if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack || ''
      console.log('❌ Error details:', errorDetails)
    }
    
    return NextResponse.json({
      error: errorMessage,
      details: errorDetails,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
