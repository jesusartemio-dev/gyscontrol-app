# 📋 **ESTÁNDARES DE NOMENCLATURA PARA BASE DE DATOS**

*Guía oficial para mantener consistencia en el esquema de Prisma y PostgreSQL*

## 🎯 **RESUMEN EJECUTIVO**

Esta guía establece las reglas de nomenclatura para el proyecto GYS Control, asegurando consistencia entre Prisma, PostgreSQL y el código TypeScript. La convención híbrida elegida balancea legibilidad, compatibilidad y mantenibilidad.

---

## 🏗️ **CONVENCIÓN HÍBRIDA ADOPTADA**

### **Arquitectura de Nombres**
```
Prisma Model → PostgreSQL Table → TypeScript Types
    ↑               ↑                   ↑
PascalCase    snake_case        camelCase
```

### **Ejemplo Práctico**
```prisma
// Prisma Schema
model UserProfile {
  id        String   @id @default(cuid())
  firstName String
  lastName  String
  email     String   @unique
  createdAt DateTime @default(now())

  @@map("user_profile")  // PostgreSQL table name
}

// PostgreSQL Table
CREATE TABLE user_profile (
  id VARCHAR PRIMARY KEY,
  first_name VARCHAR,
  last_name VARCHAR,
  email VARCHAR UNIQUE,
  created_at TIMESTAMP
);

// TypeScript Usage
interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
}
```

---

## 📏 **REGLAS ESPECÍFICAS**

### **1. Modelos de Prisma (PascalCase)**
```prisma
✅ CORRECTO:
model UserProfile { ... }
model ProjectTask { ... }
model ClientContact { ... }

❌ INCORRECTO:
model user_profile { ... }  // snake_case
model userProfile { ... }   // camelCase
```

### **2. Nombres de Tabla PostgreSQL (snake_case)**
```prisma
✅ CORRECTO:
@@map("user_profile")
@@map("project_task")
@@map("client_contact")

❌ INCORRECTO:
@@map("UserProfile")     // PascalCase
@@map("userProfile")     // camelCase
@@map("user-profile")    // kebab-case
```

### **3. Campos y Relaciones (camelCase)**
```prisma
✅ CORRECTO:
userId: String
firstName: String
lastName: String
createdAt: DateTime
userProfile: UserProfile  // Relaciones

❌ INCORRECTO:
user_id: String      // snake_case
first_name: String   // snake_case
UserId: String       // PascalCase
```

### **4. Enums (PascalCase)**
```prisma
✅ CORRECTO:
enum UserRole {
  admin
  manager
  user
}

enum ProjectStatus {
  active
  completed
  cancelled
}

❌ INCORRECTO:
enum user_role { ... }     // snake_case
enum User_Role { ... }     // snake_case con mayúsculas
```

---

## 🗂️ **PATRONES DE NOMBRECLATURA POR ENTIDAD**

### **Entidades Principales**
| Tipo | Prisma Model | PostgreSQL Table | Ejemplo |
|------|--------------|------------------|---------|
| Usuario | `User` | `user` | `User` → `user` |
| Cliente | `Client` | `client` | `Client` → `client` |
| Proyecto | `Project` | `project` | `Project` → `project` |

### **Entidades Compuestas**
| Tipo | Patrón | Ejemplo Prisma → PostgreSQL |
|------|---------|------------------------------|
| Perfil | `EntityProfile` | `entity_profile` | `UserProfile` → `user_profile` |
| Configuración | `EntityConfig` | `entity_config` | `ProjectConfig` → `project_config` |
| Historial | `EntityHistory` | `entity_history` | `ProjectHistory` → `project_history` |
| Relación | `EntityRelation` | `entity_relation` | `UserPermission` → `user_permission` |

### **Entidades de Sistema**
| Tipo | Patrón | Ejemplo |
|------|---------|---------|
| Logs | `EntityLog` | `AuditLog` → `audit_log` |
| Notificaciones | `EntityNotification` | `Notification` → `notification` |
| Métricas | `EntityMetric` | `UserMetric` → `user_metric` |

---

## 🔗 **REGLAS PARA RELACIONES**

### **Nombres de Relaciones**
```prisma
✅ CORRECTO:
// One-to-Many
user: User @relation(fields: [userId], references: [id])
posts: Post[]

// Many-to-Many
tags: Tag[]
_tagTopost: TagToPost[]  // Tabla intermedia

❌ INCORRECTO:
User: User               // PascalCase
user_posts: Post[]       // snake_case
```

### **Campos de Relación**
```prisma
✅ CORRECTO:
userId: String
projectId: String
clientId: String

❌ INCORRECTO:
user_id: String     // snake_case
UserId: String      // PascalCase
```

---

## 🏷️ **CONVENCIÓN PARA CAMPOS ESPECIALES**

### **Campos de Auditoría**
```prisma
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt
createdBy: String?
updatedBy: String?
```

### **Campos de Estado**
```prisma
status: EntityStatus @default(active)
state: String
isActive: Boolean @default(true)
```

### **Campos de Configuración**
```prisma
config: Json?
settings: Json?
metadata: Json?
```

---

## 📊 **EJEMPLOS COMPLETOS**

### **Modelo Completo**
```prisma
model ProjectTask {
  id          String        @id @default(cuid())
  projectId   String
  title       String
  description String?
  status      TaskStatus    @default(pending)
  priority    TaskPriority  @default(medium)
  assignedTo  String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  // Relations
  project     Project       @relation(fields: [projectId], references: [id])
  assignee    User?         @relation(fields: [assignedTo], references: [id])
  subtasks    ProjectSubtask[]

  @@index([projectId, status])
  @@index([assignedTo, createdAt(sort: Desc)])
  @@map("project_task")
}
```

### **Enum Asociado**
```prisma
enum TaskStatus {
  pending
  in_progress
  completed
  cancelled
}

enum TaskPriority {
  low
  medium
  high
  critical
}
```

---

## ⚠️ **REGLAS DE VALIDACIÓN**

### **Herramientas de Validación**
- **ESLint**: Reglas personalizadas para nombres de modelo
- **Prisma Lint**: Validación de esquema
- **Scripts de CI/CD**: Verificación automática

### **Casos Especiales**
1. **Palabras Reservadas**: Usar sinónimos o prefijos
   ```prisma
   // ❌ Evitar
   model Order { ... }  // 'order' es palabra reservada en SQL

   // ✅ Solución
   model PurchaseOrder { ... }
   @@map("purchase_order")
   ```

2. **Nombres Muy Largos**: Mantener bajo 50 caracteres
   ```prisma
   // ❌ Demasiado largo
   model UserProfileConfigurationSettings { ... }

   // ✅ Conciso
   model UserProfileConfig { ... }
   ```

---

## 🔄 **MIGRACIÓN Y CAMBIOS**

### **Proceso de Cambio de Nombre**
1. **Actualizar Schema**: Cambiar modelo y `@@map`
2. **Generar Migración**: `npx prisma migrate dev`
3. **Actualizar Código**: Buscar y reemplazar referencias
4. **Actualizar Types**: Regenerar tipos TypeScript
5. **Probar**: Validar funcionamiento

### **Comando de Migración**
```bash
# Crear migración
npx prisma migrate dev --name rename_table_name

# Generar cliente
npx prisma generate

# Validar
npx prisma db push --preview-feature
```

---

## 📋 **CHECKLIST DE VALIDACIÓN**

### **Antes de Commit**
- [ ] Nombres de modelo en PascalCase
- [ ] `@@map` en snake_case
- [ ] Campos en camelCase
- [ ] Relaciones nombradas correctamente
- [ ] Índices y constraints válidos
- [ ] Cliente Prisma generado
- [ ] Tests pasan

### **En Code Review**
- [ ] Convenciones seguidas
- [ ] Nombres descriptivos
- [ ] Consistencia con modelos existentes
- [ ] Documentación actualizada

---

## 📚 **REFERENCIAS**

- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL Naming Conventions](https://www.postgresql.org/docs/current/sql-syntax-lexical.html)
- [TypeScript Naming Conventions](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

## 🎯 **CONCLUSIÓN**

Esta convención híbrida proporciona:
- **Legibilidad**: PascalCase para modelos, snake_case para BD
- **Compatibilidad**: Funciona bien con PostgreSQL y Prisma
- **Mantenibilidad**: Fácil de seguir y validar
- **Escalabilidad**: Adecuada para proyectos grandes

**Última actualización**: Octubre 2025
**Versión**: 1.0
**Autor**: Sistema de IA Mejorado