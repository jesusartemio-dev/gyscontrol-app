-- AlterTable
ALTER TABLE "public"."Cliente" ADD COLUMN     "calificacion" INTEGER DEFAULT 3,
ADD COLUMN     "estadoRelacion" TEXT NOT NULL DEFAULT 'prospecto',
ADD COLUMN     "frecuenciaCompra" TEXT,
ADD COLUMN     "linkedin" TEXT,
ADD COLUMN     "potencialAnual" DOUBLE PRECISION,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "sitioWeb" TEXT,
ADD COLUMN     "tamanoEmpresa" TEXT,
ADD COLUMN     "ultimoProyecto" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."Cotizacion" ADD COLUMN     "competencia" TEXT,
ADD COLUMN     "etapaCrm" TEXT DEFAULT 'nuevo',
ADD COLUMN     "fechaProximaAccion" TIMESTAMP(3),
ADD COLUMN     "fechaUltimoContacto" TIMESTAMP(3),
ADD COLUMN     "posicionVsCompetencia" TEXT,
ADD COLUMN     "prioridadCrm" TEXT DEFAULT 'media',
ADD COLUMN     "probabilidadCierre" INTEGER DEFAULT 0,
ADD COLUMN     "proximaAccion" TEXT,
ADD COLUMN     "razonCierre" TEXT,
ADD COLUMN     "retroalimentacionCliente" TEXT;

-- CreateTable
CREATE TABLE "public"."crm_oportunidad" (
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
CREATE TABLE "public"."crm_actividad" (
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
CREATE TABLE "public"."crm_competidor_licitacion" (
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
CREATE TABLE "public"."crm_contacto_cliente" (
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
CREATE TABLE "public"."crm_historial_proyecto" (
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
CREATE TABLE "public"."crm_metrica_comercial" (
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

-- CreateIndex
CREATE UNIQUE INDEX "crm_oportunidad_cotizacionId_key" ON "public"."crm_oportunidad"("cotizacionId");

-- CreateIndex
CREATE INDEX "crm_oportunidad_clienteId_estado_idx" ON "public"."crm_oportunidad"("clienteId", "estado");

-- CreateIndex
CREATE INDEX "crm_oportunidad_comercialId_fechaCierreEstimada_idx" ON "public"."crm_oportunidad"("comercialId", "fechaCierreEstimada");

-- CreateIndex
CREATE INDEX "crm_actividad_oportunidadId_fecha_idx" ON "public"."crm_actividad"("oportunidadId", "fecha");

-- CreateIndex
CREATE INDEX "crm_competidor_licitacion_cotizacionId_idx" ON "public"."crm_competidor_licitacion"("cotizacionId");

-- CreateIndex
CREATE INDEX "crm_contacto_cliente_clienteId_esDecisionMaker_idx" ON "public"."crm_contacto_cliente"("clienteId", "esDecisionMaker");

-- CreateIndex
CREATE INDEX "crm_historial_proyecto_clienteId_fechaInicio_idx" ON "public"."crm_historial_proyecto"("clienteId", "fechaInicio");

-- CreateIndex
CREATE INDEX "crm_historial_proyecto_tipoProyecto_sector_idx" ON "public"."crm_historial_proyecto"("tipoProyecto", "sector");

-- CreateIndex
CREATE INDEX "crm_metrica_comercial_periodo_idx" ON "public"."crm_metrica_comercial"("periodo");

-- CreateIndex
CREATE UNIQUE INDEX "crm_metrica_comercial_usuarioId_periodo_key" ON "public"."crm_metrica_comercial"("usuarioId", "periodo");

-- AddForeignKey
ALTER TABLE "public"."crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_comercialId_fkey" FOREIGN KEY ("comercialId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_oportunidad" ADD CONSTRAINT "crm_oportunidad_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_actividad" ADD CONSTRAINT "crm_actividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_actividad" ADD CONSTRAINT "crm_actividad_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "public"."crm_oportunidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_competidor_licitacion" ADD CONSTRAINT "crm_competidor_licitacion_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_contacto_cliente" ADD CONSTRAINT "crm_contacto_cliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_historial_proyecto" ADD CONSTRAINT "crm_historial_proyecto_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_historial_proyecto" ADD CONSTRAINT "crm_historial_proyecto_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "public"."Proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_historial_proyecto" ADD CONSTRAINT "crm_historial_proyecto_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "public"."Cotizacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."crm_metrica_comercial" ADD CONSTRAINT "crm_metrica_comercial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
