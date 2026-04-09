-- CreateTable
CREATE TABLE "deposito_hoja" (
    "id" TEXT NOT NULL,
    "hojaDeGastosId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposito_hoja_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "hoja_de_gastos_adjunto" ADD COLUMN "depositoHojaId" TEXT;

-- CreateIndex
CREATE INDEX "deposito_hoja_hojaDeGastosId_idx" ON "deposito_hoja"("hojaDeGastosId");

-- CreateIndex
CREATE INDEX "hoja_de_gastos_adjunto_depositoHojaId_idx" ON "hoja_de_gastos_adjunto"("depositoHojaId");

-- AddForeignKey
ALTER TABLE "deposito_hoja" ADD CONSTRAINT "deposito_hoja_hojaDeGastosId_fkey" FOREIGN KEY ("hojaDeGastosId") REFERENCES "hoja_de_gastos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposito_hoja" ADD CONSTRAINT "deposito_hoja_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hoja_de_gastos_adjunto" ADD CONSTRAINT "hoja_de_gastos_adjunto_depositoHojaId_fkey" FOREIGN KEY ("depositoHojaId") REFERENCES "deposito_hoja"("id") ON DELETE SET NULL ON UPDATE CASCADE;
