import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { events } = await request.json()

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Events must be an array' },
        { status: 400 }
      )
    }

    // Process events in batches to avoid overwhelming the database
    const batchSize = 50
    const batches = []

    for (let i = 0; i < events.length; i += batchSize) {
      batches.push(events.slice(i, i + batchSize))
    }

    for (const batch of batches) {
      await prisma.analyticsEvent.createMany({
        data: batch.map(event => ({
          event: event.event,
          category: event.category,
          action: event.action,
          label: event.label,
          value: event.value,
          metadata: event.metadata || {},
          timestamp: new Date(event.timestamp),
          userId: event.userId,
          sessionId: event.sessionId,
          userAgent: event.userAgent,
          url: event.url
        })),
        skipDuplicates: true
      })
    }

    return NextResponse.json({
      success: true,
      processed: events.length,
      message: `Processed ${events.length} analytics events`
    })

  } catch (error) {
    console.error('Error processing analytics events:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const event = searchParams.get('event')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (category) where.category = category
    if (event) where.event = event

    const events = await prisma.analyticsEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 1000), // Max 1000 records
      skip: offset
    })

    const total = await prisma.analyticsEvent.count({ where })

    return NextResponse.json({
      events,
      total,
      limit,
      offset
    })

  } catch (error) {
    console.error('Error fetching analytics events:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}