-- CreateTable: TarifaClienteRecurso
CREATE TABLE "tarifa_cliente_recurso" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "modalidad" "OrigenTrabajo" NOT NULL,
    "tarifaVenta" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarifa_cliente_recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ConfigDescuentoHH
CREATE TABLE "config_descuento_hh" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "desdeHoras" DOUBLE PRECISION NOT NULL,
    "descuentoPct" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_descuento_hh_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ValorizacionHH
CREATE TABLE "valorizacion_hh" (
    "id" TEXT NOT NULL,
    "valorizacionId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "periodoInicio" TIMESTAMP(3) NOT NULL,
    "periodoFin" TIMESTAMP(3) NOT NULL,
    "proyectosIds" TEXT NOT NULL,
    "totalHorasReportadas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHorasEquivalentes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuentoPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descuentoMonto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valorizacion_hh_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LineaHH
CREATE TABLE "linea_hh" (
    "id" TEXT NOT NULL,
    "valorizacionHHId" TEXT NOT NULL,
    "registroHorasId" TEXT NOT NULL,
    "proyectoId" TEXT NOT NULL,
    "recursoId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "detalle" TEXT,
    "modalidad" "OrigenTrabajo" NOT NULL,
    "horasReportadas" DOUBLE PRECISION NOT NULL,
    "horasStd" DOUBLE PRECISION NOT NULL,
    "horasOT125" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasOT135" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasOT200" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasEquivalente" DOUBLE PRECISION NOT NULL,
    "tarifaHora" DOUBLE PRECISION NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "costoLinea" DOUBLE PRECISION NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linea_hh_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tarifa_cliente_recurso_clienteId_recursoId_modalidad_key" ON "tarifa_cliente_recurso"("clienteId", "recursoId", "modalidad");

-- CreateIndex
CREATE UNIQUE INDEX "valorizacion_hh_valorizacionId_key" ON "valorizacion_hh"("valorizacionId");

-- CreateIndex
CREATE UNIQUE INDEX "linea_hh_registroHorasId_key" ON "linea_hh"("registroHorasId");

-- AddForeignKey
ALTER TABLE "tarifa_cliente_recurso" ADD CONSTRAINT "tarifa_cliente_recurso_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarifa_cliente_recurso" ADD CONSTRAINT "tarifa_cliente_recurso_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_descuento_hh" ADD CONSTRAINT "config_descuento_hh_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valorizacion_hh" ADD CONSTRAINT "valorizacion_hh_valorizacionId_fkey" FOREIGN KEY ("valorizacionId") REFERENCES "valorizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valorizacion_hh" ADD CONSTRAINT "valorizacion_hh_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_hh" ADD CONSTRAINT "linea_hh_valorizacionHHId_fkey" FOREIGN KEY ("valorizacionHHId") REFERENCES "valorizacion_hh"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_hh" ADD CONSTRAINT "linea_hh_registroHorasId_fkey" FOREIGN KEY ("registroHorasId") REFERENCES "registro_horas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_hh" ADD CONSTRAINT "linea_hh_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "proyecto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_hh" ADD CONSTRAINT "linea_hh_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
