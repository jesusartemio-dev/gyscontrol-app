/**
 * Verifica que el extractor NO copie el monto de detracción impreso en soles
 * cuando la factura es en dólares — el error real que rompió QRM15 y FMK01.
 *
 * Correr con: npx dotenv -e .env -o -- npx tsx scripts/test-extraccion-detraccion-moneda.ts
 */
import { chromium } from 'playwright'
import { extraerDocumentoCobro } from '../src/lib/services/cobroDocumentoExtractor'

let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null, b: number, tol = 1) => a != null && Math.abs(a - b) <= tol

// Réplica de la factura real QRM15 E001-1719: total en USD, detracción en S/.
const FACTURA_USD = (total: string, detPEN: string, neto: string, num: string) => `
<div style="font-family:Arial;font-size:11px;padding:18px">
  <table width="100%"><tr>
    <td><b>G Y S CONTROL INDUSTRIAL SOCIEDAD ANONIMA CERRADA</b><br>RUC: 20545610672</td>
    <td style="border:1px solid #000;padding:6px;text-align:center"><b>FACTURA ELECTRONICA</b><br>RUC: 20545610672<br><b>${num}</b></td>
  </tr></table>
  <p>Fecha de Emisión : 02/03/2026 &nbsp;&nbsp; Forma de pago: Crédito<br>
     Señor(es): CORPORACION PERUANA DE PRODUCTOS QUIMICOS S.A.<br>
     Tipo de Moneda : <b>DOLAR AMERICANO</b></p>
  <table border="1" cellpadding="4" width="100%">
    <tr><td>SERVICIO ELECTRICO MENOR (3ERA VALORIZACION)</td><td align="right">29,937.66</td></tr>
  </table>
  <table cellpadding="3" align="right">
    <tr><td>Sub Total Ventas</td><td align="right">$ 29,937.66</td></tr>
    <tr><td>IGV</td><td align="right">$ 5,388.78</td></tr>
    <tr><td><b>Importe Total</b></td><td align="right"><b>$ ${total}</b></td></tr>
  </table>
  <div style="clear:both;border:1px solid #000;padding:6px;margin-top:8px">
    <b>Información de la detracción</b><br>
    Operación sujeta al Sistema de Pago de Obligaciones Tributarias con el Gobierno Central<br>
    Bien o Servicio: 037 Demás servicios gravados con el IGV<br>
    Medio Pago: 001 Depósito en cuenta<br>
    Nro. Cta. Banco de la Nación: 00060030332 &nbsp;
    Porcentaje de detracción: 12.00 &nbsp; <b>Monto detracción: S/ ${detPEN}</b>
  </div>
  <div style="border:1px solid #000;padding:6px;margin-top:6px">
    <b>Información del crédito</b><br>
    Monto neto pendiente de pago : <b>$ ${neto}</b> &nbsp; Total de Cuotas: 1
  </div>
</div>`

// Factura en soles: acá el monto impreso SÍ es el que descuenta.
const FACTURA_PEN = `
<div style="font-family:Arial;font-size:11px;padding:18px">
  <b>G Y S CONTROL INDUSTRIAL S.A.C.</b> — <b>FACTURA ELECTRONICA E001-2001</b>
  <p>Fecha de Emisión : 15/04/2026<br>Tipo de Moneda : <b>SOLES</b></p>
  <table cellpadding="3"><tr><td><b>Importe Total</b></td><td align="right"><b>S/ 11,800.00</b></td></tr></table>
  <div style="border:1px solid #000;padding:6px">
    <b>Información de la detracción</b><br>
    Porcentaje de detracción: 12.00 &nbsp; <b>Monto detracción: S/ 1,416.00</b>
  </div>
</div>`

async function pdf(page: any, html: string) {
  await page.setContent(html)
  const buf = await page.pdf({ format: 'A4' })
  return new File([new Uint8Array(buf)], 'factura.pdf', { type: 'application/pdf' })
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    // ── Caso 1: QRM15 real — total USD 35,326.44, detracción S/ 14,248.00 ──
    console.log('\n[1] Factura en USD con detracción impresa en soles (caso QRM15)')
    const r1: any = await extraerDocumentoCobro(await pdf(page, FACTURA_USD('35,326.44', '14,248.00', '31,087.27', 'E001-1719')), 'factura', 'test-detraccion')
    console.log('   ', JSON.stringify(r1.datos))
    assert(r1.tipo === 'factura', 'se reconoció como factura')
    assert(cerca(r1.datos.importeTotal, 35326.44, 0.01), `importeTotal = 35326.44 (fue ${r1.datos.importeTotal})`)
    assert(r1.datos.moneda === 'USD', `moneda = USD (fue ${r1.datos.moneda})`)
    assert(cerca(r1.datos.detraccionPct, 12, 0.01), `detraccionPct = 12 (fue ${r1.datos.detraccionPct})`)
    assert(cerca(r1.datos.detraccionMonto, 4239.17, 1), `detraccionMonto en USD = 4239.17 (fue ${r1.datos.detraccionMonto})`)
    assert(r1.datos.detraccionMonto == null || Math.abs(r1.datos.detraccionMonto - 14248) > 1, 'NO copió el 14248 en soles (el bug)')
    assert(cerca(r1.datos.detraccionMontoPEN, 14248, 1), `detraccionMontoPEN = 14248 (fue ${r1.datos.detraccionMontoPEN})`)
    const neto1 = (r1.datos.importeTotal ?? 0) - (r1.datos.detraccionMonto ?? 0)
    assert(cerca(neto1, 31087.27, 1), `total − detracción = 31087.27, el neto que declara la factura (fue ${neto1.toFixed(2)})`)

    // ── Caso 2: FMK01 — total USD 4,250.51, detracción S/ 1,737.00 ──
    console.log('\n[2] Factura en USD, otro tipo de cambio (caso FMK01)')
    const r2: any = await extraerDocumentoCobro(await pdf(page, FACTURA_USD('4,250.51', '1,737.00', '3,740.53', 'E001-1761')), 'factura', 'test-detraccion')
    console.log('   ', JSON.stringify(r2.datos))
    assert(cerca(r2.datos.detraccionMonto, 510.06, 1), `detraccionMonto en USD ≈ 510.06 (fue ${r2.datos.detraccionMonto})`)
    assert(r2.datos.detraccionMonto == null || Math.abs(r2.datos.detraccionMonto - 1737) > 1, 'NO copió el 1737 en soles')
    const neto2 = (r2.datos.importeTotal ?? 0) - (r2.datos.detraccionMonto ?? 0)
    assert(cerca(neto2, 3740.53, 1), `total − detracción = 3740.53, lo que transfirió Interbank (fue ${neto2.toFixed(2)})`)

    // ── Caso 3: factura en soles — no debe "corregir" nada ──
    console.log('\n[3] Factura en soles (el monto impreso SÍ es el que descuenta)')
    const r3: any = await extraerDocumentoCobro(await pdf(page, FACTURA_PEN), 'factura', 'test-detraccion')
    console.log('   ', JSON.stringify(r3.datos))
    assert(r3.datos.moneda === 'PEN', `moneda = PEN (fue ${r3.datos.moneda})`)
    assert(cerca(r3.datos.detraccionMonto, 1416, 1), `detraccionMonto = 1416 (fue ${r3.datos.detraccionMonto})`)
    assert(r3.datos.detraccionMontoPEN == null, `detraccionMontoPEN = null, no duplica (fue ${r3.datos.detraccionMontoPEN})`)
  } catch (e: any) {
    fail++
    console.log(`  FALLA (excepción): ${e.message}`)
    console.log(e.stack?.split('\n').slice(0, 4).join('\n'))
  } finally {
    await browser.close()
    console.log(`\n=== RESULTADO: ${ok} OK, ${fail} FALLAS ===`)
    process.exit(fail > 0 ? 1 : 0)
  }
}

main().catch(e => { console.error('ERROR INESPERADO:', e); process.exit(1) })
