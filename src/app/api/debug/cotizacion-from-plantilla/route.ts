// ===================================================
// 📁 Archivo: route.ts (DEBUG)
// 📌 Endpoint de debug para investigar el error de FK
// ===================================================

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    console.log('🔍 DEBUG - Datos recibidos:', JSON.stringify(body, null, 2))
    
    const { plantillaId, clienteId } = body

    if (!plantillaId || typeof plantillaId !== 'string') {
      console.log('❌ DEBUG - plantillaId inválido:', plantillaId)
      return NextResponse.json({ error: 'ID de plantilla requerido' }, { status: 400 })
    }
    if (!clienteId || typeof clienteId !== 'string') {
      console.log('❌ DEBUG - clienteId inválido:', clienteId)
      return NextResponse.json({ error: 'Debe seleccionar un cliente' }, { status: 400 })
    }

    console.log('✅ DEBUG - Validación inicial pasada')
    console.log('📋 DEBUG - plantillaId:', plantillaId)
    console.log('👤 DEBUG - clienteId:', clienteId)
    console.log('👨‍💼 DEBUG - userId:', session.user.id)

    // Verificar que el cliente existe
    console.log('🔍 DEBUG - Verificando cliente...')
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
    })

    if (!cliente) {
      console.log('❌ DEBUG - Cliente no encontrado:', clienteId)
      return NextResponse.json({ error: 'Cliente no válido' }, { status: 400 })
    }
    
    console.log('✅ DEBUG - Cliente encontrado:', cliente.nombre)

    // Verificar que el usuario existe
    console.log('🔍 DEBUG - Verificando usuario...')
    const usuario = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!usuario) {
      console.log('❌ DEBUG - Usuario no encontrado:', session.user.id)
      return NextResponse.json({ error: 'Usuario no válido' }, { status: 400 })
    }
    
    console.log('✅ DEBUG - Usuario encontrado:', usuario.name)

    // Obtener plantilla con todas las relaciones
    console.log('🔍 DEBUG - Obteniendo plantilla...')
    const plantilla = await prisma.plantilla.findUnique({
      where: { id: plantillaId },
      include: {
        equipos: { include: { items: true } },
        servicios: { 
          include: { 
            items: {
              include: {
                recurso: true,
                unidadServicio: true,
              }
            } 
          } 
        },
        gastos: { include: { items: true } },
      },
    })

    if (!plantilla) {
      console.log('❌ DEBUG - Plantilla no encontrada:', plantillaId)
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
    }

    console.log('✅ DEBUG - Plantilla encontrada:', plantilla.nombre)
    console.log('📊 DEBUG - Equipos:', plantilla.equipos.length)
    console.log('🔧 DEBUG - Servicios:', plantilla.servicios.length)
    console.log('💰 DEBUG - Gastos:', plantilla.gastos.length)

    // Validar servicios detalladamente
    console.log('🔍 DEBUG - Validando servicios...')
    for (const servicio of plantilla.servicios) {
      console.log(`\n📋 DEBUG - Servicio: ${servicio.nombre}`)
      for (const item of servicio.items) {
        console.log(`  🔸 DEBUG - Item: ${item.nombre}`)
        console.log(`     recursoId: ${item.recursoId}`)
        console.log(`     unidadServicioId: ${item.unidadServicioId}`)
        console.log(`     factorSeguridad: ${item.factorSeguridad}`)
        
        if (!item.recursoId || !item.unidadServicioId) {
          console.log(`❌ DEBUG - Item inválido detectado: ${item.nombre}`)
          return NextResponse.json({ 
            error: `El servicio '${item.nombre}' tiene referencias inválidas. Recurso: ${item.recursoId}, Unidad: ${item.unidadServicioId}` 
          }, { status: 400 })
        }
        
        // Verificar que las referencias existen
        if (item.recurso) {
          console.log(`     ✅ DEBUG - Recurso válido: ${item.recurso.nombre}`)
        } else {
          console.log(`     ❌ DEBUG - Recurso no cargado`)
        }
        
        if (item.unidadServicio) {
          console.log(`     ✅ DEBUG - UnidadServicio válida: ${item.unidadServicio.nombre}`)
        } else {
          console.log(`     ❌ DEBUG - UnidadServicio no cargada`)
        }
      }
    }

    console.log('✅ DEBUG - Validación de servicios completada')

    // Preparar datos para creación
    console.log('🔍 DEBUG - Preparando datos para creación...')
    const baseData = {
      nombre: `Cotización de ${plantilla.nombre}`,
      clienteId,
      comercialId: session.user.id,
      plantillaId: plantilla.id,
      totalInterno: plantilla.totalInterno,
      totalCliente: plantilla.totalCliente,
      totalEquiposInterno: plantilla.totalEquiposInterno,
      totalEquiposCliente: plantilla.totalEquiposCliente,
      totalServiciosInterno: plantilla.totalServiciosInterno,
      totalServiciosCliente: plantilla.totalServiciosCliente,
      totalGastosInterno: plantilla.totalGastosInterno,
      totalGastosCliente: plantilla.totalGastosCliente,
      descuento: plantilla.descuento,
      grandTotal: plantilla.grandTotal,
    }

    console.log('📋 DEBUG - Datos base:', JSON.stringify(baseData, null, 2))

    // Intentar crear solo la cotización base primero
    console.log('🔍 DEBUG - Creando cotización base...')
    try {
      const cotizacionBase = await prisma.cotizacion.create({
        data: baseData
      })
      
      console.log('✅ DEBUG - Cotización base creada exitosamente:', cotizacionBase.id)
      
      return NextResponse.json({
        success: true,
        message: 'Debug completado - Cotización base creada',
        cotizacionId: cotizacionBase.id,
        debug: {
          plantilla: plantilla.nombre,
          cliente: cliente.nombre,
          usuario: usuario.name,
          equipos: plantilla.equipos.length,
          servicios: plantilla.servicios.length,
          gastos: plantilla.gastos.length
        }
      })
      
    } catch (createError: any) {
      console.error('❌ DEBUG - Error al crear cotización base:', createError)
      console.error('📋 DEBUG - Detalles del error:', {
        message: createError.message,
        code: createError.code,
        meta: createError.meta
      })
      
      return NextResponse.json({ 
        error: 'Error en creación de cotización base',
        details: createError.message,
        debug: {
          plantilla: plantilla.nombre,
          cliente: cliente.nombre,
          usuario: usuario.name
        }
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('❌ DEBUG - Error general:', error)
    return NextResponse.json({ 
      error: 'Error general en debug',
      details: error?.message || 'Error desconocido'
    }, { status: 500 })
  }
}
