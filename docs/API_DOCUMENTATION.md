# 📡 Documentación de APIs - Sistema GYS

## 📋 Información General

**Proyecto:** Sistema de Gestión y Servicios (GYS)  
**Versión:** 1.0.0  
**Fecha:** Enero 2025  
**Autor:** TRAE - Agente Senior Fullstack  
**Tipo:** Documentación de APIs REST  

---

## 🎯 Resumen Ejecutivo

Esta documentación describe todas las APIs REST del Sistema GYS, incluyendo endpoints de autenticación, gestión de entregas, reportes, trazabilidad y administración. Incluye ejemplos de uso, códigos de respuesta, esquemas de datos y guías de integración.

---

## 🏗️ Arquitectura de APIs

### Estructura Base

```
/api/
├── auth/                 # Autenticación y autorización
│   ├── signin
│   ├── signout
│   └── session
├── entregas/             # Gestión de entregas
│   ├── [id]/
│   ├── estados/
│   └── export/
├── items/                # Items de entrega
│   ├── [id]/
│   └── bulk/
├── trazabilidad/         # Seguimiento y eventos
│   ├── [itemId]/
│   └── eventos/
├── reportes/             # Reportes y analytics
│   ├── dashboard/
│   ├── export/
│   └── metricas/
├── clientes/             # Gestión de clientes
│   └── [id]/
├── productos/            # Catálogo de productos
│   └── [id]/
├── usuarios/             # Gestión de usuarios
│   └── [id]/
└── health/               # Health check
```

### Convenciones

- **Base URL:** `https://gys.empresa.com/api`
- **Formato:** JSON
- **Autenticación:** JWT Bearer Token
- **Versionado:** Headers (`API-Version: v1`)
- **Rate Limiting:** 100 requests/minuto por usuario
- **CORS:** Habilitado para dominios autorizados

---

## 🔐 Autenticación y Autorización

### Flujo de Autenticación

```mermaid
sequenceDiagram
    participant C as Cliente
    participant A as API
    participant DB as Database
    participant JWT as JWT Service
    
    C->>A: POST /api/auth/signin
    A->>DB: Verificar credenciales
    DB-->>A: Usuario válido
    A->>JWT: Generar token
    JWT-->>A: JWT token
    A-->>C: { token, user, expires }
    
    Note over C: Incluir token en headers
    C->>A: GET /api/entregas (Authorization: Bearer token)
    A->>JWT: Verificar token
    JWT-->>A: Token válido + payload
    A->>DB: Consultar datos
    DB-->>A: Datos solicitados
    A-->>C: Respuesta con datos
```

### Endpoints de Autenticación

#### POST /api/auth/signin

**Descripción:** Iniciar sesión de usuario

**Request:**
```json
{
  "email": "usuario@empresa.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-123",
      "email": "usuario@empresa.com",
      "name": "Juan Pérez",
      "role": "COMERCIAL",
      "permissions": ["entregas:read", "entregas:create"]
    },
    "expires": "2025-01-22T10:00:00Z"
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email o contraseña incorrectos",
    "details": null
  }
}
```

#### POST /api/auth/signout

**Descripción:** Cerrar sesión de usuario

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

#### GET /api/auth/session

**Descripción:** Obtener información de sesión actual

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "usuario@empresa.com",
      "name": "Juan Pérez",
      "role": "COMERCIAL",
      "permissions": ["entregas:read", "entregas:create"]
    },
    "expires": "2025-01-22T10:00:00Z"
  }
}
```

### Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **ADMIN** | Todos los permisos |
| **GERENTE** | `entregas:*`, `reportes:*`, `usuarios:read` |
| **COMERCIAL** | `entregas:read`, `entregas:create`, `clientes:*` |
| **LOGISTICA** | `entregas:*`, `items:*`, `trazabilidad:*` |
| **PROYECTOS** | `entregas:read`, `reportes:read` |
| **COLABORADOR** | `entregas:read`, `items:read` |

---

## 📦 API de Entregas

### GET /api/entregas

**Descripción:** Obtener lista paginada de entregas

**Query Parameters:**
- `page` (number): Página (default: 1)
- `limit` (number): Items por página (default: 10, max: 100)
- `estado` (string): Filtrar por estado
- `clienteId` (string): Filtrar por cliente
- `fechaDesde` (string): Fecha desde (ISO 8601)
- `fechaHasta` (string): Fecha hasta (ISO 8601)
- `search` (string): Búsqueda por número de entrega
- `sortBy` (string): Campo de ordenamiento
- `sortOrder` (string): Orden (asc|desc)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "entregas": [
      {
        "id": "entrega-123",
        "numeroEntrega": "ENT-2025-001",
        "estado": "PENDIENTE",
        "fechaEntrega": "2025-01-20T10:00:00Z",
        "clienteId": "cliente-456",
        "cliente": {
          "id": "cliente-456",
          "nombre": "Empresa ABC S.A.C.",
          "email": "contacto@empresaabc.com",
          "telefono": "+51 999 888 777"
        },
        "items": [
          {
            "id": "item-789",
            "productoId": "producto-101",
            "producto": {
              "id": "producto-101",
              "nombre": "Laptop Dell Inspiron",
              "codigo": "DELL-INS-001"
            },
            "cantidad": 5,
            "precioUnitario": 2500.00,
            "subtotal": 12500.00,
            "estado": "PENDIENTE"
          }
        ],
        "total": 12500.00,
        "observaciones": "Entrega urgente",
        "createdAt": "2025-01-15T08:30:00Z",
        "updatedAt": "2025-01-15T08:30:00Z",
        "createdBy": {
          "id": "user-123",
          "name": "Juan Pérez"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### POST /api/entregas

**Descripción:** Crear nueva entrega

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request:**
```json
{
  "numeroEntrega": "ENT-2025-002",
  "fechaEntrega": "2025-01-25T14:00:00Z",
  "clienteId": "cliente-456",
  "items": [
    {
      "productoId": "producto-101",
      "cantidad": 3,
      "precioUnitario": 2500.00
    },
    {
      "productoId": "producto-102",
      "cantidad": 2,
      "precioUnitario": 1800.00
    }
  ],
  "observaciones": "Cliente prefiere entrega en horario de mañana"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "entrega-124",
    "numeroEntrega": "ENT-2025-002",
    "estado": "PENDIENTE",
    "fechaEntrega": "2025-01-25T14:00:00Z",
    "clienteId": "cliente-456",
    "total": 11100.00,
    "observaciones": "Cliente prefiere entrega en horario de mañana",
    "createdAt": "2025-01-15T09:15:00Z",
    "updatedAt": "2025-01-15T09:15:00Z"
  },
  "message": "Entrega creada exitosamente"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos de entrada inválidos",
    "details": {
      "numeroEntrega": ["Número de entrega ya existe"],
      "items": ["Debe incluir al menos un item"]
    }
  }
}
```

### GET /api/entregas/[id]

**Descripción:** Obtener entrega por ID

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "entrega-123",
    "numeroEntrega": "ENT-2025-001",
    "estado": "EN_TRANSITO",
    "fechaEntrega": "2025-01-20T10:00:00Z",
    "clienteId": "cliente-456",
    "cliente": {
      "id": "cliente-456",
      "nombre": "Empresa ABC S.A.C.",
      "email": "contacto@empresaabc.com",
      "telefono": "+51 999 888 777",
      "direccion": "Av. Principal 123, Lima"
    },
    "items": [
      {
        "id": "item-789",
        "productoId": "producto-101",
        "producto": {
          "id": "producto-101",
          "nombre": "Laptop Dell Inspiron",
          "codigo": "DELL-INS-001",
          "categoria": "Electrónicos",
          "peso": 2.5,
          "dimensiones": "35x25x2 cm"
        },
        "cantidad": 5,
        "precioUnitario": 2500.00,
        "subtotal": 12500.00,
        "estado": "EN_TRANSITO"
      }
    ],
    "total": 12500.00,
    "observaciones": "Entrega urgente",
    "trazabilidad": [
      {
        "id": "evento-001",
        "tipo": "CREACION",
        "descripcion": "Entrega creada",
        "fecha": "2025-01-15T08:30:00Z",
        "usuario": "Juan Pérez"
      },
      {
        "id": "evento-002",
        "tipo": "CAMBIO_ESTADO",
        "descripcion": "Estado cambiado a EN_TRANSITO",
        "fecha": "2025-01-16T10:15:00Z",
        "usuario": "María García"
      }
    ],
    "createdAt": "2025-01-15T08:30:00Z",
    "updatedAt": "2025-01-16T10:15:00Z"
  }
}
```

### PUT /api/entregas/[id]

**Descripción:** Actualizar entrega completa

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request:**
```json
{
  "fechaEntrega": "2025-01-22T14:00:00Z",
  "observaciones": "Cambio de fecha por solicitud del cliente",
  "items": [
    {
      "id": "item-789",
      "cantidad": 7,
      "precioUnitario": 2400.00
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "entrega-123",
    "numeroEntrega": "ENT-2025-001",
    "fechaEntrega": "2025-01-22T14:00:00Z",
    "total": 16800.00,
    "observaciones": "Cambio de fecha por solicitud del cliente",
    "updatedAt": "2025-01-16T11:30:00Z"
  },
  "message": "Entrega actualizada exitosamente"
}
```

### PATCH /api/entregas/[id]/estado

**Descripción:** Actualizar estado de entrega

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request:**
```json
{
  "estado": "ENTREGADO",
  "observaciones": "Entregado al cliente sin observaciones",
  "fechaEntregaReal": "2025-01-20T15:30:00Z"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "entrega-123",
    "estado": "ENTREGADO",
    "fechaEntregaReal": "2025-01-20T15:30:00Z",
    "updatedAt": "2025-01-20T15:30:00Z"
  },
  "message": "Estado actualizado exitosamente"
}
```

### DELETE /api/entregas/[id]

**Descripción:** Eliminar entrega (solo si está en estado PENDIENTE)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "message": "Entrega eliminada exitosamente"
}
```

**Response (409):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATE",
    "message": "No se puede eliminar una entrega que no está en estado PENDIENTE",
    "details": {
      "currentState": "EN_TRANSITO"
    }
  }
}
```

### GET /api/entregas/estados

**Descripción:** Obtener lista de estados disponibles

**Response (200):**
```json
{
  "success": true,
  "data": {
    "estados": [
      {
        "value": "PENDIENTE",
        "label": "Pendiente",
        "color": "yellow",
        "description": "Entrega creada, pendiente de procesamiento"
      },
      {
        "value": "EN_PREPARACION",
        "label": "En Preparación",
        "color": "blue",
        "description": "Entrega en proceso de preparación"
      },
      {
        "value": "EN_TRANSITO",
        "label": "En Tránsito",
        "color": "purple",
        "description": "Entrega en camino al destino"
      },
      {
        "value": "ENTREGADO",
        "label": "Entregado",
        "color": "green",
        "description": "Entrega completada exitosamente"
      },
      {
        "value": "CANCELADO",
        "label": "Cancelado",
        "color": "red",
        "description": "Entrega cancelada"
      }
    ],
    "transiciones": {
      "PENDIENTE": ["EN_PREPARACION", "CANCELADO"],
      "EN_PREPARACION": ["EN_TRANSITO", "CANCELADO"],
      "EN_TRANSITO": ["ENTREGADO", "CANCELADO"],
      "ENTREGADO": [],
      "CANCELADO": []
    }
  }
}
```

### POST /api/entregas/export

**Descripción:** Exportar entregas a PDF/Excel

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**Request:**
```json
{
  "formato": "pdf",
  "filtros": {
    "fechaDesde": "2025-01-01",
    "fechaHasta": "2025-01-31",
    "estado": "ENTREGADO"
  },
  "incluir": {
    "items": true,
    "trazabilidad": false,
    "totales": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://gys.empresa.com/api/files/exports/entregas-2025-01.pdf",
    "filename": "entregas-2025-01.pdf",
    "size": 245760,
    "expires": "2025-01-16T18:00:00Z"
  },
  "message": "Exportación generada exitosamente"
}
```

---

## 📋 API de Items

### GET /api/items

**Descripción:** Obtener items de entregas con filtros

**Query Parameters:**
- `entregaId` (string): Filtrar por entrega
- `productoId` (string): Filtrar por producto
- `estado` (string): Filtrar por estado
- `page` (number): Página
- `limit` (number): Items por página

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item-789",
        "entregaId": "entrega-123",
        "entrega": {
          "numeroEntrega": "ENT-2025-001",
          "fechaEntrega": "2025-01-20T10:00:00Z"
        },
        "productoId": "producto-101",
        "producto": {
          "nombre": "Laptop Dell Inspiron",
          "codigo": "DELL-INS-001"
        },
        "cantidad": 5,
        "precioUnitario": 2500.00,
        "subtotal": 12500.00,
        "estado": "PENDIENTE",
        "observaciones": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2
    }
  }
}
```

### PATCH /api/items/[id]/estado

**Descripción:** Actualizar estado de item individual

**Request:**
```json
{
  "estado": "EN_TRANSITO",
  "observaciones": "Item preparado para envío"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "item-789",
    "estado": "EN_TRANSITO",
    "observaciones": "Item preparado para envío",
    "updatedAt": "2025-01-16T14:20:00Z"
  }
}
```

### POST /api/items/bulk

**Descripción:** Operaciones masivas en items

**Request:**
```json
{
  "operacion": "cambiar_estado",
  "items": ["item-789", "item-790", "item-791"],
  "datos": {
    "estado": "EN_PREPARACION",
    "observaciones": "Lote preparado para envío"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "procesados": 3,
    "exitosos": 3,
    "fallidos": 0,
    "errores": []
  },
  "message": "Operación masiva completada exitosamente"
}
```

---

## 🔍 API de Trazabilidad

### GET /api/trazabilidad/[itemId]

**Descripción:** Obtener historial de trazabilidad de un item

**Response (200):**
```json
{
  "success": true,
  "data": {
    "itemId": "item-789",
    "eventos": [
      {
        "id": "evento-001",
        "tipo": "CREACION",
        "descripcion": "Item creado en entrega ENT-2025-001",
        "fecha": "2025-01-15T08:30:00Z",
        "usuario": {
          "id": "user-123",
          "name": "Juan Pérez",
          "role": "COMERCIAL"
        },
        "metadata": {
          "cantidad": 5,
          "precioUnitario": 2500.00
        }
      },
      {
        "id": "evento-002",
        "tipo": "CAMBIO_ESTADO",
        "descripcion": "Estado cambiado de PENDIENTE a EN_PREPARACION",
        "fecha": "2025-01-16T09:15:00Z",
        "usuario": {
          "id": "user-456",
          "name": "María García",
          "role": "LOGISTICA"
        },
        "metadata": {
          "estadoAnterior": "PENDIENTE",
          "estadoNuevo": "EN_PREPARACION"
        }
      }
    ],
    "resumen": {
      "fechaCreacion": "2025-01-15T08:30:00Z",
      "ultimaActualizacion": "2025-01-16T09:15:00Z",
      "totalEventos": 2,
      "estadoActual": "EN_PREPARACION"
    }
  }
}
```

### POST /api/trazabilidad/eventos

**Descripción:** Crear evento de trazabilidad manual

**Request:**
```json
{
  "itemId": "item-789",
  "tipo": "OBSERVACION",
  "descripcion": "Cliente solicita entrega en horario específico",
  "metadata": {
    "horarioPreferido": "14:00-16:00",
    "contacto": "+51 999 888 777"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "evento-003",
    "itemId": "item-789",
    "tipo": "OBSERVACION",
    "descripcion": "Cliente solicita entrega en horario específico",
    "fecha": "2025-01-16T11:45:00Z",
    "usuario": {
      "id": "user-123",
      "name": "Juan Pérez"
    }
  }
}
```

### GET /api/trazabilidad/analytics

**Descripción:** Análisis de trazabilidad y métricas

**Query Parameters:**
- `fechaDesde` (string): Fecha desde
- `fechaHasta` (string): Fecha hasta
- `tipo` (string): Tipo de análisis (tiempos|estados|retrasos)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tiemposPromedio": {
      "PENDIENTE_A_EN_PREPARACION": {
        "promedio": 1.5,
        "unidad": "horas",
        "minimo": 0.5,
        "maximo": 4.0
      },
      "EN_PREPARACION_A_EN_TRANSITO": {
        "promedio": 2.3,
        "unidad": "horas",
        "minimo": 1.0,
        "maximo": 6.0
      }
    },
    "distribucionEstados": {
      "PENDIENTE": 15,
      "EN_PREPARACION": 8,
      "EN_TRANSITO": 12,
      "ENTREGADO": 45,
      "CANCELADO": 2
    },
    "retrasos": {
      "total": 5,
      "porcentaje": 6.1,
      "promedioRetraso": 1.2,
      "unidad": "días"
    }
  }
}
```

---

## 📊 API de Reportes

### GET /api/reportes/dashboard

**Descripción:** Datos para dashboard principal

**Query Parameters:**
- `periodo` (string): Período de análisis (dia|semana|mes|año)
- `fechaDesde` (string): Fecha desde (opcional)
- `fechaHasta` (string): Fecha hasta (opcional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "metricas": {
      "totalEntregas": 156,
      "entregasCompletadas": 142,
      "entregasPendientes": 14,
      "tasaExito": 91.0,
      "tiempoPromedioEntrega": 2.3,
      "valorTotalEntregas": 485750.00
    },
    "graficos": {
      "entregasPorDia": [
        { "fecha": "2025-01-10", "entregas": 12, "completadas": 11 },
        { "fecha": "2025-01-11", "entregas": 8, "completadas": 8 },
        { "fecha": "2025-01-12", "entregas": 15, "completadas": 13 }
      ],
      "estadosDistribucion": [
        { "estado": "ENTREGADO", "cantidad": 142, "porcentaje": 91.0 },
        { "estado": "EN_TRANSITO", "cantidad": 8, "porcentaje": 5.1 },
        { "estado": "PENDIENTE", "cantidad": 6, "porcentaje": 3.9 }
      ],
      "topClientes": [
        { "cliente": "Empresa ABC", "entregas": 25, "valor": 125000.00 },
        { "cliente": "Corporación XYZ", "entregas": 18, "valor": 89500.00 }
      ]
    },
    "alertas": [
      {
        "tipo": "RETRASO",
        "mensaje": "5 entregas con retraso mayor a 24 horas",
        "prioridad": "alta",
        "entregasAfectadas": ["ENT-2025-045", "ENT-2025-067"]
      }
    ]
  }
}
```

### POST /api/reportes/generar

**Descripción:** Generar reporte personalizado

**Request:**
```json
{
  "tipo": "entregas_detallado",
  "parametros": {
    "fechaDesde": "2025-01-01",
    "fechaHasta": "2025-01-31",
    "estados": ["ENTREGADO", "EN_TRANSITO"],
    "clientes": ["cliente-456"],
    "incluirItems": true,
    "incluirTrazabilidad": false
  },
  "formato": "pdf",
  "configuracion": {
    "titulo": "Reporte de Entregas - Enero 2025",
    "incluirGraficos": true,
    "incluirResumen": true
  }
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "reporteId": "reporte-789",
    "estado": "PROCESANDO",
    "estimadoCompletado": "2025-01-16T12:05:00Z",
    "urlEstado": "/api/reportes/reporte-789/estado"
  },
  "message": "Reporte en proceso de generación"
}
```

### GET /api/reportes/[reporteId]/estado

**Descripción:** Verificar estado de generación de reporte

**Response (200):**
```json
{
  "success": true,
  "data": {
    "reporteId": "reporte-789",
    "estado": "COMPLETADO",
    "progreso": 100,
    "fechaCreacion": "2025-01-16T12:00:00Z",
    "fechaCompletado": "2025-01-16T12:03:45Z",
    "archivo": {
      "nombre": "reporte-entregas-enero-2025.pdf",
      "tamaño": 1024000,
      "urlDescarga": "/api/reportes/reporte-789/descargar"
    }
  }
}
```

### GET /api/reportes/[reporteId]/descargar

**Descripción:** Descargar reporte generado

**Response (200):**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="reporte-entregas-enero-2025.pdf"
Content-Length: 1024000

[Binary PDF content]
```

---

## 👥 API de Clientes

### GET /api/clientes

**Descripción:** Obtener lista de clientes

**Query Parameters:**
- `search` (string): Búsqueda por nombre/email
- `activo` (boolean): Filtrar por estado activo
- `page` (number): Página
- `limit` (number): Items por página

**Response (200):**
```json
{
  "success": true,
  "data": {
    "clientes": [
      {
        "id": "cliente-456",
        "nombre": "Empresa ABC S.A.C.",
        "email": "contacto@empresaabc.com",
        "telefono": "+51 999 888 777",
        "direccion": "Av. Principal 123, Lima",
        "activo": true,
        "fechaRegistro": "2024-12-01T10:00:00Z",
        "estadisticas": {
          "totalEntregas": 25,
          "valorTotal": 125000.00,
          "ultimaEntrega": "2025-01-15T08:30:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

### POST /api/clientes

**Descripción:** Crear nuevo cliente

**Request:**
```json
{
  "nombre": "Nueva Empresa S.A.C.",
  "email": "contacto@nuevaempresa.com",
  "telefono": "+51 888 777 666",
  "direccion": "Calle Secundaria 456, Lima",
  "contactoPrincipal": "Roberto Silva",
  "observaciones": "Cliente corporativo con descuentos especiales"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "cliente-789",
    "nombre": "Nueva Empresa S.A.C.",
    "email": "contacto@nuevaempresa.com",
    "activo": true,
    "fechaRegistro": "2025-01-16T14:30:00Z"
  },
  "message": "Cliente creado exitosamente"
}
```

---

## 🛍️ API de Productos

### GET /api/productos

**Descripción:** Obtener catálogo de productos

**Query Parameters:**
- `categoria` (string): Filtrar por categoría
- `activo` (boolean): Filtrar por estado activo
- `search` (string): Búsqueda por nombre/código
- `precioMin` (number): Precio mínimo
- `precioMax` (number): Precio máximo

**Response (200):**
```json
{
  "success": true,
  "data": {
    "productos": [
      {
        "id": "producto-101",
        "nombre": "Laptop Dell Inspiron",
        "codigo": "DELL-INS-001",
        "categoria": "Electrónicos",
        "precio": 2500.00,
        "descripcion": "Laptop para uso profesional",
        "especificaciones": {
          "peso": 2.5,
          "dimensiones": "35x25x2 cm",
          "garantia": "12 meses"
        },
        "stock": 15,
        "activo": true
      }
    ],
    "categorias": [
      "Electrónicos",
      "Oficina",
      "Mobiliario"
    ]
  }
}
```

---

## 👤 API de Usuarios

### GET /api/usuarios

**Descripción:** Obtener lista de usuarios (solo ADMIN/GERENTE)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "usuarios": [
      {
        "id": "user-123",
        "name": "Juan Pérez",
        "email": "juan.perez@empresa.com",
        "role": "COMERCIAL",
        "activo": true,
        "ultimoAcceso": "2025-01-16T09:30:00Z",
        "fechaCreacion": "2024-11-15T10:00:00Z"
      }
    ]
  }
}
```

---

## 🏥 Health Check

### GET /api/health

**Descripción:** Verificar estado del sistema

**Response (200):**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-16T15:30:00Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 86400,
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "storage": "healthy"
  }
}
```

---

## 🚨 Códigos de Error

### Códigos HTTP Estándar

| Código | Descripción | Uso |
|--------|-------------|-----|
| **200** | OK | Operación exitosa |
| **201** | Created | Recurso creado exitosamente |
| **400** | Bad Request | Datos de entrada inválidos |
| **401** | Unauthorized | Token de autenticación requerido |
| **403** | Forbidden | Sin permisos para la operación |
| **404** | Not Found | Recurso no encontrado |
| **409** | Conflict | Conflicto con estado actual |
| **422** | Unprocessable Entity | Error de validación |
| **429** | Too Many Requests | Rate limit excedido |
| **500** | Internal Server Error | Error interno del servidor |
| **503** | Service Unavailable | Servicio temporalmente no disponible |

### Estructura de Errores

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mensaje descriptivo del error",
    "details": {
      "field1": ["Error específico del campo"],
      "field2": ["Otro error"]
    },
    "timestamp": "2025-01-16T15:30:00Z",
    "requestId": "req-123456789"
  }
}
```

### Códigos de Error Personalizados

| Código | Descripción |
|--------|-------------|
| `INVALID_CREDENTIALS` | Credenciales incorrectas |
| `TOKEN_EXPIRED` | Token JWT expirado |
| `INSUFFICIENT_PERMISSIONS` | Permisos insuficientes |
| `VALIDATION_ERROR` | Error de validación de datos |
| `RESOURCE_NOT_FOUND` | Recurso no encontrado |
| `DUPLICATE_RESOURCE` | Recurso duplicado |
| `INVALID_STATE` | Estado inválido para la operación |
| `RATE_LIMIT_EXCEEDED` | Límite de requests excedido |
| `DATABASE_ERROR` | Error de base de datos |
| `EXTERNAL_SERVICE_ERROR` | Error en servicio externo |

---

## 🔧 Rate Limiting

### Límites por Endpoint

| Endpoint | Límite | Ventana |
|----------|--------|---------|
| `/api/auth/signin` | 5 requests | 15 minutos |
| `/api/entregas` (GET) | 100 requests | 1 minuto |
| `/api/entregas` (POST) | 20 requests | 1 minuto |
| `/api/reportes/generar` | 5 requests | 5 minutos |
| Otros endpoints | 60 requests | 1 minuto |

### Headers de Rate Limiting

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642348800
X-RateLimit-Window: 60
```

---

## 📝 Ejemplos de Integración

### JavaScript/TypeScript

```typescript
// Cliente API para Sistema GYS
class GYSApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async signin(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (data.success) {
      this.token = data.data.token;
      return data.data;
    } else {
      throw new Error(data.error.message);
    }
  }

  async getEntregas(params: {
    page?: number;
    limit?: number;
    estado?: string;
    search?: string;
  } = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(
      `${this.baseUrl}/api/entregas?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error.message);
    }
    
    return data.data;
  }

  async crearEntrega(entregaData: {
    numeroEntrega: string;
    fechaEntrega: string;
    clienteId: string;
    items: Array<{
      productoId: string;
      cantidad: number;
      precioUnitario: number;
    }>;
    observaciones?: string;
  }) {
    const response = await fetch(`${this.baseUrl}/api/entregas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(entregaData)
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error.message);
    }
    
    return data.data;
  }

  async actualizarEstadoEntrega(
    entregaId: string, 
    estado: string, 
    observaciones?: string
  ) {
    const response = await fetch(
      `${this.baseUrl}/api/entregas/${entregaId}/estado`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado, observaciones })
      }
    );

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error.message);
    }
    
    return data.data;
  }
}

// Uso del cliente
const client = new GYSApiClient('https://gys.empresa.com');

// Autenticación
try {
  const session = await client.signin('usuario@empresa.com', 'password123');
  console.log('Autenticado:', session.user.name);
  
  // Obtener entregas
  const entregas = await client.getEntregas({
    page: 1,
    limit: 10,
    estado: 'PENDIENTE'
  });
  
  console.log(`Encontradas ${entregas.pagination.total} entregas`);
  
  // Crear nueva entrega
  const nuevaEntrega = await client.crearEntrega({
    numeroEntrega: 'ENT-2025-100',
    fechaEntrega: '2025-01-25T14:00:00Z',
    clienteId: 'cliente-456',
    items: [
      {
        productoId: 'producto-101',
        cantidad: 2,
        precioUnitario: 2500.00
      }
    ],
    observaciones: 'Entrega prioritaria'
  });
  
  console.log('Entrega creada:', nuevaEntrega.id);
  
} catch (error) {
  console.error('Error:', error.message);
}
```

### Python

```python
import requests
from typing import Dict, List, Optional

class GYSApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token = None
        self.session = requests.Session()
    
    def signin(self, email: str, password: str) -> Dict:
        response = self.session.post(
            f"{self.base_url}/api/auth/signin",
            json={"email": email, "password": password}
        )
        
        data = response.json()
        
        if data["success"]:
            self.token = data["data"]["token"]
            self.session.headers.update({
                "Authorization": f"Bearer {self.token}"
            })
            return data["data"]
        else:
            raise Exception(data["error"]["message"])
    
    def get_entregas(self, **params) -> Dict:
        response = self.session.get(
            f"{self.base_url}/api/entregas",
            params=params
        )
        
        data = response.json()
        
        if not data["success"]:
            raise Exception(data["error"]["message"])
        
        return data["data"]
    
    def crear_entrega(self, entrega_data: Dict) -> Dict:
        response = self.session.post(
            f"{self.base_url}/api/entregas",
            json=entrega_data
        )
        
        data = response.json()
        
        if not data["success"]:
            raise Exception(data["error"]["message"])
        
        return data["data"]

# Uso del cliente
client = GYSApiClient("https://gys.empresa.com")

try:
    # Autenticación
    session = client.signin("usuario@empresa.com", "password123")
    print(f"Autenticado: {session['user']['name']}")
    
    # Obtener entregas
    entregas = client.get_entregas(page=1, limit=10, estado="PENDIENTE")
    print(f"Encontradas {entregas['pagination']['total']} entregas")
    
    # Crear nueva entrega
    nueva_entrega = client.crear_entrega({
        "numeroEntrega": "ENT-2025-101",
        "fechaEntrega": "2025-01-25T14:00:00Z",
        "clienteId": "cliente-456",
        "items": [
            {
                "productoId": "producto-101",
                "cantidad": 3,
                "precioUnitario": 2500.00
            }
        ],
        "observaciones": "Entrega urgente"
    })
    
    print(f"Entrega creada: {nueva_entrega['id']}")
    
except Exception as e:
    print(f"Error: {e}")
```

---

## 📋 OpenAPI Specification

```yaml
openapi: 3.0.3
info:
  title: Sistema GYS API
  description: API REST para el Sistema de Gestión y Servicios
  version: 1.0.0
  contact:
    name: Equipo de Desarrollo
    email: dev@empresa.com
  license:
    name: Propietario
    
servers:
  - url: https://gys.empresa.com/api
    description: Servidor de Producción
  - url: https://staging-gys.empresa.com/api
    description: Servidor de Staging
  - url: http://localhost:3000/api
    description: Servidor de Desarrollo

security:
  - BearerAuth: []

paths:
  /auth/signin:
    post:
      tags:
        - Autenticación
      summary: Iniciar sesión
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                password:
                  type: string
                  minLength: 6
      responses:
        '200':
          description: Autenticación exitosa
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
        '401':
          description: Credenciales inválidas
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
  
  /entregas:
    get:
      tags:
        - Entregas
      summary: Obtener lista de entregas
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 10
        - name: estado
          in: query
          schema:
            $ref: '#/components/schemas/EstadoEntrega'
      responses:
        '200':
          description: Lista de entregas
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EntregasResponse'
    
    post:
      tags:
        - Entregas
      summary: Crear nueva entrega
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CrearEntregaRequest'
      responses:
        '201':
          description: Entrega creada exitosamente
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EntregaResponse'

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  
  schemas:
    EstadoEntrega:
      type: string
      enum:
        - PENDIENTE
        - EN_PREPARACION
        - EN_TRANSITO
        - ENTREGADO
        - CANCELADO
    
    Usuario:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
          format: email
        role:
          type: string
          enum: [ADMIN, GERENTE, COMERCIAL, LOGISTICA, PROYECTOS, COLABORADOR]
    
    Cliente:
      type: object
      properties:
        id:
          type: string
        nombre:
          type: string
        email:
          type: string
          format: email
        telefono:
          type: string
        direccion:
          type: string
    
    Producto:
      type: object
      properties:
        id:
          type: string
        nombre:
          type: string
        codigo:
          type: string
        categoria:
          type: string
        precio:
          type: number
          format: float
    
    ItemEntrega:
      type: object
      properties:
        id:
          type: string
        productoId:
          type: string
        producto:
          $ref: '#/components/schemas/Producto'
        cantidad:
          type: integer
          minimum: 1
        precioUnitario:
          type: number
          format: float
        subtotal:
          type: number
          format: float
        estado:
          $ref: '#/components/schemas/EstadoEntrega'
    
    Entrega:
      type: object
      properties:
        id:
          type: string
        numeroEntrega:
          type: string
        estado:
          $ref: '#/components/schemas/EstadoEntrega'
        fechaEntrega:
          type: string
          format: date-time
        clienteId:
          type: string
        cliente:
          $ref: '#/components/schemas/Cliente'
        items:
          type: array
          items:
            $ref: '#/components/schemas/ItemEntrega'
        total:
          type: number
          format: float
        observaciones:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    
    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
        hasNext:
          type: boolean
        hasPrev:
          type: boolean
    
    AuthResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            token:
              type: string
            user:
              $ref: '#/components/schemas/Usuario'
            expires:
              type: string
              format: date-time
    
    EntregasResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          type: object
          properties:
            entregas:
              type: array
              items:
                $ref: '#/components/schemas/Entrega'
            pagination:
              $ref: '#/components/schemas/Pagination'
    
    EntregaResponse:
      type: object
      properties:
        success:
          type: boolean
        data:
          $ref: '#/components/schemas/Entrega'
        message:
          type: string
    
    CrearEntregaRequest:
      type: object
      required:
        - numeroEntrega
        - fechaEntrega
        - clienteId
        - items
      properties:
        numeroEntrega:
          type: string
        fechaEntrega:
          type: string
          format: date-time
        clienteId:
          type: string
        items:
          type: array
          items:
            type: object
            required:
              - productoId
              - cantidad
              - precioUnitario
            properties:
              productoId:
                type: string
              cantidad:
                type: integer
                minimum: 1
              precioUnitario:
                type: number
                format: float
        observaciones:
          type: string
    
    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
            timestamp:
              type: string
              format: date-time
            requestId:
              type: string
```

---

## 🔄 Webhooks

### Configuración de Webhooks

El sistema GYS puede enviar notificaciones en tiempo real a sistemas externos mediante webhooks cuando ocurren eventos importantes.

#### Eventos Disponibles

- `entrega.creada` - Nueva entrega creada
- `entrega.estado_cambiado` - Estado de entrega actualizado
- `entrega.completada` - Entrega marcada como completada
- `item.estado_cambiado` - Estado de item actualizado
- `reporte.generado` - Nuevo reporte disponible

#### Estructura del Payload

```json
{
  "event": "entrega.estado_cambiado",
  "timestamp": "2025-01-16T15:30:00Z",
  "data": {
    "entregaId": "entrega-123",
    "estadoAnterior": "PENDIENTE",
    "estadoNuevo": "EN_TRANSITO",
    "usuario": {
      "id": "user-456",
      "name": "María García"
    }
  },
  "signature": "sha256=abc123..."
}
```

---

## 📚 SDKs y Librerías

### SDK Oficial JavaScript/TypeScript

```bash
npm install @gys/api-client
```

```typescript
import { GYSClient } from '@gys/api-client';

const client = new GYSClient({
  baseUrl: 'https://gys.empresa.com/api',
  apiKey: 'your-api-key'
});

// Uso con async/await
const entregas = await client.entregas.list({ estado: 'PENDIENTE' });
```

### SDK Python

```bash
pip install gys-api-client
```

```python
from gys_client import GYSClient

client = GYSClient(
    base_url='https://gys.empresa.com/api',
    api_key='your-api-key'
)

entregas = client.entregas.list(estado='PENDIENTE')
```

---

## 🔍 Testing y Debugging

### Postman Collection

Descarga la colección de Postman con todos los endpoints:
[GYS API Collection](https://gys.empresa.com/docs/postman-collection.json)

### Curl Examples

```bash
# Autenticación
curl -X POST https://gys.empresa.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@empresa.com","password":"password123"}'

# Obtener entregas
curl -X GET "https://gys.empresa.com/api/entregas?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Crear entrega
curl -X POST https://gys.empresa.com/api/entregas \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "numeroEntrega": "ENT-2025-100",
    "fechaEntrega": "2025-01-25T14:00:00Z",
    "clienteId": "cliente-456",
    "items": [{
      "productoId": "producto-101",
      "cantidad": 2,
      "precioUnitario": 2500.00
    }]
  }'
```

---

## 📈 Monitoreo y Métricas

### Métricas Disponibles

- **Latencia promedio por endpoint**
- **Tasa de errores (4xx/5xx)**
- **Throughput (requests/segundo)**
- **Tiempo de respuesta P95/P99**
- **Rate limiting hits**
- **Autenticaciones exitosas/fallidas**

### Dashboards

- **Grafana Dashboard:** https://monitoring.empresa.com/gys-api
- **Health Status:** https://status.empresa.com/gys

---

## 🚀 Roadmap de la API

### Versión 1.1 (Q2 2025)
- GraphQL endpoint
- Subscripciones en tiempo real
- Bulk operations mejoradas
- Filtros avanzados

### Versión 1.2 (Q3 2025)
- API de notificaciones push
- Integración con sistemas ERP
- Analytics avanzados
- Machine Learning insights

---

## 📞 Soporte y Contacto

### Canales de Soporte

- **Documentación:** https://docs.gys.empresa.com
- **Email:** api-support@empresa.com
- **Slack:** #gys-api-support
- **GitHub Issues:** https://github.com/empresa/gys-api/issues

### SLA

- **Disponibilidad:** 99.9% uptime
- **Tiempo de respuesta:** < 200ms P95
- **Soporte:** 24/7 para issues críticos

---

## 📄 Changelog

### v1.0.0 (2025-01-15)
- ✅ Lanzamiento inicial
- ✅ Endpoints de entregas, items, trazabilidad
- ✅ Sistema de autenticación JWT
- ✅ Rate limiting
- ✅ Documentación completa

---

**© 2025 Sistema GYS - Documentación de APIs**  
**Versión:** 1.0.0 | **Última actualización:** Enero 2025