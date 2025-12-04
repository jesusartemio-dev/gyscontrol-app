// ===================================================
// 📁 Archivo: create-fases-default.js
// 📌 Descripción: Script para crear fases por defecto en la base de datos
// ===================================================

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando fases por defecto...')

  const fasesDefault = [
    {
      nombre: 'Planificación',
      descripcion: 'Fase de planificación y diseño del proyecto',
      orden: 1,
      activo: true,
      duracionDias: 30,
      color: '#3B82F6'
    },
    {
      nombre: 'Ejecución',
      descripcion: 'Fase de ejecución e implementación',
      orden: 2,
      activo: true,
      duracionDias: 60,
      color: '#10B981'
    },
    {
      nombre: 'Pruebas',
      descripcion: 'Fase de pruebas y validación',
      orden: 3,
      activo: true,
      duracionDias: 15,
      color: '#F59E0B'
    },
    {
      nombre: 'Cierre',
      descripcion: 'Fase de cierre y entrega final',
      orden: 4,
      activo: true,
      duracionDias: 10,
      color: '#EF4444'
    }
  ]

  for (const fase of fasesDefault) {
    const existing = await prisma.faseDefault.findFirst({
      where: { nombre: fase.nombre }
    })

    if (!existing) {
      await prisma.faseDefault.create({
        data: fase
      })
      console.log(`✅ Fase creada: ${fase.nombre}`)
    } else {
      console.log(`⚠️ Fase ya existe: ${fase.nombre}`)
    }
  }

  console.log('🎉 Fases por defecto creadas exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })