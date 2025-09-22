/**
 * 📊 Script para poblar la base de datos con plantillas de exclusiones y condiciones
 * Basado en el documento proporcionado por el usuario
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de plantillas de cotización...')

  try {
    // 1. Crear plantilla de exclusiones
    console.log('📝 Creando plantilla de exclusiones...')

    // Verificar si ya existe
    const existingExclusion = await prisma.plantillaExclusion.findFirst({
      where: { nombre: 'Exclusiones Generales' }
    })

    let plantillaExclusiones
    if (existingExclusion) {
      console.log('⚠️  Plantilla de exclusiones ya existe, actualizando...')
      plantillaExclusiones = await prisma.plantillaExclusion.update({
        where: { id: existingExclusion.id },
        data: {
          descripcion: 'Exclusiones estándar aplicables a la mayoría de proyectos',
          categoria: 'general',
          activo: true,
          orden: 1,
          items: {
            deleteMany: {}, // Eliminar items existentes
            create: [
              {
                descripcion: 'Suministro de licencias para el correcto funcionamiento del sistema.',
                orden: 1,
                activo: true
              },
              {
                descripcion: 'Calibración de instrumentos.',
                orden: 2,
                activo: true
              },
              {
                descripcion: 'Planos o diagramas eléctricos/mecánicos completos del sistema.',
                orden: 3,
                activo: true
              },
              {
                descripcion: 'Supervisión de las labores de montaje del filtro prensa.',
                orden: 4,
                activo: true
              },
              {
                descripcion: 'Suministro de máquinas virtuales.',
                orden: 5,
                activo: true
              }
            ]
          }
        },
        include: {
          items: true,
          _count: true
        }
      })
    } else {
      plantillaExclusiones = await prisma.plantillaExclusion.create({
        data: {
          nombre: 'Exclusiones Generales',
          descripcion: 'Exclusiones estándar aplicables a la mayoría de proyectos',
          categoria: 'general',
          activo: true,
          orden: 1,
          items: {
            create: [
              {
                descripcion: 'Suministro de licencias para el correcto funcionamiento del sistema.',
                orden: 1,
                activo: true
              },
              {
                descripcion: 'Calibración de instrumentos.',
                orden: 2,
                activo: true
              },
              {
                descripcion: 'Planos o diagramas eléctricos/mecánicos completos del sistema.',
                orden: 3,
                activo: true
              },
              {
                descripcion: 'Supervisión de las labores de montaje del filtro prensa.',
                orden: 4,
                activo: true
              },
              {
                descripcion: 'Suministro de máquinas virtuales.',
                orden: 5,
                activo: true
              }
            ]
          }
        },
        include: {
          items: true,
          _count: true
        }
      })
    }

    console.log('✅ Plantilla de exclusiones creada:', plantillaExclusiones.nombre)

    // 2. Crear plantillas de condiciones
    console.log('📋 Creando plantillas de condiciones...')

    // Condiciones Generales
    const existingGenerales = await prisma.plantillaCondicion.findFirst({
      where: { nombre: 'Condiciones Generales' }
    })

    let condicionesGenerales
    if (existingGenerales) {
      condicionesGenerales = await prisma.plantillaCondicion.update({
        where: { id: existingGenerales.id },
        data: {
          descripcion: 'Condiciones generales aplicables a todas las cotizaciones',
          categoria: 'general',
          tipo: 'comercial',
          activo: true,
          orden: 1,
          items: {
            deleteMany: {},
            create: [
              {
                descripcion: 'Los precios son válidos según el alcance técnico ofertado y plazos estipulados. Cualquier modificación requerida por el cliente será objeto de actualización de oferta.',
                tipo: 'comercial',
                orden: 1,
                activo: true
              },
              {
                descripcion: 'El cliente debe enviar su orden de compra a ventas@gyscontrol.com. Si no recibe confirmación, debe comunicarse con GYS.',
                tipo: 'comercial',
                orden: 2,
                activo: true
              }
            ]
          }
        },
        include: {
          items: true,
          _count: true
        }
      })
    } else {
      condicionesGenerales = await prisma.plantillaCondicion.create({
        data: {
          nombre: 'Condiciones Generales',
          descripcion: 'Condiciones generales aplicables a todas las cotizaciones',
          categoria: 'general',
          tipo: 'comercial',
          activo: true,
          orden: 1,
          items: {
            create: [
              {
                descripcion: 'Los precios son válidos según el alcance técnico ofertado y plazos estipulados. Cualquier modificación requerida por el cliente será objeto de actualización de oferta.',
                tipo: 'comercial',
                orden: 1,
                activo: true
              },
              {
                descripcion: 'El cliente debe enviar su orden de compra a ventas@gyscontrol.com. Si no recibe confirmación, debe comunicarse con GYS.',
                tipo: 'comercial',
                orden: 2,
                activo: true
              }
            ]
          }
        },
        include: {
          items: true,
          _count: true
        }
      })
    }

    // Función helper para crear o actualizar plantilla de condición
    async function createOrUpdatePlantillaCondicion(nombre, descripcion, categoria, tipo, orden, items) {
      const existing = await prisma.plantillaCondicion.findFirst({
        where: { nombre }
      })

      if (existing) {
        return await prisma.plantillaCondicion.update({
          where: { id: existing.id },
          data: {
            descripcion,
            categoria,
            tipo,
            activo: true,
            orden,
            items: {
              deleteMany: {},
              create: items
            }
          },
          include: {
            items: true,
            _count: true
          }
        })
      } else {
        return await prisma.plantillaCondicion.create({
          data: {
            nombre,
            descripcion,
            categoria,
            tipo,
            activo: true,
            orden,
            items: {
              create: items
            }
          },
          include: {
            items: true,
            _count: true
          }
        })
      }
    }

    // Condiciones de Entregas
    const condicionesEntregas = await createOrUpdatePlantillaCondicion(
      'Condiciones de Entregas',
      'Condiciones específicas para entregas y plazos',
      'entrega',
      'tecnica',
      2,
      [
        {
          descripcion: 'El plazo de entrega inicia una vez aclarado técnica-comercialmente el pedido.',
          tipo: 'tecnica',
          orden: 1,
          activo: true
        },
        {
          descripcion: 'Las instrucciones de envío deben darse con el pedido o firma del contrato.',
          tipo: 'tecnica',
          orden: 2,
          activo: true
        }
      ]
    )

    // Condiciones de Precios y Pagos
    const condicionesPrecios = await createOrUpdatePlantillaCondicion(
      'Condiciones de Precios y Pagos',
      'Condiciones relacionadas con precios, pagos e IGV',
      'precios',
      'comercial',
      3,
      [
        {
          descripcion: 'Los precios ofertados NO incluyen IGV.',
          tipo: 'comercial',
          orden: 1,
          activo: true
        },
        {
          descripcion: 'No se aceptará anulación total o parcial de órdenes de compra, salvo casos sustentados. Penalidades pueden alcanzar hasta el 100% del valor de la orden.',
          tipo: 'comercial',
          orden: 2,
          activo: true
        },
        {
          descripcion: 'Las entregas parciales serán facturadas según términos propuestos en la oferta.',
          tipo: 'comercial',
          orden: 3,
          activo: true
        }
      ]
    )

    // Condiciones de Garantías
    const condicionesGarantias = await createOrUpdatePlantillaCondicion(
      'Condiciones de Garantías',
      'Condiciones de garantía para equipos y servicios',
      'garantias',
      'legal',
      4,
      [
        {
          descripcion: 'La garantía de equipos es la otorgada por el fabricante desde la entrega. No cubre daños por mala manipulación o usos no especificados.',
          tipo: 'legal',
          orden: 1,
          activo: true
        },
        {
          descripcion: 'Los servicios ejecutados tienen garantía de funcionamiento según la filosofía de control. Cambios solicitados tendrán costo adicional.',
          tipo: 'legal',
          orden: 2,
          activo: true
        },
        {
          descripcion: 'Intervenciones posteriores se cobrarán como servicios adicionales, salvo que sea responsabilidad de GYS.',
          tipo: 'legal',
          orden: 3,
          activo: true
        }
      ]
    )

    // Obligaciones de GYS
    const obligacionesGys = await createOrUpdatePlantillaCondicion(
      'Obligaciones de GYS',
      'Obligaciones y responsabilidades de GYS Control Industrial',
      'obligaciones',
      'operativa',
      5,
      [
        {
          descripcion: 'Cumplir políticas de seguridad y medio ambiente del cliente.',
          tipo: 'operativa',
          orden: 1,
          activo: true
        },
        {
          descripcion: 'Proveer EPP a su personal.',
          tipo: 'operativa',
          orden: 2,
          activo: true
        },
        {
          descripcion: 'Proveer movilización interna y externa al personal de campo durante la ejecución.',
          tipo: 'operativa',
          orden: 3,
          activo: true
        }
      ]
    )

    // Obligaciones del Cliente
    const obligacionesCliente = await createOrUpdatePlantillaCondicion(
      'Obligaciones del Cliente',
      'Obligaciones y responsabilidades del cliente',
      'obligaciones',
      'comercial',
      6,
      [
        {
          descripcion: 'Nombrar un canal oficial de comunicación con GYS.',
          tipo: 'comercial',
          orden: 1,
          activo: true
        },
        {
          descripcion: 'Facilitar información técnica, manuales y especificaciones.',
          tipo: 'comercial',
          orden: 2,
          activo: true
        },
        {
          descripcion: 'Si GYS debe realizar labores adicionales no consideradas, se facturarán horas adicionales: $35.00/H-H para líder y especialista. $25.00/H-H para personal técnico, más gastos generales.',
          tipo: 'comercial',
          orden: 3,
          activo: true
        }
      ]
    )

    console.log('✅ Plantillas de condiciones creadas:')
    console.log('  -', condicionesGenerales.nombre, `(${condicionesGenerales._count.items} items)`)
    console.log('  -', condicionesEntregas.nombre, `(${condicionesEntregas._count.items} items)`)
    console.log('  -', condicionesPrecios.nombre, `(${condicionesPrecios._count.items} items)`)
    console.log('  -', condicionesGarantias.nombre, `(${condicionesGarantias._count.items} items)`)
    console.log('  -', obligacionesGys.nombre, `(${obligacionesGys._count.items} items)`)
    console.log('  -', obligacionesCliente.nombre, `(${obligacionesCliente._count.items} items)`)

    console.log('\n🎉 Seed completado exitosamente!')
    console.log('📊 Resumen:')
    console.log('  - 1 plantilla de exclusiones')
    console.log('  - 6 plantillas de condiciones')
    console.log('  - Total items:', plantillaExclusiones._count.items + condicionesGenerales._count.items + condicionesEntregas._count.items + condicionesPrecios._count.items + condicionesGarantias._count.items + obligacionesGys._count.items + obligacionesCliente._count.items)

  } catch (error) {
    console.error('❌ Error durante el seed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e)
    process.exit(1)
  })