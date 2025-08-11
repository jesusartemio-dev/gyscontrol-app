export async function getListaPorProyecto(proyectoId: string) {
  const res = await fetch(`/api/lista-por-proyecto?proyectoId=${proyectoId}`)
  if (!res.ok) throw new Error('Error al obtener listas del proyecto')
  return res.json()
}
