// Script to execute database migration for adding hours fields
// Run with: node scripts/execute-migration.js

const { execSync } = require('child_process')

async function runMigration() {
  console.log('🚀 Iniciando migración de campos de horas...')
  console.log('📝 Usando Prisma para sincronizar el esquema con la base de datos...')

  try {
    // Usar Prisma db push para sincronizar el esquema completo
    console.log('🔄 Ejecutando: npx prisma db push --force-reset')
    execSync('npx prisma db push --force-reset', {
      stdio: 'inherit',
      cwd: process.cwd()
    })

    console.log('🎉 Migración completada exitosamente!')
    console.log('')
    console.log('Los campos agregados permiten:')
    console.log('• Exportación completa a MS Project con campos <Work>')
    console.log('• Consistencia en todos los niveles de la jerarquía')
    console.log('• Flexibilidad para cálculos de horas en cualquier nivel')
    console.log('• Compatibilidad con tareas hoja que no tienen hijos')
    console.log('')
    console.log('⚠️  ADVERTENCIA: Se realizó un force-reset de la base de datos.')
    console.log('   Asegúrate de tener respaldos de tus datos importantes.')

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message)
    console.log('')
    console.log('💡 Soluciones alternativas:')
    console.log('1. Ejecuta manualmente: npx prisma db push')
    console.log('2. Si hay datos importantes, usa: npx prisma migrate dev')
    console.log('3. O ejecuta las ALTER TABLE statements directamente en tu base de datos')
    process.exit(1)
  }
}

// Ejecutar la migración
runMigration()