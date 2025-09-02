/**
 * 🏗️ Tipos de Modelos - Generado automáticamente desde Prisma
 * 
 * ⚠️  NO EDITAR MANUALMENTE - Se regenera automáticamente
 * 
 * Generado: 2025-08-31T23:52:07.243Z
 */

// ✅ User
export interface User {
  id: string;
  name?: string;
  email: string;
  emailVerified?: Date;
  password: string;
  role: Role;
  image?: string;
  accounts: Account[];
  cotizaciones: Cotizacion[];
  listaEquipos: ListaEquipo[];
  listaEquipoItems: ListaEquipoItem[];
  pedidoEquipos: PedidoEquipo[];
  pedidoEquipoItems: PedidoEquipoItem[];
  ProyectoEquipos: ProyectoEquipo[];
  ProyectoServicios: ProyectoServicio[];
  registrosHoras: RegistroHoras[];
  sessions: Session[];
  // 🚚 Logística Relations removidas
  // ordenesCompraCreadas, ordenesCompraAprobadas, recepcionesResponsable, recepcionesInspector, pagosAprobados removidos
}

// ✅ Cliente
export interface Cliente {
  id: string;
  nombre: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  createdAt: Date;
  updatedAt: Date;
  cotizaciones: Cotizacion[];
  proyectos: Proyecto[];
}

// ✅ Proveedor
export interface Proveedor {
  id: string;
  nombre: string;
  ruc?: string;
  createdAt: Date;
  updatedAt: Date;
  cotizaciones: CotizacionProveedor[];
  listas: ListaEquipoItem[];
  // ordenesCompra removido
}

// OrdenCompra interface removida

// Recepcion interface removida

// Pago interface removida

