# 🔌 API Documentation - Sistema de Cronograma de 4 Niveles

## 📋 Índice

- [API de Fases](#api-de-fases)
- [API de EDTs](#api-de-edts)
- [API de Métricas](#api-de-métricas)
- [API de Tareas](#api-de-tareas)
- [Modelos de Datos](#modelos-de-datos)
- [Códigos de Error](#códigos-de-error)

## 📋 API de Fases

### GET `/api/proyectos/[id]/fases`

Obtiene la lista de fases de un proyecto específico.

#### Parámetros
- `id` (string, requerido): ID del proyecto

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "nombre": "string",
      "descripcion": "string",
      "estado": "planificado|en_progreso|completado|pausado|cancelado",
      "porcentajeAvance": 0,
      "fechaInicioPlan": "2025-01-01T00:00:00.000Z",
      "fechaFinPlan": "2025-12-31T00:00:00.000Z",
      "proyectoId": "string",
      "proyectoCronogramaId": "string",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Errores
- `401`: No autorizado
- `404`: Proyecto no encontrado
- `500`: Error interno del servidor

### POST `/api/proyectos/[id]/fases`

Crea una nueva fase para el proyecto especificado.

#### Parámetros
- `id` (string, requerido): ID del proyecto

#### Body
```json
{
  "nombre": "string",
  "descripcion": "string",
  "fechaInicioPlan": "2025-01-01T00:00:00.000Z",
  "fechaFinPlan": "2025-12-31T00:00:00.000Z"
}
```

#### Respuesta Exitosa (201)
```json
{
  "success": true,
  "data": {
    "id": "string",
    "nombre": "string",
    "descripcion": "string",
    "estado": "planificado",
    "porcentajeAvance": 0,
    "fechaInicioPlan": "2025-01-01T00:00:00.000Z",
    "fechaFinPlan": "2025-12-31T00:00:00.000Z",
    "proyectoId": "string",
    "proyectoCronogramaId": "string"
  },
  "message": "Fase creada exitosamente"
}
```

### PUT `/api/proyectos/[id]/fases/[faseId]`

Actualiza una fase específica.

#### Parámetros
- `id` (string, requerido): ID del proyecto
- `faseId` (string, requerido): ID de la fase

#### Body
```json
{
  "nombre": "string",
  "descripcion": "string",
  "estado": "en_progreso",
  "porcentajeAvance": 25,
  "fechaInicioPlan": "2025-01-01T00:00:00.000Z",
  "fechaFinPlan": "2025-12-31T00:00:00.000Z"
}
```

### DELETE `/api/proyectos/[id]/fases/[faseId]`

Elimina una fase específica.

#### Parámetros
- `id` (string, requerido): ID del proyecto
- `faseId` (string, requerido): ID de la fase

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "message": "Fase eliminada exitosamente"
}
```

## 🔧 API de EDTs

### GET `/api/proyectos/[id]/edt`

Obtiene la lista de EDTs de un proyecto con filtros opcionales.

#### Parámetros
- `id` (string, requerido): ID del proyecto

#### Query Parameters
- `categoriaServicioId` (string, opcional): Filtrar por categoría
- `estado` (string, opcional): Filtrar por estado
- `responsableId` (string, opcional): Filtrar por responsable
- `zona` (string, opcional): Filtrar por zona

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "nombre": "string",
      "categoriaServicio": {
        "id": "string",
        "nombre": "string"
      },
      "responsable": {
        "id": "string",
        "name": "string",
        "email": "string"
      },
      "estado": "planificado",
      "prioridad": "media",
      "zona": "string",
      "horasPlan": 100,
      "horasReales": 0,
      "porcentajeAvance": 0,
      "fechaInicioPlan": "2025-01-01T00:00:00.000Z",
      "fechaFinPlan": "2025-12-31T00:00:00.000Z",
      "proyectoId": "string",
      "proyectoFaseId": "string"
    }
  ],
  "metricas": {
    "total": 10,
    "planificados": 5,
    "enProgreso": 3,
    "completados": 2,
    "horasEstimadasTotal": 1000,
    "horasRealesTotal": 750
  }
}
```

### POST `/api/proyectos/[id]/edt`

Crea un nuevo EDT para el proyecto.

#### Parámetros
- `id` (string, requerido): ID del proyecto

#### Body
```json
{
  "categoriaServicioId": "string",
  "proyectoFaseId": "string",
  "zona": "string",
  "fechaInicioPlan": "2025-01-01T00:00:00.000Z",
  "fechaFinPlan": "2025-12-31T00:00:00.000Z",
  "horasEstimadas": 100,
  "responsableId": "string",
  "descripcion": "string",
  "prioridad": "media"
}
```

#### Respuesta Exitosa (201)
```json
{
  "success": true,
  "data": {
    "id": "string",
    "nombre": "string",
    "estado": "planificado",
    "prioridad": "media",
    "horasPlan": 100,
    "horasReales": 0,
    "porcentajeAvance": 0
  },
  "message": "EDT creado exitosamente"
}
```

### PUT `/api/proyectos/[id]/edt`

Actualización masiva de EDTs.

#### Body
```json
{
  "edtIds": ["string1", "string2"],
  "updates": {
    "estado": "en_progreso",
    "porcentajeAvance": 50
  }
}
```

### DELETE `/api/proyectos/[id]/edt`

Eliminación masiva de EDTs.

#### Query Parameters
- `ids` (string, requerido): IDs separados por coma

#### Ejemplo
```
DELETE /api/proyectos/123/edt?ids=edt1,edt2,edt3
```

## 📊 API de Métricas

### GET `/api/proyectos/[id]/edt/metricas`

Obtiene métricas consolidadas del proyecto.

#### Respuesta Exitosa (200)
```json
{
  "success": true,
  "data": {
    "totalEdts": 10,
    "edtsPlanificados": 5,
    "edtsEnProgreso": 3,
    "edtsCompletados": 2,
    "edtsRetrasados": 0,
    "horasPlanTotal": 1000,
    "horasRealesTotal": 750,
    "promedioAvance": 75,
    "eficienciaGeneral": 85,
    "cumplimientoFechas": 90,
    "desviacionPresupuestaria": -5,
    "fechaCalculo": "2025-09-23T12:00:00.000Z"
  }
}
```

## ✅ API de Tareas

### GET `/api/proyecto-edt/[id]/tareas`

Obtiene las tareas de un EDT específico.

### POST `/api/proyecto-edt/[id]/tareas`

Crea una nueva tarea para el EDT.

#### Body
```json
{
  "nombre": "string",
  "descripcion": "string",
  "fechaInicio": "2025-01-01T00:00:00.000Z",
  "fechaFin": "2025-01-15T00:00:00.000Z",
  "horasEstimadas": 40,
  "responsableId": "string",
  "prioridad": "media"
}
```

## 📋 Modelos de Datos

### ProyectoFase
```typescript
interface ProyectoFase {
  id: string
  nombre: string
  descripcion?: string
  estado: 'planificado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado'
  porcentajeAvance: number
  fechaInicioPlan?: Date
  fechaFinPlan?: Date
  proyectoId: string
  proyectoCronogramaId?: string
  createdAt: Date
  updatedAt: Date
}
```

### ProyectoEdt
```typescript
interface ProyectoEdt {
  id: string
  nombre?: string
  categoriaServicioId: string
  proyectoFaseId?: string
  zona?: string
  fechaInicioPlan?: Date
  fechaFinPlan?: Date
  horasPlan: number
  horasReales: number
  responsableId?: string
  descripcion?: string
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  estado: 'planificado' | 'en_progreso' | 'completado' | 'pausado' | 'cancelado' | 'detenido'
  porcentajeAvance: number
  proyectoId: string
  createdAt: Date
  updatedAt: Date
}
```

### ProyectoTarea
```typescript
interface ProyectoTarea {
  id: string
  nombre: string
  descripcion?: string
  fechaInicio: Date
  fechaFin: Date
  horasEstimadas: number
  horasReales: number
  responsableId?: string
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
  porcentajeCompletado: number
  proyectoEdtId: string
  proyectoCronogramaId?: string
  createdAt: Date
  updatedAt: Date
}
```

## 🚨 Códigos de Error

### Errores de Autenticación (4xx)
- `401`: No autorizado - Sesión expirada o inválida
- `403`: Sin permisos - Usuario no tiene rol requerido

### Errores de Validación (4xx)
- `400`: Datos inválidos - Campos requeridos faltantes o formato incorrecto
- `404`: Recurso no encontrado - ID no existe en base de datos
- `409`: Conflicto - Unicidad violada (ej: EDT duplicado)
- `422`: Validación fallida - Reglas de negocio no cumplidas

### Errores del Servidor (5xx)
- `500`: Error interno - Problema en el servidor
- `503`: Servicio no disponible - Base de datos offline

### Estructura de Error
```json
{
  "error": "Mensaje descriptivo del error",
  "detalles": "Información adicional (opcional)",
  "codigo": "CODIGO_ERROR"
}
```

## 🔐 Autenticación y Autorización

### Headers Requeridos
```
Authorization: Bearer <token>
Content-Type: application/json
```

### Roles y Permisos

| Operación | Admin | Gerente | Proyectos | Usuario |
|-----------|-------|---------|-----------|---------|
| GET Fases | ✅ | ✅ | ✅ | ✅ |
| POST Fases | ✅ | ✅ | ✅ | ❌ |
| PUT Fases | ✅ | ✅ | ✅ | ❌ |
| DELETE Fases | ✅ | ✅ | ❌ | ❌ |
| GET EDTs | ✅ | ✅ | ✅ | ✅ |
| POST EDTs | ✅ | ✅ | ✅ | ❌ |
| PUT EDTs | ✅ | ✅ | ✅ | ❌ |
| DELETE EDTs | ✅ | ✅ | ❌ | ❌ |
| GET Métricas | ✅ | ✅ | ✅ | ✅ |

## 📊 Rate Limiting

- **GET requests**: 100 por minuto por usuario
- **POST/PUT/DELETE**: 30 por minuto por usuario
- **Headers de respuesta**:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1634567890
  ```

## 🔍 Paginación

Para endpoints que retornan listas grandes:

### Parámetros
- `page` (number, opcional): Página actual (default: 1)
- `limit` (number, opcional): Elementos por página (default: 50, max: 100)

### Respuesta con Paginación
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 📝 Versionado de API

### Headers de Versión
```
Accept: application/vnd.gys.v1+json
```

### Versiones Soportadas
- **v1.0**: Versión actual (2025-09)
- **v0.9**: Versión anterior (deprecated)

## 🧪 Testing

### Colección Postman
- **Archivo**: `postman/GYS_Cronograma_API.postman_collection.json`
- **Variables**: Configurar `base_url` y `auth_token`

### Ejemplos de Testing
```bash
# Obtener fases de un proyecto
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/proyectos/123/fases

# Crear nueva fase
curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"nombre":"Fase 1","descripcion":"Primera fase"}' \
     http://localhost:3000/api/proyectos/123/fases
```

---

**📅 Última actualización**: 23 de septiembre de 2025
**📧 Contacto**: api@gys.com
**🔗 Documentación**: docs.gys.com/api/cronograma