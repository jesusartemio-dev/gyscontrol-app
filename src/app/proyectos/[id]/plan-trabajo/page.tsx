import { PlanTrabajoClient } from './_components/PlanTrabajoClient'

type Ctx = { params: Promise<{ id: string }> }

export default async function PlanTrabajoPage({ params }: Ctx) {
  const { id } = await params
  return <PlanTrabajoClient proyectoId={id} />
}
