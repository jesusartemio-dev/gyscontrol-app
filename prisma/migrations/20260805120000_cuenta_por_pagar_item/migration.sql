-- CreateTable
CREATE TABLE "cuenta_por_pagar_item" (
    "id" TEXT NOT NULL,
    "cuentaPorPagarId" TEXT NOT NULL,
    "ordenCompraItemId" TEXT NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuenta_por_pagar_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cuenta_por_pagar_item_cuentaPorPagarId_idx" ON "cuenta_por_pagar_item"("cuentaPorPagarId");

-- CreateIndex
CREATE INDEX "cuenta_por_pagar_item_ordenCompraItemId_idx" ON "cuenta_por_pagar_item"("ordenCompraItemId");

-- AddForeignKey
ALTER TABLE "cuenta_por_pagar_item" ADD CONSTRAINT "cuenta_por_pagar_item_cuentaPorPagarId_fkey" FOREIGN KEY ("cuentaPorPagarId") REFERENCES "cuenta_por_pagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cuenta_por_pagar_item" ADD CONSTRAINT "cuenta_por_pagar_item_ordenCompraItemId_fkey" FOREIGN KEY ("ordenCompraItemId") REFERENCES "orden_compra_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

