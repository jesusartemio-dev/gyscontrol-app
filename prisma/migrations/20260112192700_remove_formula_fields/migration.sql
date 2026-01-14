/*
  Warnings:

  - You are about to drop the column `formula` on the `CatalogoServicio` table. All the data in the column will be lost.
  - You are about to drop the column `horaFijo` on the `CatalogoServicio` table. All the data in the column will be lost.
  - You are about to drop the column `horaUnidad` on the `CatalogoServicio` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CatalogoServicio" DROP COLUMN "formula",
DROP COLUMN "horaFijo",
DROP COLUMN "horaUnidad";
