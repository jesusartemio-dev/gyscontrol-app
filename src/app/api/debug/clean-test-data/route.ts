import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Debug endpoint to clean test data
export async function POST() {
  try {
    console.log('🧹 Cleaning up test data...')
    
    // Clear all data from the table
    await prisma.$queryRaw`DELETE FROM "plantilla_duracion_cronograma"`
    
    console.log('✅ Test data cleaned successfully')
    
    // Verify the table is empty
    const countResult = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "plantilla_duracion_cronograma"`
    const currentCount = Array.isArray(countResult) ? countResult[0]?.count || 0 : 0
    
    return NextResponse.json({
      success: true,
      message: 'Test data cleaned successfully',
      remainingRecords: currentCount
    })
    
  } catch (error) {
    console.error('❌ Failed to clean test data:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}