import { PlanTrabajoCampoClient } from '../_components/campo/PlanTrabajoCampoClient'

type Ctx = { params: Promise<{ id: string }> }

export default async function PlanTrabajoCampoPage({ params }: Ctx) {
  const { id } = await params
  return <PlanTrabajoCampoClient proyectoId={id} />
}
