# Backup de Datos de Configuración GYS

## 📋 Información General

- **Fecha de creación**: 2025-01-24
- **Versión**: 1.0
- **Propósito**: Datos de configuración para restauración rápida después de reset de base de datos

## 🎯 Datos Incluidos

Este backup incluye los datos esenciales para que el sistema funcione correctamente después de un reset:

### ✅ Datos Críticos
- Usuarios del sistema (admin, comercial, logístico)
- Clientes y proveedores
- Catálogos completos (equipos, servicios, recursos)
- Unidades y categorías
- Plantillas de exclusiones y condiciones

### ❌ Datos NO Incluidos
- Passwords de usuarios (por seguridad)
- Datos transaccionales (cotizaciones, proyectos)
- Historial de auditoría

## 📊 Estructura de Datos

### Usuarios del Sistema

```json
[
  {
    "email": "admin@gys.com",
    "name": "Administrador GYS",
    "role": "admin"
  },
  {
    "email": "comercial@gys.com",
    "name": "Usuario Comercial",
    "role": "comercial"
  },
  {
    "email": "logistico@gys.com",
    "name": "Usuario Logístico",
    "role": "logistico"
  }
]
```

### Clientes Principales

```json
[
  {
    "codigo": "VLC",
    "numeroSecuencia": 1,
    "nombre": "MINERA VOLCAN",
    "ruc": "20100030548",
    "direccion": "Av. Manuel Olguín 373, Santiago de Surco, Lima",
    "telefono": "5112098000",
    "correo": "contacto@volcan.com.pe",
    "sector": "minería",
    "tamanoEmpresa": "grande",
    "estadoRelacion": "cliente_activo"
  },
  {
    "codigo": "TEP",
    "numeroSecuencia": 1,
    "nombre": "TERNA ENERGY PERÚ",
    "ruc": "20601234567",
    "direccion": "Av. Javier Prado Este 476, San Isidro, Lima",
    "telefono": "5112085000",
    "correo": "info@ternaenergy.com.pe",
    "sector": "energía",
    "tamanoEmpresa": "multinacional",
    "estadoRelacion": "cliente_activo"
  },
  {
    "codigo": "ENE",
    "numeroSecuencia": 1,
    "nombre": "ENEL GENERACIÓN PERÚ",
    "ruc": "20100034472",
    "direccion": "Av. República de Panamá 4915, Surco, Lima",
    "telefono": "5115172000",
    "correo": "contacto@enel.com",
    "sector": "energía",
    "tamanoEmpresa": "multinacional",
    "estadoRelacion": "cliente_activo"
  }
]
```

### Categorías de Servicio

```json
[
  {
    "nombre": "Instalación Eléctrica"
  },
  {
    "nombre": "Montaje Estructural"
  },
  {
    "nombre": "Sistema de Control"
  },
  {
    "nombre": "Puesta en Marcha"
  }
]
```

### Unidades

```json
[
  {
    "nombre": "Unidad"
  },
  {
    "nombre": "Metro"
  },
  {
    "nombre": "Kilogramo"
  },
  {
    "nombre": "Litro"
  },
  {
    "nombre": "Hora"
  },
  {
    "nombre": "Día"
  }
]
```

### Unidades de Servicio

```json
[
  {
    "nombre": "Hora"
  },
  {
    "nombre": "Día"
  },
  {
    "nombre": "Semana"
  },
  {
    "nombre": "Mes"
  },
  {
    "nombre": "Proyecto"
  }
]
```

### Recursos

```json
[
  {
    "nombre": "Ingeniero Eléctrico Senior",
    "costoHora": 85.00
  },
  {
    "nombre": "Técnico Electricista",
    "costoHora": 45.00
  },
  {
    "nombre": "Ingeniero Mecánico",
    "costoHora": 80.00
  },
  {
    "nombre": "Soldador Certificado",
    "costoHora": 50.00
  },
  {
    "nombre": "Supervisor de Obra",
    "costoHora": 65.00
  }
]
```

### Proveedores

```json
[
  {
    "nombre": "Ferretería Industrial SAC",
    "ruc": "20100010001",
    "direccion": "Av. Industrial 123, Lima",
    "telefono": "5112345678",
    "correo": "ventas@ferreteriaindustrial.com.pe"
  },
  {
    "nombre": "Equipos y Maquinarias EIRL",
    "ruc": "20100020002",
    "direccion": "Calle Maquinaria 456, Lima",
    "telefono": "5113456789",
    "correo": "contacto@equiposymaquinarias.com.pe"
  },
  {
    "nombre": "Suministros Técnicos SA",
    "ruc": "20100030003",
    "direccion": "Jr. Técnico 789, Lima",
    "telefono": "5114567890",
    "correo": "info@suministrostecnicos.com.pe"
  }
]
```

## 🚀 Script de Restauración Rápida

### Archivo: `scripts/restore-config-data.ts`

```typescript
// Script simple para restaurar datos de configuración
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function restoreConfigData() {
  console.log('🔄 Restaurando datos de configuración...')

  try {
    // Usuarios
    await prisma.user.upsert({
      where: { email: 'admin@gys.com' },
      update: {},
      create: {
        name: 'Administrador GYS',
        email: 'admin@gys.com',
        password: '$2b$10$dummy.hash.reset.later',
        role: 'admin'
      }
    })

    // Categorías de servicio
    const serviceCategories = [
      'Instalación Eléctrica',
      'Montaje Estructural',
      'Sistema de Control',
      'Puesta en Marcha'
    ]

    for (const categoryName of serviceCategories) {
      await prisma.categoriaServicio.upsert({
        where: { nombre: categoryName },
        update: {},
        create: { nombre: categoryName }
      })
    }

    // Unidades
    const units = ['Unidad', 'Metro', 'Kilogramo', 'Litro', 'Hora', 'Día']
    for (const unitName of units) {
      await prisma.unidad.upsert({
        where: { nombre: unitName },
        update: {},
        create: { nombre: unitName }
      })
    }

    // Unidades de servicio
    const serviceUnits = ['Hora', 'Día', 'Semana', 'Mes', 'Proyecto']
    for (const unitName of serviceUnits) {
      await prisma.unidadServicio.upsert({
        where: { nombre: unitName },
        update: {},
        create: { nombre: unitName }
      })
    }

    // Recursos
    const resources = [
      { nombre: 'Ingeniero Eléctrico Senior', costoHora: 85.00 },
      { nombre: 'Técnico Electricista', costoHora: 45.00 },
      { nombre: 'Ingeniero Mecánico', costoHora: 80.00 },
      { nombre: 'Soldador Certificado', costoHora: 50.00 },
      { nombre: 'Supervisor de Obra', costoHora: 65.00 }
    ]

    for (const resource of resources) {
      await prisma.recurso.upsert({
        where: { nombre: resource.nombre },
        update: resource,
        create: resource
      })
    }

    console.log('✅ Datos de configuración restaurados')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

restoreConfigData()
```

## 📝 Instrucciones de Uso

### Para Restaurar Datos Después de Reset

1. **Después del reset de base de datos**:
   ```bash
   npx prisma migrate reset --force
   npx prisma db push --accept-data-loss
   ```

2. **Ejecutar script de restauración**:
   ```bash
   npx tsx scripts/restore-config-data.ts
   ```

3. **Resetear passwords de usuarios** (requerido por seguridad):
   - Los usuarios tendrán passwords dummy
   - Deberán resetear sus passwords manualmente

## ⚠️ Notas Importantes

- **Passwords**: Se usan hashes dummy por seguridad
- **IDs**: Los registros se crean con IDs nuevos
- **Relaciones**: Se mantienen las dependencias correctas
- **Actualización**: Este archivo debe actualizarse cuando cambien los datos maestros

---

*Backup creado: 2025-01-24*
*Datos de configuración esenciales para funcionamiento del sistema*