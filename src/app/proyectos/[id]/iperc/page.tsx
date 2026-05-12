import IpercClient from '@/components/iperc/IpercClient'

type Ctx = { params: Promise<{ id: string }> }

export default async function IpercPage({ params }: Ctx) {
  const { id } = await params
  return <IpercClient proyectoId={id} />
}
