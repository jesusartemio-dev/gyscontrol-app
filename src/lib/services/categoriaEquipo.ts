export async function getCategoriaEquipo() {
  const res = await fetch('/api/categoria-equipo')
  if (!res.ok) throw new Error('Error al obtener categorías de equipo')
  return res.json()
}

export async function createCategoriaEquipo(data: { nombre: string }) {
  const res = await fetch('/api/categoria-equipo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('❌ Error al crear categoría de equipo:', errorText)
    throw new Error('Error al crear categoría de equipo: ' + errorText)
  }

  return res.json() // ✅ debe devolver { id, nombre }
}

export async function deleteCategoriaEquipo(id: string) {
  const res = await fetch(`/api/categoria-equipo/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('❌ Error al eliminar categoría de equipo:', errorText)
    throw new Error('Error al eliminar categoría de equipo: ' + errorText)
  }

  return res.json()
}
