export async function getUnidades() {
  const res = await fetch('/api/unidad')
  if (!res.ok) throw new Error('Error al obtener unidades')
  return res.json()
}

export async function createUnidad(data: { nombre: string }) {
  const res = await fetch('/api/unidad', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error('Error al crear unidad')
  return res.json()
}

