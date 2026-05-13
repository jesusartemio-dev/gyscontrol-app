import MppClient from '@/components/mpp/MppClient'

type Ctx = { params: Promise<{ id: string }> }

export default async function MppPage({ params }: Ctx) {
  const { id } = await params
  return <MppClient proyectoId={id} />
}
