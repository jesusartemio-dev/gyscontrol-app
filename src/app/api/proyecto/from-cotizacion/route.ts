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

// ✅ Tipo explícito para cotización con includes (5 niveles sin zonas)
type CotizacionConIncludes = Prisma.CotizacionGetPayload<{
  include: {
    cliente: true
    equipos: { include: { items: true } }
    servicios: { include: { items: true } }
    gastos: { include: { items: true } }
    fases: true
    cronograma: {
      include: {
        edt: true,
        responsable: true,
        cotizacionFase: true,
        cotizacionActividad: {
          include: {
            cotizacionTareas: {
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
      estado = 'en_planificacion',
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
        equipos: { include: { items: true } },
        servicios: { include: { items: true } },
        gastos: { include: { items: true } },
        cotizacionFase: true,
        cronograma: {
          include: {
            categoriaServicio: true,
            responsable: true,
            cotizacionFase: true,
            cotizacionActividad: {
              include: {
                cotizacionTareas: {
                  include: {
                    responsable: true
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
    const finalTotalEquiposInterno = totalEquiposInterno ?? cotizacion.equipos.reduce((sum: number, grupo: any) => sum + grupo.subtotalInterno, 0)
    const finalTotalServiciosInterno = totalServiciosInterno ?? cotizacion.servicios.reduce((sum: number, grupo: any) => sum + grupo.subtotalInterno, 0)
    const finalTotalGastosInterno = totalGastosInterno ?? cotizacion.gastos.reduce((sum: number, grupo: any) => sum + grupo.subtotalInterno, 0)
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
        updatedAt: new Date(),

        ProyectoEquipoCotizado: {
          create: cotizacion.equipos.map((grupo: any) => ({
            id: randomUUID(),
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            responsableId: gestorId,
            updatedAt: new Date(),
            ProyectoEquipoCotizadoItem: {
              create: grupo.items.map((item: any) => ({
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

        ProyectoServicioCotizado: {
          create: await Promise.all(cotizacion.servicios.map(async (grupo: any) => {
            // ✅ Obtener o crear EDT basado en la categoría del servicio
            let edtId: string
            try {
              const categoriaEdt = await prisma.edt.findFirst({
                where: { nombre: grupo.categoria }
              })
              
              if (categoriaEdt) {
                edtId = categoriaEdt.id
                console.log(`✅ EDT encontrado para categoría "${grupo.categoria}": ${edtId}`)
              } else {
                // Si no existe, buscar una EDT por defecto
                const edtDefault = await prisma.edt.findFirst({
                  where: { nombre: { contains: 'General' } }
                }) || await prisma.edt.findFirst()
                
                if (edtDefault) {
                  edtId = edtDefault.id
                  console.log(`⚠️ Usando EDT por defecto "${edtDefault.nombre}" para categoría "${grupo.categoria}": ${edtId}`)
                } else {
                  throw new Error(`No se pudo encontrar EDT para la categoría "${grupo.categoria}"`)
                }
              }
            } catch (edtError) {
              console.error(`❌ Error obteniendo EDT para categoría "${grupo.categoria}":`, edtError)
              throw new Error(`Error al obtener EDT para categoría "${grupo.categoria}"`)
            }

            return {
              id: randomUUID(),
              nombre: grupo.nombre,
              categoria: grupo.categoria,
              subtotalInterno: grupo.subtotalInterno,
              subtotalCliente: grupo.subtotalCliente,
              responsableId: gestorId,
              updatedAt: new Date(),
              ProyectoServicioCotizadoItem: {
                create: grupo.items.map((item: any) => ({
                  id: randomUUID(),
                  catalogoServicioId: item.catalogoServicioId,
                  categoria: item.categoria,
                  costoHoraInterno: item.costoHora,
                  costoHoraCliente: item.costoHora * item.margen,
                  nombre: item.nombre,
                  cantidadHoras: item.horaTotal,
                  costoInterno: item.costoInterno,
                  costoCliente: item.costoCliente,
                  updatedAt: new Date(),
                })),
              },
            }
          })),
        },

        ProyectoGastoCotizado: {
          create: cotizacion.gastos.map((grupo: any) => ({
            id: randomUUID(),
            nombre: grupo.nombre,
            descripcion: grupo.descripcion,
            subtotalInterno: grupo.subtotalInterno,
            subtotalCliente: grupo.subtotalCliente,
            updatedAt: new Date(),
            ProyectoGastoCotizadoItem: {
              create: grupo.items.map((item: any) => ({
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

    // ✅ Convertir EDTs comerciales a jerarquía completa de 5 niveles (sin zonas)
    // ✅ Crear SOLO cronograma comercial (baseline histórica)
    let cronogramaConvertido = 0
    console.log('🔍 [CRONOGRAMA] Verificando si hay cronograma en cotización...')
    console.log('🔍 [CRONOGRAMA] cotizacion.cronograma:', cotizacion.cronograma)
    console.log('🔍 [CRONOGRAMA] cotizacion.cronograma.length:', cotizacion.cronograma?.length)

    if (!cotizacion.cronograma || cotizacion.cronograma.length === 0) {
      console.log('⚠️ [CRONOGRAMA] No hay cronograma en la cotización, creando cronograma comercial vacío por defecto')
      // Crear solo cronograma comercial vacío por defecto
      try {
        const cronogramaComercial = await prisma.proyectoCronograma.create({
          data: {
            proyectoId: proyecto.id,
            tipo: 'comercial',
            nombre: 'Cronograma Comercial',
            copiadoDesdeCotizacionId: cotizacion.id,
            esBaseline: false, // NO es baseline, es solo referencia histórica
            version: 1
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

    if (cotizacion.cronograma && cotizacion.cronograma.length > 0) {
      try {
        console.log(`📅 [CRONOGRAMA] Iniciando conversión de ${cotizacion.cronograma.length} EDTs comerciales a jerarquía de 5 niveles`)

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
          ...cotizacion.cronograma.flatMap((edt: any) => [
            edt.fechaInicioComercial,
            edt.fechaFinComercial,
            ...edt.cotizacionActividad.flatMap((act: any) => [
              act.fechaInicioComercial,
              act.fechaFinComercial,
              ...act.cotizacionTareas.flatMap((tarea: any) => [
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
            proyectoId: proyecto.id,
            tipo: 'comercial',
            nombre: 'Cronograma Comercial',
            copiadoDesdeCotizacionId: cotizacion.id,
            esBaseline: false, // NO es baseline, es solo referencia histórica
            version: 1
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

            // Crear fase en CRONOGRAMA COMERCIAL (fechas originales)
            console.log('📋 [CRONOGRAMA] Creando fase comercial...')
            const nuevaFaseComercial = await (prisma as any).proyectoFase.create({
              data: {
                proyectoId: proyecto.id,
                proyectoCronogramaId: cronogramaComercial.id,
                nombre: faseCotizacion.nombre,
                descripcion: faseCotizacion.descripcion,
                orden: faseCotizacion.orden,
                estado: EstadoFase.planificado,
                porcentajeAvance: 0,
                fechaInicioPlan: faseCotizacion.fechaInicioPlan ? new Date(faseCotizacion.fechaInicioPlan) : undefined,
                fechaFinPlan: faseCotizacion.fechaFinPlan ? new Date(faseCotizacion.fechaFinPlan) : undefined
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
              proyectoId: proyecto.id,
              proyectoCronogramaId: cronogramaComercial.id,
              nombre: 'Fase Principal',
              descripcion: 'Fase principal del proyecto',
              orden: 1,
              estado: EstadoTarea.pendiente,
              porcentajeAvance: 0
            }
          })
          fasesComercialMap.set('default', fasePorDefectoComercial.id)
          console.log(`✅ [CRONOGRAMA] Fase comercial por defecto creada: ${fasePorDefectoComercial.nombre}`)
        }

        // ✅ PASO 4: Crear EDTs para el cronograma comercial
        console.log(`🔧 [CRONOGRAMA] PASO 4: Creando ${cotizacion.cronograma.length} EDTs para el cronograma comercial`)

        for (const edtComercial of cotizacion.cronograma) {
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
            const servicioRelacionado = cotizacion.servicios.find((s: any) =>
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
            // Crear EDT en CRONOGRAMA COMERCIAL (fechas originales)
            const edtComercialProyecto = await (prisma as any).proyectoEdt.create({
              data: {
                proyectoId: proyecto.id,
                proyectoCronogramaId: cronogramaComercial.id,
                proyectoFaseId: faseComercialId,
                nombre: edtComercial.nombre || `EDT ${edtComercial.id}`,
                categoriaServicioId: edtId,
                zona: undefined,
                fechaInicioPlan: edtComercial.fechaInicioComercial,
                fechaFinPlan: edtComercial.fechaFinComercial,
                horasPlan: new Prisma.Decimal(edtComercial.horasEstimadas || 0),
                responsableId: edtComercial.responsableId,
                descripcion: edtComercial.descripcion,
                prioridad: edtComercial.prioridad || 'media',
                estado: EstadoEdt.planificado,
                porcentajeAvance: 0
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
                cotizacionTareas: [] // Will be populated below
              }]
              console.log(`⚙️ Creada actividad por defecto para EDT ${edtComercialProyecto.nombre}`)
            }

            console.log(`⚙️ [CRONOGRAMA] Procesando ${actividadesComerciales.length} actividades para EDT ${edtComercialProyecto.id}`)

            for (const actividadComercial of actividadesComerciales) {
              console.log(`⚙️ [CRONOGRAMA] Procesando actividad: ${actividadComercial.nombre}`)

              // Create ProyectoActividad en CRONOGRAMA COMERCIAL (fechas originales)
              const actividadComercialProyecto = await (prisma as any).proyectoActividad.create({
                data: {
                  id: crypto.randomUUID(),
                  proyectoEdtId: edtComercialProyecto.id,
                  proyectoCronogramaId: cronogramaComercial.id,
                  nombre: actividadComercial.nombre,
                  fechaInicioPlan: actividadComercial.fechaInicioComercial,
                  fechaFinPlan: actividadComercial.fechaFinComercial,
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
              let tareasComerciales = actividadComercial.cotizacionTareas || []

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
                const fechaInicio = tareaComercial.fechaInicio || actividadComercial.fechaInicioComercial || new Date()
                const fechaFin = tareaComercial.fechaFin || actividadComercial.fechaFinComercial || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 días por defecto

                try {
                  // Crear tarea en CRONOGRAMA COMERCIAL (fechas originales)
                  const tareaComercialProyecto = await prisma.proyectoTarea.create({
                    data: {
                      proyectoEdtId: edtComercialProyecto.id,
                      proyectoActividadId: actividadComercialProyecto.id,
                      proyectoCronogramaId: cronogramaComercial.id,
                      nombre: tareaComercial.nombre || `Tarea ${tareaComercial.id}`,
                      descripcion: tareaComercial.descripcion,
                      fechaInicio: fechaInicio,
                      fechaFin: fechaFin,
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

        cronogramaConvertido = cotizacion.cronograma.length
        console.log(`✅ [CRONOGRAMA] Conversión completa: ${cronogramaConvertido} EDTs convertidos con jerarquía de 5 niveles`)
        console.log(`📊 [CRONOGRAMA] Resumen final:`)
        console.log(`   - Cronograma creado: 1 (comercial)`)
        console.log(`   - Fases creadas: ${fasesComercialMap.size}`)
        console.log(`   - EDTs creados: ${cotizacion.cronograma.length}`)
        console.log(`   - Total elementos jerarquía: ${fasesComercialMap.size + cotizacion.cronograma.length}`)
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
