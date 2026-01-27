-- CreateEnum
CREATE TYPE "EstadoEquipo" AS ENUM ('pendiente', 'revisado_tecnico', 'aprobado_coordinador', 'aprobado_gestor', 'en_lista', 'comprado', 'reemplazado', 'entregado');

-- CreateEnum
CREATE TYPE "EstadoEquipoItem" AS ENUM ('pendiente', 'en_lista', 'reemplazado', 'descartado');

-- CreateEnum
CREATE TYPE "EstadoListaItem" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "OrigenListaItem" AS ENUM ('cotizado', 'nuevo', 'reemplazo');

-- CreateEnum
CREATE TYPE "EstadoListaEquipo" AS ENUM ('borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('borrador', 'enviado', 'atendido', 'parcial', 'entregado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoPedidoItem" AS ENUM ('pendiente', 'atendido', 'parcial', 'entregado');

-- CreateEnum
CREATE TYPE "EstadoEntregaItem" AS ENUM ('pendiente', 'en_proceso', 'parcial', 'entregado', 'retrasado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoCotizacionProveedor" AS ENUM ('pendiente', 'solicitado', 'cotizado', 'rechazado', 'seleccionado');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('colaborador', 'comercial', 'presupuestos', 'proyectos', 'coordinador', 'logistico', 'gestor', 'gerente', 'admin');

-- CreateEnum
CREATE TYPE "ProyectoEstado" AS ENUM ('en_planificacion', 'en_ejecucion', 'en_pausa', 'cerrado', 'cancelado');

-- CreateEnum
CREATE TYPE "EstadoEdt" AS ENUM ('planificado', 'en_progreso', 'detenido', 'completado', 'cancelado');

-- CreateEnum
CREATE TYPE "PrioridadEdt" AS ENUM ('baja', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "OrigenTrabajo" AS ENUM ('oficina', 'campo');

-- CreateEnum
CREATE TYPE "EstadoTarea" AS ENUM ('pendiente', 'en_progreso', 'completada', 'pausada', 'cancelada');

-- CreateEnum
CREATE TYPE "PrioridadTarea" AS ENUM ('baja', 'media', 'alta', 'critica');

-- CreateEnum
CREATE TYPE "TipoDependencia" AS ENUM ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish');

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
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER DEFAULT 1,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "calificacion" INTEGER DEFAULT 3,
    "estadoRelacion" TEXT NOT NULL DEFAULT 'prospecto',
    "frecuenciaCompra" TEXT,
    "linkedin" TEXT,
    "potencialAnual" DOUBLE PRECISION,
    "sector" TEXT,
    "sitioWeb" TEXT,
    "tamanoEmpresa" TEXT,
    "ultimoProyecto" TIMESTAMP(3),

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
    "orden" INTEGER DEFAULT 0,

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
    "categoria" TEXT NOT NULL,
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
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
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
    "fechaValidezHasta" TIMESTAMP(3),
    "formaPago" TEXT,
    "incluyeIGV" BOOLEAN DEFAULT false,
    "moneda" TEXT DEFAULT 'USD',
    "referencia" TEXT,
    "revision" TEXT DEFAULT 'R01',
    "validezOferta" INTEGER DEFAULT 15,
    "competencia" TEXT,
    "etapaCrm" TEXT DEFAULT 'nuevo',
    "fechaProximaAccion" TIMESTAMP(3),
    "fechaUltimoContacto" TIMESTAMP(3),
    "posicionVsCompetencia" TEXT,
    "prioridadCrm" TEXT DEFAULT 'media',
    "probabilidadCierre" INTEGER DEFAULT 0,
    "proximaAccion" TEXT,
    "razonCierre" TEXT,
    "retroalimentacionCliente" TEXT,

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
    "plazoEntregaSemanas" INTEGER,

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
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "subtotalInterno" DOUBLE PRECISION NOT NULL,
    "subtotalCliente" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plazoEntregaSemanas" INTEGER,

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
    "orden" INTEGER DEFAULT 0,

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
    "plazoEntregaSemanas" INTEGER,

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
CREATE TABLE "cotizacion_edt" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "cotizacionServicioId" TEXT NOT NULL,
    "categoriaServicioId" TEXT,
    "zona" TEXT,
    "fechaInicioComercial" TIMESTAMP(3),
    "fechaFinComercial" TIMESTAMP(3),
    "horasEstimadas" DECIMAL(10,2) DEFAULT 0,
    "estado" "EstadoEdt" NOT NULL DEFAULT 'planificado',
    "responsableId" TEXT,
    "descripcion" TEXT,
    "prioridad" "PrioridadEdt" NOT NULL DEFAULT 'media',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_edt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_tarea" (
    "id" TEXT NOT NULL,
    "cotizacionEdtId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "horasEstimadas" DECIMAL(10,2),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "prioridad" "PrioridadTarea" NOT NULL DEFAULT 'media',
    "dependenciaId" TEXT,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cotizacionServicioItemId" TEXT,

    CONSTRAINT "cotizacion_tarea_pkey" PRIMARY KEY ("id")
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
    "estado" "ProyectoEstado" NOT NULL DEFAULT 'en_ejecucion',
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
CREATE TABLE "proyecto_edt" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "categoriaServicioId" TEXT NOT NULL,
    "zona" TEXT,
    "fechaInicioPlan" TIMESTAMP(3),
    "fechaFinPlan" TIMESTAMP(3),
    "horasPlan" DECIMAL(10,2) DEFAULT 0,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "horasReales" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estado" "EstadoEdt" NOT NULL DEFAULT 'planificado',
    "responsableId" TEXT,
    "porcentajeAvance" INTEGER NOT NULL DEFAULT 0,
    "descripcion" TEXT,
    "prioridad" "PrioridadEdt" NOT NULL DEFAULT 'media',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proyecto_edt_pkey" PRIMARY KEY ("id")
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
    "responsableId" TEXT NOT NULL,
    "fechaAprobacionFinal" TIMESTAMP(3),
    "fechaAprobacionRevision" TIMESTAMP(3),
    "fechaEnvioLogistica" TIMESTAMP(3),
    "fechaEnvioRevision" TIMESTAMP(3),
    "fechaFinCotizacion" TIMESTAMP(3),
    "fechaInicioCotizacion" TIMESTAMP(3),
    "fechaNecesaria" TIMESTAMP(3),
    "fechaValidacion" TIMESTAMP(3),

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
    "estado" "EstadoListaItem" NOT NULL DEFAULT 'borrador',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "origen" "OrigenListaItem" NOT NULL DEFAULT 'nuevo',
    "reemplazaProyectoEquipoItemId" TEXT,
    "tiempoEntrega" TEXT,
    "tiempoEntregaDias" INTEGER,
    "responsableId" TEXT NOT NULL,

    CONSTRAINT "ListaEquipoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ruc" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCotizacionProveedor" NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "CotizacionProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionProveedorItem" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "listaEquipoItemId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "unidad" TEXT NOT NULL,
    "cantidadOriginal" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION,
    "cantidad" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "tiempoEntrega" TEXT,
    "tiempoEntregaDias" INTEGER,
    "estado" "EstadoCotizacionProveedor" NOT NULL DEFAULT 'pendiente',
    "esSeleccionada" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listaId" TEXT,

    CONSTRAINT "CotizacionProveedorItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEquipo" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "listaId" TEXT,
    "codigo" TEXT NOT NULL,
    "numeroSecuencia" INTEGER NOT NULL,
    "estado" "EstadoPedido" NOT NULL DEFAULT 'borrador',
    "fechaPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "observacion" TEXT,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fechaNecesaria" TIMESTAMP(3) NOT NULL,
    "costoRealTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esUrgente" BOOLEAN NOT NULL DEFAULT false,
    "presupuestoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "prioridad" TEXT DEFAULT 'media',

    CONSTRAINT "PedidoEquipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoEquipoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "listaEquipoItemId" TEXT,
    "cantidadPedida" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION,
    "costoTotal" DOUBLE PRECISION,
    "estado" "EstadoPedidoItem" NOT NULL DEFAULT 'pendiente',
    "cantidadAtendida" DOUBLE PRECISION,
    "comentarioLogistica" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listaId" TEXT,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tiempoEntrega" TEXT,
    "tiempoEntregaDias" INTEGER,
    "unidad" TEXT NOT NULL,
    "fechaOrdenCompraRecomendada" TIMESTAMP(3),
    "responsableId" TEXT NOT NULL,
    "fechaEntregaEstimada" TIMESTAMP(3),
    "fechaEntregaReal" TIMESTAMP(3),
    "estadoEntrega" "EstadoEntregaItem" NOT NULL DEFAULT 'pendiente',
    "observacionesEntrega" TEXT,

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
    "proyectoEdtId" TEXT,
    "categoriaServicioId" TEXT,
    "origen" "OrigenTrabajo",
    "ubicacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistroHoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tareas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "prioridad" "PrioridadTarea" NOT NULL DEFAULT 'media',
    "porcentajeCompletado" INTEGER NOT NULL DEFAULT 0,
    "horasEstimadas" DECIMAL(10,2),
    "horasReales" DECIMAL(10,2) DEFAULT 0,
    "proyectoServicioId" TEXT NOT NULL,
    "responsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtareas" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "fechaInicioReal" TIMESTAMP(3),
    "fechaFinReal" TIMESTAMP(3),
    "estado" "EstadoTarea" NOT NULL DEFAULT 'pendiente',
    "porcentajeCompletado" INTEGER NOT NULL DEFAULT 0,
    "horasEstimadas" DECIMAL(10,2),
    "horasReales" DECIMAL(10,2) DEFAULT 0,
    "tareaId" TEXT NOT NULL,
    "asignadoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subtareas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencias_tarea" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDependencia" NOT NULL DEFAULT 'finish_to_start',
    "tareaOrigenId" TEXT NOT NULL,
    "tareaDependienteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependencias_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_recurso" (
    "id" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "horasAsignadas" DECIMAL(10,2),
    "tareaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asignaciones_recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_progreso" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "horasTrabajadas" DECIMAL(10,2) NOT NULL,
    "descripcion" TEXT,
    "porcentajeCompletado" INTEGER,
    "tareaId" TEXT,
    "subtareaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_progreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_exclusion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_exclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_condicion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "tipo" TEXT,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_condicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_exclusion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_exclusion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_exclusion_item" (
    "id" TEXT NOT NULL,
    "plantillaExclusionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_exclusion_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_condicion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "tipo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_condicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantilla_condicion_item" (
    "id" TEXT NOT NULL,
    "plantillaCondicionId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantilla_condicion_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_oportunidad" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "valorEstimado" DOUBLE PRECISION,
    "probabilidad" INTEGER NOT NULL DEFAULT 0,
    "fechaCierreEstimada" TIMESTAMP(3),
    "fuente" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'prospecto',
    "prioridad" TEXT NOT NULL DEFAULT 'media',
    "comercialId" TEXT,
    "responsableId" TEXT,
    "fechaUltimoContacto" TIMESTAMP(3),
    "notas" TEXT,
    "competencia" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cotizacionId" TEXT,

    CONSTRAINT "crm_oportunidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_actividad" (
    "id" TEXT NOT NULL,
    "oportunidadId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "resultado" TEXT,
    "notas" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_competidor_licitacion" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "nombreEmpresa" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "propuestaEconomica" DOUBLE PRECISION,
    "propuestaTecnica" TEXT,
    "fortalezas" TEXT,
    "debilidades" TEXT,
    "precioVsNuestro" TEXT,
    "resultado" TEXT,
    "razonPerdida" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_competidor_licitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_contacto_cliente" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "celular" TEXT,
    "esDecisionMaker" BOOLEAN NOT NULL DEFAULT false,
    "areasInfluencia" TEXT,
    "relacionComercial" TEXT,
    "fechaUltimoContacto" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_contacto_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_historial_proyecto" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "cotizacionId" TEXT,
    "nombreProyecto" TEXT NOT NULL,
    "tipoProyecto" TEXT NOT NULL,
    "sector" TEXT,
    "complejidad" TEXT,
    "valorContrato" DOUBLE PRECISION,
    "margenObtenido" DOUBLE PRECISION,
    "duracionDias" INTEGER,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "fechaAdjudicacion" TIMESTAMP(3),
    "calificacionCliente" INTEGER,
    "retroalimentacion" TEXT,
    "exitos" TEXT,
    "problemas" TEXT,
    "recomendaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_historial_proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_metrica_comercial" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "cotizacionesGeneradas" INTEGER NOT NULL DEFAULT 0,
    "cotizacionesAprobadas" INTEGER NOT NULL DEFAULT 0,
    "proyectosCerrados" INTEGER NOT NULL DEFAULT 0,
    "valorTotalVendido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "margenTotalObtenido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiempoPromedioCierre" DOUBLE PRECISION,
    "tasaConversion" DOUBLE PRECISION,
    "valorPromedioProyecto" DOUBLE PRECISION,
    "llamadasRealizadas" INTEGER NOT NULL DEFAULT 0,
    "reunionesAgendadas" INTEGER NOT NULL DEFAULT 0,
    "propuestasEnviadas" INTEGER NOT NULL DEFAULT 0,
    "emailsEnviados" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_metrica_comercial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotizacion_version" (
    "id" TEXT NOT NULL,
    "cotizacionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "snapshot" TEXT NOT NULL,
    "cambios" TEXT,
    "motivoCambio" TEXT,
    "usuarioId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cotizacion_version_pkey" PRIMARY KEY ("id")
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
    "motivoCambio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listaEquipoSeleccionadoId" TEXT,

    CONSTRAINT "ProyectoEquipoItem_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "ProyectoServicio" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "Cliente_codigo_key" ON "Cliente"("codigo");

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
CREATE UNIQUE INDEX "Cotizacion_codigo_key" ON "Cotizacion"("codigo");

-- CreateIndex
CREATE INDEX "cotizacion_edt_estado_fechaFinComercial_idx" ON "cotizacion_edt"("estado", "fechaFinComercial");

-- CreateIndex
CREATE INDEX "cotizacion_edt_responsableId_estado_idx" ON "cotizacion_edt"("responsableId", "estado");

-- CreateIndex
CREATE INDEX "cotizacion_edt_cotizacionId_cotizacionServicioId_zona_idx" ON "cotizacion_edt"("cotizacionId", "cotizacionServicioId", "zona");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_edt_cotizacionId_cotizacionServicioId_zona_key" ON "cotizacion_edt"("cotizacionId", "cotizacionServicioId", "zona");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_responsableId_fechaFin_idx" ON "cotizacion_tarea"("responsableId", "fechaFin");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_dependenciaId_idx" ON "cotizacion_tarea"("dependenciaId");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_cotizacionServicioItemId_idx" ON "cotizacion_tarea"("cotizacionServicioItemId");

-- CreateIndex
CREATE INDEX "cotizacion_tarea_cotizacionEdtId_estado_idx" ON "cotizacion_tarea"("cotizacionEdtId", "estado");

-- CreateIndex
CREATE INDEX "idx_proyecto_estado_inicio_fecha" ON "Proyecto"("estado", "fechaInicio", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_proyecto_comercial_estado_inicio" ON "Proyecto"("comercialId", "estado", "fechaInicio");

-- CreateIndex
CREATE INDEX "idx_proyecto_gestor_estado_fin" ON "Proyecto"("gestorId", "estado", "fechaFin");

-- CreateIndex
CREATE INDEX "idx_proyecto_cliente_estado_fecha" ON "Proyecto"("clienteId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "proyecto_edt_estado_fechaFinPlan_idx" ON "proyecto_edt"("estado", "fechaFinPlan");

-- CreateIndex
CREATE INDEX "proyecto_edt_responsableId_estado_idx" ON "proyecto_edt"("responsableId", "estado");

-- CreateIndex
CREATE INDEX "proyecto_edt_proyectoId_categoriaServicioId_zona_idx" ON "proyecto_edt"("proyectoId", "categoriaServicioId", "zona");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_edt_proyectoId_categoriaServicioId_zona_key" ON "proyecto_edt"("proyectoId", "categoriaServicioId", "zona");

-- CreateIndex
CREATE UNIQUE INDEX "ListaEquipo_codigo_key" ON "ListaEquipo"("codigo");

-- CreateIndex
CREATE INDEX "idx_lista_proyecto_estado_fecha" ON "ListaEquipo"("proyectoId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_lista_responsable_estado_aprobacion" ON "ListaEquipo"("responsableId", "estado", "fechaAprobacionFinal");

-- CreateIndex
CREATE INDEX "idx_lista_estado_necesaria_fecha" ON "ListaEquipo"("estado", "fechaNecesaria", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ListaEquipoItem_cotizacionSeleccionadaId_key" ON "ListaEquipoItem"("cotizacionSeleccionadaId");

-- CreateIndex
CREATE INDEX "idx_lista_item_lista_estado_fecha" ON "ListaEquipoItem"("listaId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_lista_item_responsable_estado_verificado" ON "ListaEquipoItem"("responsableId", "estado", "verificado");

-- CreateIndex
CREATE INDEX "idx_lista_item_proveedor_estado_precio" ON "ListaEquipoItem"("proveedorId", "estado", "precioElegido");

-- CreateIndex
CREATE UNIQUE INDEX "CotizacionProveedor_codigo_key" ON "CotizacionProveedor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoEquipo_codigo_key" ON "PedidoEquipo"("codigo");

-- CreateIndex
CREATE INDEX "idx_pedido_proyecto_estado_fecha" ON "PedidoEquipo"("proyectoId", "estado", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_pedido_responsable_estado_fecha" ON "PedidoEquipo"("responsableId", "estado", "fechaNecesaria");

-- CreateIndex
CREATE INDEX "idx_pedido_estado_prioridad_fecha" ON "PedidoEquipo"("estado", "prioridad", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_pedido_proyecto_responsable_estado" ON "PedidoEquipo"("proyectoId", "responsableId", "estado");

-- CreateIndex
CREATE INDEX "RegistroHoras_categoriaServicioId_fechaTrabajo_idx" ON "RegistroHoras"("categoriaServicioId", "fechaTrabajo");

-- CreateIndex
CREATE INDEX "RegistroHoras_origen_fechaTrabajo_idx" ON "RegistroHoras"("origen", "fechaTrabajo");

-- CreateIndex
CREATE INDEX "RegistroHoras_proyectoEdtId_fechaTrabajo_idx" ON "RegistroHoras"("proyectoEdtId", "fechaTrabajo");

-- CreateIndex
CREATE UNIQUE INDEX "dependencias_tarea_tareaOrigenId_tareaDependienteId_key" ON "dependencias_tarea"("tareaOrigenId", "tareaDependienteId");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_recurso_tareaId_usuarioId_key" ON "asignaciones_recurso"("tareaId", "usuarioId");

-- CreateIndex
CREATE INDEX "cotizacion_exclusion_cotizacionId_orden_idx" ON "cotizacion_exclusion"("cotizacionId", "orden");

-- CreateIndex
CREATE INDEX "cotizacion_condicion_cotizacionId_orden_idx" ON "cotizacion_condicion"("cotizacionId", "orden");

-- CreateIndex
CREATE INDEX "plantilla_exclusion_categoria_activo_idx" ON "plantilla_exclusion"("categoria", "activo");

-- CreateIndex
CREATE INDEX "plantilla_exclusion_item_plantillaExclusionId_orden_idx" ON "plantilla_exclusion_item"("plantillaExclusionId", "orden");

-- CreateIndex
CREATE INDEX "plantilla_condicion_categoria_tipo_activo_idx" ON "plantilla_condicion"("categoria", "tipo", "activo");

-- CreateIndex
CREATE INDEX "plantilla_condicion_item_plantillaCondicionId_orden_idx" ON "plantilla_condicion_item"("plantillaCondicionId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "crm_oportunidad_cotizacionId_key" ON "crm_oportunidad"("cotizacionId");

-- CreateIndex
CREATE INDEX "crm_oportunidad_clienteId_estado_idx" ON "crm_oportunidad"("clienteId", "estado");

-- CreateIndex
CREATE INDEX "crm_oportunidad_comercialId_fechaCierreEstimada_idx" ON "crm_oportunidad"("comercialId", "fechaCierreEstimada");

-- CreateIndex
CREATE INDEX "crm_actividad_oportunidadId_fecha_idx" ON "crm_actividad"("oportunidadId", "fecha");

-- CreateIndex
CREATE INDEX "crm_competidor_licitacion_cotizacionId_idx" ON "crm_competidor_licitacion"("cotizacionId");

-- CreateIndex
CREATE INDEX "crm_contacto_cliente_clienteId_esDecisionMaker_idx" ON "crm_contacto_cliente"("clienteId", "esDecisionMaker");

-- CreateIndex
CREATE INDEX "crm_historial_proyecto_clienteId_fechaInicio_idx" ON "crm_historial_proyecto"("clienteId", "fechaInicio");

-- CreateIndex
CREATE INDEX "crm_historial_proyecto_tipoProyecto_sector_idx" ON "crm_historial_proyecto"("tipoProyecto", "sector");

-- CreateIndex
CREATE INDEX "crm_metrica_comercial_periodo_idx" ON "crm_metrica_comercial"("periodo");

-- CreateIndex
CREATE UNIQUE INDEX "crm_metrica_comercial_usuarioId_periodo_key" ON "crm_metrica_comercial"("usuarioId", "periodo");

-- CreateIndex
CREATE INDEX "cotizacion_version_cotizacionId_version_idx" ON "cotizacion_version"("cotizacionId", "version");

-- CreateIndex
CREATE INDEX "cotizacion_version_estado_createdAt_idx" ON "cotizacion_version"("estado", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cotizacion_version_cotizacionId_version_key" ON "cotizacion_version"("cotizacionId", "version");

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
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_categoriaServicioId_fkey" FOREIGN KEY ("categoriaServicioId") REFERENCES "CategoriaServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_cotizacionServicioId_fkey" FOREIGN KEY ("cotizacionServicioId") REFERENCES "CotizacionServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_edt" ADD CONSTRAINT "cotizacion_edt_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_cotizacionEdtId_fkey" FOREIGN KEY ("cotizacionEdtId") REFERENCES "cotizacion_edt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_cotizacionServicioItemId_fkey" FOREIGN KEY ("cotizacionServicioItemId") REFERENCES "CotizacionServicioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_dependenciaId_fkey" FOREIGN KEY ("dependenciaId") REFERENCES "cotizacion_tarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_tarea" ADD CONSTRAINT "cotizacion_tarea_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_categoriaServicioId_fkey" FOREIGN KEY ("categoriaServicioId") REFERENCES "CategoriaServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_edt" ADD CONSTRAINT "proyecto_edt_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipo" ADD CONSTRAINT "ListaEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipo" ADD CONSTRAINT "ListaEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_cotizacionSeleccionadaId_fkey" FOREIGN KEY ("cotizacionSeleccionadaId") REFERENCES "CotizacionProveedorItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "ProyectoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_proyectoEquipoItemId_fkey" FOREIGN KEY ("proyectoEquipoItemId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_reemplazaProyectoEquipoItemId_fkey" FOREIGN KEY ("reemplazaProyectoEquipoItemId") REFERENCES "ProyectoEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListaEquipoItem" ADD CONSTRAINT "ListaEquipoItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "CotizacionProveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipo" ADD CONSTRAINT "PedidoEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaEquipoItemId_fkey" FOREIGN KEY ("listaEquipoItemId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoEquipoItem" ADD CONSTRAINT "PedidoEquipoItem_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valorizacion" ADD CONSTRAINT "Valorizacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_categoriaServicioId_fkey" FOREIGN KEY ("categoriaServicioId") REFERENCES "CategoriaServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoEdtId_fkey" FOREIGN KEY ("proyectoEdtId") REFERENCES "proyecto_edt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "Recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroHoras" ADD CONSTRAINT "RegistroHoras_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtareas" ADD CONSTRAINT "subtareas_asignadoId_fkey" FOREIGN KEY ("asignadoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtareas" ADD CONSTRAINT "subtareas_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencias_tarea" ADD CONSTRAINT "dependencias_tarea_tareaDependienteId_fkey" FOREIGN KEY ("tareaDependienteId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencias_tarea" ADD CONSTRAINT "dependencias_tarea_tareaOrigenId_fkey" FOREIGN KEY ("tareaOrigenId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_recurso" ADD CONSTRAINT "asignaciones_recurso_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_recurso" ADD CONSTRAINT "asignaciones_recurso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "registros_progreso_subtareaId_fkey" FOREIGN KEY ("subtareaId") REFERENCES "subtareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "registros_progreso_tareaId_fkey" FOREIGN KEY ("tareaId") REFERENCES "tareas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_progreso" ADD CONSTRAINT "registros_progreso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_exclusion" ADD CONSTRAINT "cotizacion_exclusion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_condicion" ADD CONSTRAINT "cotizacion_condicion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_exclusion_item" ADD CONSTRAINT "plantilla_exclusion_item_plantillaExclusionId_fkey" FOREIGN KEY ("plantillaExclusionId") REFERENCES "plantilla_exclusion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantilla_condicion_item" ADD CONSTRAINT "plantilla_condicion_item_plantillaCondicionId_fkey" FOREIGN KEY ("plantillaCondicionId") REFERENCES "plantilla_condicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_actividad" ADD CONSTRAINT "crm_actividad_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "crm_oportunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_actividad" ADD CONSTRAINT "crm_actividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_competidor_licitacion" ADD CONSTRAINT "crm_competidor_licitacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_contacto_cliente" ADD CONSTRAINT "crm_contacto_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_historial_proyecto" ADD CONSTRAINT "crm_historial_proyecto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_historial_proyecto" ADD CONSTRAINT "crm_historial_proyecto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_historial_proyecto" ADD CONSTRAINT "crm_historial_proyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_metrica_comercial" ADD CONSTRAINT "crm_metrica_comercial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_version" ADD CONSTRAINT "cotizacion_version_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotizacion_version" ADD CONSTRAINT "cotizacion_version_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipo" ADD CONSTRAINT "ProyectoEquipo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipo" ADD CONSTRAINT "ProyectoEquipo_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_catalogoEquipoId_fkey" FOREIGN KEY ("catalogoEquipoId") REFERENCES "CatalogoEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_listaEquipoSeleccionadoId_fkey" FOREIGN KEY ("listaEquipoSeleccionadoId") REFERENCES "ListaEquipoItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_listaId_fkey" FOREIGN KEY ("listaId") REFERENCES "ListaEquipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoEquipoItem" ADD CONSTRAINT "ProyectoEquipoItem_proyectoEquipoId_fkey" FOREIGN KEY ("proyectoEquipoId") REFERENCES "ProyectoEquipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGasto" ADD CONSTRAINT "ProyectoGasto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoGastoItem" ADD CONSTRAINT "ProyectoGastoItem_gastoId_fkey" FOREIGN KEY ("gastoId") REFERENCES "ProyectoGasto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicio" ADD CONSTRAINT "ProyectoServicio_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicio" ADD CONSTRAINT "ProyectoServicio_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicioItem" ADD CONSTRAINT "ProyectoServicioItem_catalogoServicioId_fkey" FOREIGN KEY ("catalogoServicioId") REFERENCES "CatalogoServicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProyectoServicioItem" ADD CONSTRAINT "ProyectoServicioItem_proyectoServicioId_fkey" FOREIGN KEY ("proyectoServicioId") REFERENCES "ProyectoServicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

