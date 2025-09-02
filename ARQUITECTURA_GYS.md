# 🏗️ Arquitectura GYS - Servicios vs APIs

## 📋 Resumen

En el Sistema GYS utilizamos una **arquitectura híbrida** donde los **servicios** manejan la lógica de negocio con **Prisma ORM** directamente, mientras que las **APIs** actúan como endpoints REST que consumen estos servicios.

## 🎯 ¿Por qué Servicios con Prisma?

### ✅ Ventajas de esta Arquitectura

1. **Separación de Responsabilidades**
   - **Servicios**: Lógica de negocio, validaciones, transacciones
   - **APIs**: Autenticación, autorización, serialización HTTP

2. **Reutilización de Código**
   - Los servicios pueden ser consumidos por APIs, jobs, webhooks, etc.
   - Evita duplicación de lógica de negocio

3. **Transacciones Complejas**
   - Prisma permite transacciones atómicas con `$transaction`
   - Control granular sobre operaciones de base de datos

4. **Performance**
   - Acceso directo a la base de datos sin overhead HTTP
   - Queries optimizadas con Prisma

5. **Type Safety**
   - TypeScript end-to-end desde DB hasta UI
   - Validación en tiempo de compilación

## 🔄 Flujo de Datos GYS

```
UI Component → API Route → Service → Prisma → PostgreSQL
     ↑                                              ↓
     ←── JSON Response ←── Business Logic ←── Raw Data
```

### Ejemplo Práctico: Crear Pago

```typescript
// 1. API Route (/app/api/pagos/route.ts)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const data = await request.json()
  const validatedData = createPagoSchema.parse(data) // Zod validation
  
  const pago = await PagoService.createPago(validatedData) // Service call
  return NextResponse.json(pago)
}

// 2. Service (/lib/services/pago.ts)
export class PagoService {
  static async createPago(data: PagoCreateInput): Promise<PagoWithRelations> {
    return await prisma.$transaction(async (tx) => {
      // Business logic, validations, related operations
      const nuevoPago = await tx.pago.create({
        data: {
          monto: new Prisma.Decimal(data.monto), // Type conversion
          // ... other fields
        }
      })
      
      // Additional business logic (events, notifications, etc.)
      await this.actualizarEstadoOrden(tx, data.ordenCompraId)
      
      return nuevoPago
    })
  }
}
```

## 🔧 Manejo de Tipos Prisma.Decimal

### Problema Original
```typescript
// ❌ Error: 'Prisma' cannot be used as a value
import type { Prisma } from '@prisma/client'
montoTotalPEN: new Prisma.Decimal(montoTotalPEN) // Error!
```

### Solución Correcta
```typescript
// ✅ Import correcto
import { Prisma } from '@prisma/client' // Sin 'type'
import type { Pago, EstadoPago } from '@prisma/client' // Solo tipos

// ✅ Interfaces con number (para servicios)
export interface PagoMetrics {
  montoTotalPEN: number // No Prisma.Decimal
  montoTotalUSD: number
}

// ✅ Conversiones en puntos específicos
// Entrada: number → Prisma.Decimal
const pago = await tx.pago.create({
  data: {
    monto: new Prisma.Decimal(data.monto)
  }
})

// Salida: Prisma.Decimal → number
return {
  montoTotalPEN: Number(montoTotalPEN),
  montoTotalUSD: Number(montoTotalUSD)
}
```

## 📐 Principios de Conversión

1. **Input Boundary**: `number` → `Prisma.Decimal` al crear/actualizar
2. **Output Boundary**: `Prisma.Decimal` → `number` al retornar
3. **Internal Processing**: Usar `Prisma.Decimal` para cálculos precisos
4. **Interface Consistency**: Servicios exponen `number`, no `Prisma.Decimal`

## 🎨 Beneficios UX/UI

- **Formularios**: Trabajan con `number` (React Hook Form + Zod)
- **Visualización**: Formateo directo sin conversiones
- **APIs**: JSON serializable automáticamente
- **Cálculos**: Precisión decimal en backend, simplicidad en frontend

## 🚀 Próximos Pasos

1. **Mantener** servicios con Prisma para lógica compleja
2. **Usar** APIs como thin layers para HTTP/auth
3. **Convertir** tipos en boundaries (entrada/salida)
4. **Aplicar** este patrón a todas las entidades GYS

---

**Conclusión**: La arquitectura GYS con servicios + Prisma es la correcta. Los errores de tipos se resuelven con imports y conversiones adecuadas, no cambiando la arquitectura fundamental.