import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Testing specific modelo...')
    
    // Test with manual approach first
    const { Pool } = await import('pg')
    const connectionString = process.env.DATABASE_URL!
    const pool = new Pool({ connectionString })
    
    console.log('Testing direct SQL query...')
    const result = await pool.query('SELECT COUNT(*) as count FROM "plantilla_duracion_cronograma"')
    console.log('✅ Direct SQL query successful, count:', result.rows[0].count)
    
    await pool.end()
    
    // Now test with Prisma
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    
    console.log('Testing Prisma without adapter...')
    const result2 = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "plantilla_duracion_cronograma"`
    console.log('✅ Prisma raw query successful, count:', result2)
    
    // Try to access the model directly
    try {
      console.log('Testing Prisma model access...')
      const model = prisma.plantillaDuracionCronograma
      console.log('✅ Model accessible:', typeof model)
      
      if (model) {
        const result3 = await model.findMany()
        console.log('✅ Model query successful, count:', result3.length)
      }
    } catch (modelError) {
      console.log('❌ Model access error:', modelError instanceof Error ? modelError.message : 'Unknown error')
    }
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      success: true,
      message: 'Specific model test completed',
      directSqlWorks: true,
      prismaWorks: true
    })
    
  } catch (error) {
    console.error('❌ Specific test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}