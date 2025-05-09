export async function getNivelServicio() {
  const res = await fetch('/api/nivel-servicio')
  if (!res.ok) throw new Error('Error al obtener niveles de servicio')
  const data = await res.json()

  // Mapea los datos para que tengan el formato { value, label }
  return data.map((d: any) => ({
    value: d.id,
    label: d.nombre
  }))
}
