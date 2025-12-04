import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Import our app's prisma client
    const { prisma } = await import('@/lib/prisma')
    
    console.log('🌱 Populating database with test data...')
    
    // Insert test data if table is empty
    const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "plantilla_duracion_cronograma"`
    const currentCount = Array.isArray(countResult) ? countResult[0]?.count || 0 : 0
    
    if (currentCount === 0) {
      console.log('📝 No existing data, inserting test records...')
      
      await prisma.$queryRaw`
        INSERT INTO "plantilla_duracion_cronograma" 
        ("id", "tipoProyecto", "nivel", "duracionDias", "horasPorDia", "bufferPorcentaje", "activo", "createdAt", "updatedAt") 
        VALUES 
        (gen_random_uuid(), 'construccion', 'fase', 30, 8, 15, true, NOW(), NOW()),
        (gen_random_uuid(), 'construccion', 'edt', 15, 8, 10, true, NOW(), NOW()),
        (gen_random_uuid(), 'construccion', 'actividad', 3, 8, 5, true, NOW(), NOW()),
        (gen_random_uuid(), 'construccion', 'tarea', 1, 8, 3, true, NOW(), NOW()),
        (gen_random_uuid(), 'instalacion', 'fase', 20, 8, 12, true, NOW(), NOW()),
        (gen_random_uuid(), 'instalacion', 'edt', 10, 8, 8, true, NOW(), NOW()),
        (gen_random_uuid(), 'instalacion', 'actividad', 2, 8, 4, true, NOW(), NOW()),
        (gen_random_uuid(), 'instalacion', 'tarea', 0.5, 8, 2, true, NOW(), NOW()),
        (gen_random_uuid(), 'mantenimiento', 'fase', 10, 8, 10, true, NOW(), NOW()),
        (gen_random_uuid(), 'mantenimiento', 'edt', 5, 8, 7, true, NOW(), NOW()),
        (gen_random_uuid(), 'mantenimiento', 'actividad', 1, 8, 3, true, NOW(), NOW()),
        (gen_random_uuid(), 'mantenimiento', 'tarea', 0.25, 8, 1, true, NOW(), NOW())
      `
      
      console.log('✅ Test data inserted successfully')
    } else {
      console.log(`✅ Database already has ${currentCount} records`)
    }
    
    // Test the main API query
    const testQuery = await prisma.$queryRaw`
      SELECT * FROM "plantilla_duracion_cronograma" 
      ORDER BY "nivel" ASC
    `
    
    console.log('✅ Main API query test successful')
    
    return NextResponse.json({
      success: true,
      message: 'Database populated successfully',
      recordCount: Array.isArray(testQuery) ? testQuery.length : 0,
      data: testQuery
    })
    
  } catch (error) {
    console.error('❌ Database population failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}