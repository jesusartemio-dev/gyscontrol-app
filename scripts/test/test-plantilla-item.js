// Script de prueba para debuggear el error de PlantillaEquipoItem

const testData = {
  plantillaEquipoId: 'cmf32t1og0000l8v8fjpnu488', // ID de la plantilla
  catalogoEquipoId: 'test-equipo-id', // Necesitamos un ID válido
  cantidad: 1,
  observaciones: 'Prueba de creación'
}

console.log('🔍 Datos de prueba:', testData)

// Simular la llamada al servicio
fetch('http://localhost:3000/api/catalogo-equipo')
  .then(res => res.json())
  .then(equipos => {
    console.log('📦 Equipos disponibles:', equipos.slice(0, 3)) // Solo los primeros 3
    
    if (equipos.length > 0) {
      const primerEquipo = equipos[0]
      console.log('🎯 Usando primer equipo:', primerEquipo)
      
      // Probar obtener equipo específico
      return fetch(`http://localhost:3000/api/catalogo-equipo/${primerEquipo.id}`)
    } else {
      throw new Error('No hay equipos en el catálogo')
    }
  })
  .then(res => {
    console.log('📡 Respuesta GET equipo específico:', res.status, res.statusText)
    return res.json()
  })
  .then(equipo => {
    console.log('✅ Equipo obtenido:', equipo)
  })
  .catch(error => {
    console.error('❌ Error en la prueba:', error)
  })