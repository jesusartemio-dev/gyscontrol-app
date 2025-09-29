// API endpoint for checking user permissions
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { checkUserPermission } from '@/lib/services/permissions'
import type { PermissionResource, PermissionAction } from '@/types/permissions'

export async function POST(request: NextRequest) {
  try {
    // For debugging, temporarily allow all requests
    console.log('Permission check API called')

    const { resource, action } = await request.json()
    console.log('Resource:', resource, 'Action:', action)

    // Temporary: return mock permission result
    return NextResponse.json({
      hasPermission: true,
      reason: 'Mock permission granted for debugging'
    })

    /*
    const session = await getServerSession(authOptions)
    console.log('Session:', session)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { resource, action } = await request.json()

    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Missing resource or action' },
        { status: 400 }
      )
    }

    const result = await checkUserPermission(session.user.id, resource as PermissionResource, action as PermissionAction)

    return NextResponse.json(result)
    */
  } catch (error) {
    console.error('Error checking permission:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}