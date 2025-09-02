import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return redirect('/login')
  }

  // ✅ Aquí puedes redirigir según rol, si deseas
  if (session.user.role === 'admin') return redirect('/admin/usuarios')
  if (session.user.role === 'comercial') return redirect('/comercial/plantillas')
  if (session.user.role === 'proyectos') return redirect('/proyectos')
  if (session.user.role === 'logistico') return redirect('/logistica')

  return <p>Sin rol válido</p>
}
