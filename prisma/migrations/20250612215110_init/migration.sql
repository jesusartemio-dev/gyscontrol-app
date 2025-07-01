-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('pendiente', 'revisado_tecnico', 'aprobado_coordinador', 'aprobado_gestor', 'en_lista', 'comprado', 'reemplazado', 'entregado');

-- CreateEnum
CREATE TYPE "EstadoEquipoItem" AS ENUM ('pendiente', 'en_lista', 'reemplazado', 'descartado');

-- CreateEnum
CREATE TYPE "EstadoListaItem" AS ENUM ('de_cotizacion', 'nuevo', 'reemplazo');

-- CreateEnum
CREATE TYPE "EstadoListaEquipo" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('borrador', 'enviado', 'atendido', 'parcial', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoPedidoItem" AS ENUM ('pendiente', 'atendido', 'parcial', 'entregado');

-- CreateEnum
CREATE TYPE "EstadoCotizacionProveedor" AS ENUM ('pendiente', 'solicitado', 'cotizado', 'rechazado', 'seleccionado');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('colaborador', 'comercial', 'presupuestos', 'proyectos', 'coordinador', 'logistico', 'gestor', 'gerente', 'admin');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'colaborador',
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnidadServicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnidadServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaEquipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaServicio" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoriaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recurso" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "costoHora" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoEquipo" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "unidadId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "precioInterno" DOUBLE PRECISION NOT NULL,
    "margen" DOUBLE PRECISION NOT NULL,
    "precioVenta" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL,
    "precioReal" DOUBLE PRECISION,
    "fechaActualizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogoServicio" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "unidadServicioId" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "horaBase" DOUBLE PRECISION,
    "horaRepetido" DOUBLE PRECISION,
    "horaUnidad" DOUBLE PRECISION,
    "horaFijo" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plantilla" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "totalEquiposInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEquiposCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plantilla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaEquipo" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaEquipoItem" (
    "id" TEXT NOT NULL,
    "plantillaEquipoId" TEXT NOT NULL,
    "catalogoEquipoId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "precioInterno" DOUBLE PRECISION NOT NULL,
    "precioCliente" DOUBLE PRECISION NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaServicio" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaServicioItem" (
    "id" TEXT NOT NULL,
    "plantillaServicioId" TEXT NOT NULL,
    "catalogoServicioId" TEXT,
    "unidadServicioId" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidadServicioNombre" TEXT NOT NULL,
    "recursoNombre" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "horaBase" DOUBLE PRECISION,
    "horaRepetido" DOUBLE PRECISION,
    "horaUnidad" DOUBLE PRECISION,
    "horaFijo" DOUBLE PRECISION,
    "costoHora" DOUBLE PRECISION NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "horaTotal" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL,
    "margen" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaServicioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaGasto" (
    "id" TEXT NOT NULL,
    "plantillaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlantillaGastoItem" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "margen" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlantillaGastoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cotizacion" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "comercialId" TEXT,
    "plantillaId" TEXT,
    "nombre" TEXT NOT NULL,
    "totalEquiposInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEquiposCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "etapa" TEXT NOT NULL DEFAULT 'nuevo',
    "prioridad" TEXT,
    "probabilidad" INTEGER,
    "fechaEnvio" TIMESTAMP(3),
    "fechaCierreEstimada" TIMESTAMP(3),
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cotizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionEquipo" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionEquipoItem" (
    "id" TEXT NOT NULL,
    "cotizacionEquipoId" TEXT NOT NULL,
    "catalogoEquipoId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "precioInterno" DOUBLE PRECISION NOT NULL,
    "precioCliente" DOUBLE PRECISION NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionServicio" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionServicioItem" (
    "id" TEXT NOT NULL,
    "cotizacionServicioId" TEXT NOT NULL,
    "catalogoServicioId" TEXT,
    "unidadServicioId" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "unidadServicioNombre" TEXT NOT NULL,
    "recursoNombre" TEXT NOT NULL,
    "formula" TEXT NOT NULL,
    "horaBase" DOUBLE PRECISION,
    "horaRepetido" DOUBLE PRECISION,
    "horaUnidad" DOUBLE PRECISION,
    "horaFijo" DOUBLE PRECISION,
    "costoHora" DOUBLE PRECISION NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "horaTotal" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL,
    "margen" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionServicioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionGasto" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionGastoItem" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "margen" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionGastoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proyecto" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "comercialId" TEXT NOT NULL,
    "gestorId" TEXT NOT NULL,
    "cotizacionId" TEXT,
    "nombre" TEXT NOT NULL,
    "totalEquiposInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalServiciosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastosInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInterno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCliente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "codigo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "totalRealEquipos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRealServicios" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRealGastos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoEquipo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoEquipoItem" (
    "id" TEXT NOT NULL,
    "proyectoEquipoId" TEXT NOT NULL,
    "catalogoEquipoId" TEXT,
    "listaId" TEXT,
    "equipoOriginalId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'SIN-CATEGORIA',
    "unidad" TEXT NOT NULL,
    "marca" TEXT NOT NULL DEFAULT 'SIN-MARCA',
    "precioInterno" DOUBLE PRECISION NOT NULL,
    "precioCliente" DOUBLE PRECISION NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "precioReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantidadReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiempoEntrega" INTEGER,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "estado" "EstadoEquipoItem" NOT NULL DEFAULT 'pendiente',
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "motivoCambio" TEXT,
    "nuevo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoServicio" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoServicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoServicioItem" (
    "id" TEXT NOT NULL,
    "proyectoServicioId" TEXT NOT NULL,
    "catalogoServicioId" TEXT,
    "categoria" TEXT NOT NULL,
    "costoHoraInterno" DOUBLE PRECISION NOT NULL,
    "costoHoraCliente" DOUBLE PRECISION NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidadHoras" INTEGER NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasEjecutadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "motivoCambio" TEXT,
    "nuevo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoServicioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoGasto" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "subtotalReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProyectoGastoItem" (
    "id" TEXT NOT NULL,
    "gastoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "factorSeguridad" DOUBLE PRECISION NOT NULL,
    "margen" DOUBLE PRECISION NOT NULL,
    "costoInterno" DOUBLE PRECISION NOT NULL,
    "costoCliente" DOUBLE PRECISION NOT NULL,
    "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProyectoGastoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaEquipo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "estado" "EstadoListaEquipo" NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListaEquipoItem" (
    "id" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "proyectoEquipoId" TEXT,
    "proyectoEquipoItemId" TEXT,
    "proveedorId" TEXT,
    "cotizacionSeleccionadaId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "comentarioRevision" TEXT,
    "presupuesto" DOUBLE PRECISION,
    "precioElegido" DOUBLE PRECISION,
    "costoElegido" DOUBLE PRECISION,
    "costoPedido" DOUBLE PRECISION DEFAULT 0,
    "costoReal" DOUBLE PRECISION DEFAULT 0,
    "cantidadPedida" DOUBLE PRECISION DEFAULT 0,
    "cantidadEntregada" DOUBLE PRECISION DEFAULT 0,
    "estado" "EstadoListaItem" NOT NULL DEFAULT 'de_cotizacion',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListaEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionProveedor" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCotizacionProveedor" NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "CotizacionProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionProveedorItem" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "listaEquipoItemId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidadOriginal" DOUBLE PRECISION NOT NULL,
    "presupuesto" DOUBLE PRECISION,
    "precioUnitario" DOUBLE PRECISION,
    "cantidad" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "tiempoEntrega" TEXT,
    "tiempoEntregaDias" INTEGER,
    "estado" "EstadoCotizacionProveedor" NOT NULL DEFAULT 'pendiente',
    "esSeleccionada" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionProveedorItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEquipo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "listaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'borrador',
    "fechaPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEquipoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "listaEquipoItemId" TEXT NOT NULL,
    "cantidadPedida" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "fechaNecesaria" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoPedidoItem" NOT NULL DEFAULT 'pendiente',
    "cantidadAtendida" DOUBLE PRECISION,
    "comentarioLogistica" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Valorizacion" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Valorizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroHoras" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "proyectoServicioId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "nombreServicio" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "recursoNombre" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "fechaTrabajo" TIMESTAMP(3) NOT NULL,
    "horasTrabajadas" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "observaciones" TEXT,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroHoras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Unidad_nombre_key" ON "Unidad"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "UnidadServicio_nombre_key" ON "UnidadServicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaEquipo_nombre_key" ON "CategoriaEquipo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaServicio_nombre_key" ON "CategoriaServicio"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Recurso_nombre_key" ON "Recurso"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogoEquipo_codigo_key" ON "CatalogoEquipo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ListaEquipo_codigo_key" ON "ListaEquipo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ListaEquipoItem_cotizacionSeleccionadaId_key" ON "ListaEquipoItem"("cotizacionSeleccionadaId");

-- CreateIndex
CREATE UNIQUE INDEX "CotizacionProveedor_codigo_key" ON "CotizacionProveedor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoEquipo_codigo_key" ON "PedidoEquipo"("codigo");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoEquipo" ADD CONSTRAINT "CatalogoEquipo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaEquipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoEquipo" ADD CONSTRAINT "CatalogoEquipo_unidadId_fkey" FOREIGN KEY ("unidadId") REFERENCES "Unidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoServicio" ADD CONSTRAINT "CatalogoServicio_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoServicio" ADD CONSTRAINT "CatalogoServicio_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogoServicio" ADD CONSTRAINT "CatalogoServicio_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaEquipo" ADD CONSTRAINT "PlantillaEquipo_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaEquipoItem" ADD CONSTRAINT "PlantillaEquipoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaEquipoItem" ADD CONSTRAINT "PlantillaEquipoItem_plantillaEquipoId_fkey" FOREIGN KEY ("plantillaEquipoId") REFERENCES "PlantillaEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicio" ADD CONSTRAINT "PlantillaServicio_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_plantillaServicioId_fkey" FOREIGN KEY ("plantillaServicioId") REFERENCES "PlantillaServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaServicioItem" ADD CONSTRAINT "PlantillaServicioItem_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaGasto" ADD CONSTRAINT "PlantillaGasto_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlantillaGastoItem" ADD CONSTRAINT "PlantillaGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "PlantillaGasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cotizacion" ADD CONSTRAINT "Cotizacion_plantillaId_fkey" FOREIGN KEY ("plantillaId") REFERENCES "Plantilla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionEquipo" ADD CONSTRAINT "CotizacionEquipo_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionEquipoItem" ADD CONSTRAINT "CotizacionEquipoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionEquipoItem" ADD CONSTRAINT "CotizacionEquipoItem_cotizacionEquipoId_fkey" FOREIGN KEY ("cotizacionEquipoId") REFERENCES "CotizacionEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicio" ADD CONSTRAINT "CotizacionServicio_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_cotizacionServicioId_fkey" FOREIGN KEY ("cotizacionServicioId") REFERENCES "CotizacionServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionServicioItem" ADD CONSTRAINT "CotizacionServicioItem_unidadServicioId_fkey" FOREIGN KEY ("unidadServicioId") REFERENCES "UnidadServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionGasto" ADD CONSTRAINT "CotizacionGasto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionGastoItem" ADD CONSTRAINT "CotizacionGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "CotizacionGasto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipo" ADD CONSTRAINT "ProyectoEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipo" ADD CONSTRAINT "ProyectoEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_equipoOriginalId_fkey" FOREIGN KEY ("equipoOriginalId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "ProyectoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicio" ADD CONSTRAINT "ProyectoServicio_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicio" ADD CONSTRAINT "ProyectoServicio_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicioItem" ADD CONSTRAINT "ProyectoServicioItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicioItem" ADD CONSTRAINT "ProyectoServicioItem_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGasto" ADD CONSTRAINT "ProyectoGasto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGastoItem" ADD CONSTRAINT "ProyectoGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "ProyectoGasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipo" ADD CONSTRAINT "ListaEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_cotizacionSeleccionadaId_fkey" FOREIGN KEY ("cotizacionSeleccionadaId") REFERENCES "CotizacionProveedorItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "ProyectoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoItemId_fkey" FOREIGN KEY ("proyectoEquipoItemId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "CotizacionProveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valorizacion" ADD CONSTRAINT "Valorizacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
