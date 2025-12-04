import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Test endpoint that bypasses auth to test the Prisma model specifically
export async function GET() {
  try {
    console.log('🔍 Testing Prisma model in production route...')
    console.log('Prisma object type:', typeof prisma)
    console.log('Prisma keys:', Object.keys(prisma || {}))
    
    // Check if the specific model exists
    const hasModel = (prisma as any).plantillaDuracionCronograma !== undefined
    console.log('Has plantillaDuracionCronograma model:', hasModel)
    
    if (hasModel) {
      console.log('✅ Model exists, attempting query...')
      const duraciones = await (prisma as any).plantillaDuracionCronograma.findMany({
        orderBy: { nivel: 'asc' }
      })
      console.log('✅ Query successful, count:', duraciones.length)
      
      return NextResponse.json({
        success: true,
        message: 'Prisma model test successful',
        data: duraciones,
        modelExists: true,
        count: duraciones.length
      })
    } else {
      console.log('❌ Model does not exist')
      return NextResponse.json({
        success: false,
        error: 'Model does not exist on Prisma client',
        modelExists: false,
        availableModels: Object.keys(prisma || {})
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Prisma model test failed:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      modelExists: false,
      stack: error.stack
    }, { status: 500 })
  }
}