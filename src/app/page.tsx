import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Dashboard from '@/components/dashboard/Dashboard'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return redirect('/login')
  }

  // Render dashboard for all authenticated users
  return <Dashboard />
}
