import { PetsClient } from '@/components/pets/PetsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PetsPage({ params }: Props) {
  const { id } = await params
  return <PetsClient proyectoId={id} />
}
