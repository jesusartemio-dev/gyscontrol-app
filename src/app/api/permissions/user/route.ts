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

    const userPermissions = await getUserPermissions(session.user.id)

    return NextResponse.json(userPermissions)
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
