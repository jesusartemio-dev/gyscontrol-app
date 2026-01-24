import { NextResponse } from 'next/server'

// Simple test to check if Prisma is working
export async function GET() {
  try {
    console.log('🔍 Testing Prisma connection...')
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET')
    
    // Test basic prisma import
    const { PrismaClient } = await import('@prisma/client')
    console.log('✅ PrismaClient imported successfully')
    
    // Test database connection
    const prisma = new PrismaClient()
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection successful')
    
    // Test if our table exists
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "plantilla_duracion_cronograma"
      ` as Array<{ count: number }>
      console.log('✅ Table exists, count:', result[0]?.count || 0)
    } catch (tableError) {
      console.log('❌ Table error:', tableError instanceof Error ? tableError.message : 'Unknown error')
    }
    
    await prisma.$disconnect()
    
    return NextResponse.json({
      success: true,
      message: 'Prisma connection test successful',
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    })
    
  } catch (error) {
    console.error('❌ Prisma connection test failed:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
    }, { status: 500 })
  }
}