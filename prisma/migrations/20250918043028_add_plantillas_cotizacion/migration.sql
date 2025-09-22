-- CreateTable
CREATE TABLE "public"."plantilla_exclusion" (
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
CREATE TABLE "public"."plantilla_exclusion_item" (
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
CREATE TABLE "public"."plantilla_condicion" (
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
CREATE TABLE "public"."plantilla_condicion_item" (
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

-- CreateIndex
CREATE INDEX "plantilla_exclusion_categoria_activo_idx" ON "public"."plantilla_exclusion"("categoria", "activo");

-- CreateIndex
CREATE INDEX "plantilla_exclusion_item_plantillaExclusionId_orden_idx" ON "public"."plantilla_exclusion_item"("plantillaExclusionId", "orden");

-- CreateIndex
CREATE INDEX "plantilla_condicion_categoria_tipo_activo_idx" ON "public"."plantilla_condicion"("categoria", "tipo", "activo");

-- CreateIndex
CREATE INDEX "plantilla_condicion_item_plantillaCondicionId_orden_idx" ON "public"."plantilla_condicion_item"("plantillaCondicionId", "orden");

-- AddForeignKey
ALTER TABLE "public"."plantilla_exclusion_item" ADD CONSTRAINT "plantilla_exclusion_item_plantillaExclusionId_fkey" FOREIGN KEY ("plantillaExclusionId") REFERENCES "public"."plantilla_exclusion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plantilla_condicion_item" ADD CONSTRAINT "plantilla_condicion_item_plantillaCondicionId_fkey" FOREIGN KEY ("plantillaCondicionId") REFERENCES "public"."plantilla_condicion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
