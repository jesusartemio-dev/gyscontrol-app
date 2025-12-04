// API endpoint for getting user permissions
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { getServerSession } from 'next-auth/next'
import { getUserPermissions } from '@/lib/services/permissions'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get userId from query params, default to current user
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    // Only allow admins to view other users' permissions
    if (userId !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Can only view own permissions' },
        { status: 403 }
      )
    }

    const userPermissions = await getUserPermissions(userId)

    return NextResponse.json(userPermissions)
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
