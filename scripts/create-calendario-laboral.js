/**
 * Script para crear calendario laboral por defecto (Colombia)
 * Ejecutar con: node scripts/create-calendario-laboral.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createCalendarioLaboral() {
  try {
    console.log('🗓️ Creando calendario laboral por defecto...')

    // Verificar si ya existe un calendario por defecto
    const existingCalendario = await prisma.calendarioLaboral.findFirst({
      where: { nombre: 'Colombia - Estándar' }
    })

    if (existingCalendario) {
      console.log('✅ El calendario laboral ya existe')
      return
    }

    // Crear calendario laboral
    const calendario = await prisma.calendarioLaboral.create({
      data: {
        nombre: 'Colombia - Estándar',
        descripcion: 'Calendario laboral estándar para Colombia con feriados nacionales',
        pais: 'Colombia',
        empresa: 'GYS',
        activo: true,
        horasPorDia: 8,
        diasLaborables: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
        horaInicioManana: '08:00',
        horaFinManana: '12:00',
        horaInicioTarde: '13:00',
        horaFinTarde: '17:00',
        diasCalendario: {
          create: [
            { diaSemana: 'lunes', esLaborable: true },
            { diaSemana: 'martes', esLaborable: true },
            { diaSemana: 'miercoles', esLaborable: true },
            { diaSemana: 'jueves', esLaborable: true },
            { diaSemana: 'viernes', esLaborable: true },
            { diaSemana: 'sabado', esLaborable: false },
            { diaSemana: 'domingo', esLaborable: false }
          ]
        },
        excepciones: {
          create: [
            // Feriados fijos
            {
              fecha: new Date('2025-01-01'),
              tipo: 'feriado',
              nombre: 'Año Nuevo',
              descripcion: 'Primer día del año'
            },
            {
              fecha: new Date('2025-05-01'),
              tipo: 'feriado',
              nombre: 'Día del Trabajo',
              descripcion: 'Día internacional del trabajo'
            },
            {
              fecha: new Date('2025-07-20'),
              tipo: 'feriado',
              nombre: 'Día de la Independencia',
              descripcion: 'Grito de Independencia'
            },
            {
              fecha: new Date('2025-08-07'),
              tipo: 'feriado',
              nombre: 'Batalla de Boyacá',
              descripcion: 'Victoria en la Batalla de Boyacá'
            },
            {
              fecha: new Date('2025-12-08'),
              tipo: 'feriado',
              nombre: 'Inmaculada Concepción',
              descripcion: 'Celebración religiosa'
            },
            {
              fecha: new Date('2025-12-25'),
              tipo: 'feriado',
              nombre: 'Navidad',
              descripcion: 'Nacimiento de Jesús'
            },
            // Feriados móviles (aproximados para 2025)
            {
              fecha: new Date('2025-01-06'),
              tipo: 'feriado',
              nombre: 'Día de los Reyes Magos',
              descripcion: 'Epifanía del Señor'
            },
            {
              fecha: new Date('2025-03-24'),
              tipo: 'feriado',
              nombre: 'Jueves Santo',
              descripcion: 'Semana Santa'
            },
            {
              fecha: new Date('2025-03-25'),
              tipo: 'feriado',
              nombre: 'Viernes Santo',
              descripcion: 'Semana Santa'
            },
            {
              fecha: new Date('2025-05-12'),
              tipo: 'feriado',
              nombre: 'Ascensión del Señor',
              descripcion: '60 días después de Pascua'
            },
            {
              fecha: new Date('2025-05-26'),
              tipo: 'feriado',
              nombre: 'Corpus Christi',
              descripcion: '60 días después de Pentecostés'
            },
            {
              fecha: new Date('2025-06-02'),
              tipo: 'feriado',
              nombre: 'Sagrado Corazón de Jesús',
              descripcion: '19 días después de Pentecostés'
            },
            {
              fecha: new Date('2025-06-23'),
              tipo: 'feriado',
              nombre: 'Sagrado Corazón de Jesús (Puente)',
              descripcion: 'Puente festivo'
            },
            {
              fecha: new Date('2025-11-03'),
              tipo: 'feriado',
              nombre: 'Todos los Santos',
              descripcion: 'Día de los Difuntos'
            },
            {
              fecha: new Date('2025-11-17'),
              tipo: 'feriado',
              nombre: 'Independencia de Cartagena',
              descripcion: 'Independencia de Cartagena de Indias'
            }
          ]
        }
      },
      include: {
        diasCalendario: true,
        excepciones: true
      }
    })

    // Crear configuración por defecto para la empresa
    await prisma.configuracionCalendario.upsert({
      where: {
        entidadTipo_entidadId: {
          entidadTipo: 'empresa',
          entidadId: 'default'
        }
      },
      update: {
        calendarioLaboralId: calendario.id
      },
      create: {
        entidadTipo: 'empresa',
        entidadId: 'default',
        calendarioLaboralId: calendario.id,
        calendarioPredeterminado: true
      }
    })

    console.log('✅ Calendario laboral creado exitosamente')
    console.log(`📅 ${calendario.nombre}`)
    console.log(`🏢 ${calendario.empresa}`)
    console.log(`📍 ${calendario.pais}`)
    console.log(`🕒 ${calendario.horasPorDia} horas/día`)
    console.log(`📅 ${calendario.diasLaborables.length} días laborables`)
    console.log(`🎉 ${calendario.excepciones.length} feriados configurados`)

  } catch (error) {
    console.error('❌ Error creando calendario laboral:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createCalendarioLaboral()
    .then(() => {
      console.log('🎉 Script completado exitosamente')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Error en el script:', error)
      process.exit(1)
    })
}

module.exports = { createCalendarioLaboral }