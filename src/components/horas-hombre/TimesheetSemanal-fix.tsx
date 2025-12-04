'use client'

interface Proyecto {
  id: string
  nombre: string
  cliente: string
}

// Cargar proyectos disponibles
const loadProyectos = async (
  setLoadingProyectos: (loading: boolean) => void,
  setProyectos: (proyectos: Proyecto[]) => void,
  toast: any
) => {
  try {
    setLoadingProyectos(true)
    const response = await fetch('/api/proyectos')
    if (!response.ok) throw new Error('Error al cargar proyectos')

    const data = await response.json()
    console.log('✅ Proyectos cargados:', data)
    console.log('🎨 DEBUG: Proyectos raw data:', data)
    console.log('🎨 DEBUG: data.data structure:', data.data)
    console.log('🎨 DEBUG: Array.isArray(data.data):', Array.isArray(data.data))

    // Transformar datos para el select
    const proyectosFormatted = data.data?.map((proyecto: any) => ({
      id: proyecto.id,
      nombre: proyecto.nombre,
      cliente: proyecto.cliente?.nombre || 'Sin cliente'
    })) || []

    console.log('🎨 DEBUG: Proyectos formatted:', proyectosFormatted)
    console.log('🎨 DEBUG: Array length:', proyectosFormatted.length)

    setProyectos(proyectosFormatted)
  } catch (error) {
    console.error('Error cargando proyectos:', error)
    toast({
      title: 'Error',
      description: 'No se pudieron cargar los proyectos',
      variant: 'destructive'
    })
  } finally {
    setLoadingProyectos(false)
  }
}

export { loadProyectos }
export type { Proyecto }