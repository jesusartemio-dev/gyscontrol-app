// ===================================================
// 📁 Archivo: delete-fases-default.js
// 📌 Descripción: Script para eliminar fases por defecto creadas
// ===================================================

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🗑️ Eliminando fases por defecto creadas...')

  const fasesAEliminar = [
    'Planificación',
    'Ejecución',
    'Pruebas',
    'Cierre'
  ]

  for (const nombreFase of fasesAEliminar) {
    const fase = await prisma.faseDefault.findFirst({
      where: { nombre: nombreFase }
    })

    if (fase) {
      await prisma.faseDefault.delete({
        where: { id: fase.id }
      })
      console.log(`✅ Fase eliminada: ${nombreFase}`)
    } else {
      console.log(`⚠️ Fase no encontrada: ${nombreFase}`)
    }
  }

  console.log('🎉 Fases por defecto eliminadas exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })