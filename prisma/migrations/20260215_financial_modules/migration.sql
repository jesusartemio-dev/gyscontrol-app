-- =============================================
-- Financial Modules: Valorizacion, CxC, CxP
-- =============================================

-- 1. New enums
CREATE TYPE "EstadoValorizacion" AS ENUM ('borrador', 'enviada', 'aprobada_cliente', 'facturada', 'pagada', 'anulada');
CREATE TYPE "EstadoCuentaCobrar" AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida', 'anulada');
CREATE TYPE "EstadoCuentaPagar" AS ENUM ('pendiente', 'parcial', 'pagada', 'vencida', 'anulada');

-- 2. Drop old valorizacion table (empty, confirmed by user)
DROP TABLE IF EXISTS "valorizacion";

-- 3. Create new valorizacion table
CREATE TABLE "valorizacion" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "tipoCambio" DOUBLE PRECISION,
    "presupuestoContractual" DOUBLE PRECISION NOT NULL,
    "acumuladoAnterior" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montoValorizacion" DOUBLE PRECISION NOT NULL,
    "acumuladoActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldoPorValorizar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "porcentajeAvance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuentoComercialPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuentoComercialMonto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adelantoPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adelantoMonto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igvPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "igvMonto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fondoGarantiaPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fondoGarantiaMonto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netoARecibir" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" "EstadoValorizacion" NOT NULL DEFAULT 'borrador',
    "fechaEnvio" TIMESTAMP(3),
    "fechaAprobacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valorizacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "valorizacion_codigo_key" ON "valorizacion"("codigo");
CREATE UNIQUE INDEX "valorizacion_proyectoId_numero_key" ON "valorizacion"("proyectoId", "numero");
CREATE INDEX "valorizacion_proyectoId_estado_idx" ON "valorizacion"("proyectoId", "estado");
CREATE INDEX "valorizacion_estado_createdAt_idx" ON "valorizacion"("estado", "createdAt" DESC);

ALTER TABLE "valorizacion" ADD CONSTRAINT "valorizacion_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Create valorizacion_adjunto table
CREATE TABLE "valorizacion_adjunto" (
    "id" TEXT NOT NULL,
    "valorizacionId" TEXT NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "urlArchivo" TEXT NOT NULL,
    "driveFileId" TEXT,
    "tipoArchivo" TEXT,
    "tamano" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valorizacion_adjunto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "valorizacion_adjunto_valorizacionId_idx" ON "valorizacion_adjunto"("valorizacionId");

ALTER TABLE "valorizacion_adjunto" ADD CONSTRAINT "valorizacion_adjunto_valorizacionId_fkey" FOREIGN KEY ("valorizacionId") REFERENCES "valorizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Create cuenta_bancaria table
CREATE TABLE "cuenta_bancaria" (
    "id" TEXT NOT NULL,
    "nombreBanco" TEXT NOT NULL,
    "numeroCuenta" TEXT NOT NULL,
    "cci" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'corriente',
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuenta_bancaria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cuenta_bancaria_activa_moneda_idx" ON "cuenta_bancaria"("activa", "moneda");

-- 6. Create cuenta_por_cobrar table
CREATE TABLE "cuenta_por_cobrar" (
    "id" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "valorizacionId" TEXT,
    "numeroDocumento" TEXT,
    "descripcion" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "tipoCambio" DOUBLE PRECISION,
    "montoPagado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldoPendiente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCuentaCobrar" NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuenta_por_cobrar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cuenta_por_cobrar_proyectoId_estado_idx" ON "cuenta_por_cobrar"("proyectoId", "estado");
CREATE INDEX "cuenta_por_cobrar_clienteId_estado_idx" ON "cuenta_por_cobrar"("clienteId", "estado");
CREATE INDEX "cuenta_por_cobrar_estado_fechaVencimiento_idx" ON "cuenta_por_cobrar"("estado", "fechaVencimiento");

ALTER TABLE "cuenta_por_cobrar" ADD CONSTRAINT "cuenta_por_cobrar_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cuenta_por_cobrar" ADD CONSTRAINT "cuenta_por_cobrar_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cuenta_por_cobrar" ADD CONSTRAINT "cuenta_por_cobrar_valorizacionId_fkey" FOREIGN KEY ("valorizacionId") REFERENCES "valorizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Create pago_cobro table
CREATE TABLE "pago_cobro" (
    "id" TEXT NOT NULL,
    "cuentaPorCobrarId" TEXT NOT NULL,
    "cuentaBancariaId" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "medioPago" TEXT NOT NULL DEFAULT 'transferencia',
    "numeroOperacion" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pago_cobro_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pago_cobro_cuentaPorCobrarId_idx" ON "pago_cobro"("cuentaPorCobrarId");
CREATE INDEX "pago_cobro_fechaPago_idx" ON "pago_cobro"("fechaPago");

ALTER TABLE "pago_cobro" ADD CONSTRAINT "pago_cobro_cuentaPorCobrarId_fkey" FOREIGN KEY ("cuentaPorCobrarId") REFERENCES "cuenta_por_cobrar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pago_cobro" ADD CONSTRAINT "pago_cobro_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuenta_bancaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Create cuenta_por_pagar table
CREATE TABLE "cuenta_por_pagar" (
    "id" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "proyectoId" TEXT,
    "ordenCompraId" TEXT,
    "numeroFactura" TEXT,
    "descripcion" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "tipoCambio" DOUBLE PRECISION,
    "montoPagado" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldoPendiente" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fechaRecepcion" TIMESTAMP(3) NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "condicionPago" TEXT NOT NULL DEFAULT 'contado',
    "estado" "EstadoCuentaPagar" NOT NULL DEFAULT 'pendiente',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuenta_por_pagar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cuenta_por_pagar_proveedorId_estado_idx" ON "cuenta_por_pagar"("proveedorId", "estado");
CREATE INDEX "cuenta_por_pagar_proyectoId_estado_idx" ON "cuenta_por_pagar"("proyectoId", "estado");
CREATE INDEX "cuenta_por_pagar_estado_fechaVencimiento_idx" ON "cuenta_por_pagar"("estado", "fechaVencimiento");

ALTER TABLE "cuenta_por_pagar" ADD CONSTRAINT "cuenta_por_pagar_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cuenta_por_pagar" ADD CONSTRAINT "cuenta_por_pagar_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cuenta_por_pagar" ADD CONSTRAINT "cuenta_por_pagar_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "orden_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. Create pago_pagar table
CREATE TABLE "pago_pagar" (
    "id" TEXT NOT NULL,
    "cuentaPorPagarId" TEXT NOT NULL,
    "cuentaBancariaId" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL,
    "medioPago" TEXT NOT NULL DEFAULT 'transferencia',
    "numeroOperacion" TEXT,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pago_pagar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pago_pagar_cuentaPorPagarId_idx" ON "pago_pagar"("cuentaPorPagarId");
CREATE INDEX "pago_pagar_fechaPago_idx" ON "pago_pagar"("fechaPago");

ALTER TABLE "pago_pagar" ADD CONSTRAINT "pago_pagar_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "cuenta_por_pagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pago_pagar" ADD CONSTRAINT "pago_pagar_cuentaBancariaId_fkey" FOREIGN KEY ("cuentaBancariaId") REFERENCES "cuenta_bancaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;
