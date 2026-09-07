/**
 * El Detalle de Liquidación de BANPRO trae UNA FILA POR FACTURA: la operación
 * 52104 real junta tres, y de deudores distintos. Verifica que el lector saque
 * las tres por separado, que no confunda los importes de la operación
 * (comisión, gastos, IGV, adelanto) con los de cada factura, y que la
 * operación de una sola factura siga funcionando como antes.
 *
 * Correr con: npx dotenv -e .env.local -e .env -o -- npx tsx scripts/test-liquidacion-multifactura.ts
 */
import { chromium } from 'playwright'
import { extraerDocumentoCobro } from '../src/lib/services/cobroDocumentoExtractor'

let ok = 0, fail = 0
function assert(c: boolean, m: string) {
  if (c) { ok++; console.log(`  OK: ${m}`) } else { fail++; console.log(`  FALLA: ${m}`) }
}
const cerca = (a: number | null | undefined, b: number, tol = 0.01) => a != null && Math.abs(a - b) <= tol

const CABECERA = (op: string) => `
<div style="font-family:Arial;font-size:10px;padding:14px">
  <table width="100%"><tr>
    <td><b>BAN'PRO</b> FACTORING</td>
    <td align="center"><b>DETALLE LIQUIDACIÓN FACTORING<br>OTORGAMIENTO</b></td>
    <td align="right">Fecha: 31-08-2026<br>Página: 1</td>
  </tr></table>
  <p><b>Cliente :</b> G Y S CONTROL INDUSTRIAL SOCIEDAD ANONIM &nbsp;&nbsp; <b>Ruc :</b> 20545610672<br>
     <b>Nro. Operación :</b> ${op}</p>`

const TABLA = (filas: string) => `
  <table border="1" cellpadding="3" width="100%" style="border-collapse:collapse;font-size:9px">
    <tr>
      <th>DEUDOR</th><th>RUC DEUDOR</th><th>FEC. CURSE</th><th>FEC. VTO.NOM.</th><th>DIAS</th>
      <th>NRO. DOC.</th><th>COD. BCO.</th><th>MONTO DOCUM.</th><th>DETRAC.</th><th>% ANT.</th>
      <th>MTO. NOM.ANT.</th><th>MTO. NO ANT.</th><th>MTO.DIF. PRECIO</th><th>MTO.ANT. S/DESCTO</th>
    </tr>
    ${filas}
  </table>`

const PIE = (adelanto: string, com: string, gasto: string, igv: string, saldo: string, total: string) => `
  <table width="100%" style="margin-top:6px;font-size:9px"><tr>
    <td valign="top">TOTAL DOCUMENTOS ANTICIPADOS : ${total}</td>
    <td align="right">
      <b>Adelanto</b> ${adelanto}<br>
      <b>Comisión</b> ${com}<br>
      <b>Gasto legal</b> ${gasto}<br>
      <b>I.G.V</b> ${igv}<br>
      <b>Aplicación(es)</b> 0.00<br>
      <b>Saldo liquido a girar</b> ${saldo}
    </td>
  </tr></table></div>`

// Operación 48507 — UNA factura
const LIQ_48507 = CABECERA('48507') + TABLA(`
  <tr><td>CORPORACION PERUANA DEP</td><td>20100073723</td><td>02-03-2026</td><td>30-06-2026</td><td>120</td>
      <td>1719</td><td>6</td><td>31,087.27</td><td>0.00</td><td>99</td>
      <td>30,776.40</td><td>310.87</td><td>1,698.86</td><td>29,077.54</td></tr>
  <tr><td colspan="7"><b>TOTAL</b></td><td>31,087.27</td><td>0.00</td><td></td>
      <td>30,776.40</td><td>310.87</td><td>1,698.86</td><td>29,077.54</td></tr>
`) + PIE('27,800.00', '264.24', '25.00', '52.06', '936.24', '1')

// Operación 52104 — TRES facturas, dos deudores distintos
const LIQ_52104 = CABECERA('52104') + TABLA(`
  <tr><td>NEXA RESOURCES CAJAMARQ</td><td>20261677955</td><td>30-04-2026</td><td>07-07-2026</td><td>68</td>
      <td>1739</td><td>6</td><td>4,875.97</td><td>0.00</td><td>99</td>
      <td>4,827.21</td><td>48.76</td><td>151.00</td><td>4,676.21</td></tr>
  <tr><td>CORPORACION PERUANA DEP</td><td>20100073723</td><td>30-04-2026</td><td>28-07-2026</td><td>89</td>
      <td>1737</td><td>6</td><td>8,259.72</td><td>0.00</td><td>99</td>
      <td>8,177.12</td><td>82.60</td><td>334.77</td><td>7,842.35</td></tr>
  <tr><td>CORPORACION PERUANA DEP</td><td>20100073723</td><td>30-04-2026</td><td>27-08-2026</td><td>119</td>
      <td>1738</td><td>6</td><td>16,579.88</td><td>0.00</td><td>99</td>
      <td>16,414.08</td><td>165.80</td><td>898.51</td><td>15,515.57</td></tr>
  <tr><td colspan="7"><b>TOTAL</b></td><td>29,715.57</td><td>0.00</td><td></td>
      <td>29,418.41</td><td>297.16</td><td>1,384.28</td><td>28,034.13</td></tr>
`) + PIE('26,800.00', '252.58', '25.00', '49.96', '906.60', '3')

async function leer(page: any, html: string) {
  await page.setContent(html)
  const buf = await page.pdf({ format: 'A4', landscape: true })
  const file = new File([new Uint8Array(buf)], 'liquidacion.pdf', { type: 'application/pdf' })
  return extraerDocumentoCobro(file, 'liquidacion_factoring', 'test-multifactura') as any
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    // ── Una sola factura: tiene que seguir funcionando como antes ──
    console.log('\n[1] Operación 48507 — una sola factura')
    const r1 = await leer(page, LIQ_48507)
    assert(r1.tipo === 'liquidacion_factoring', `se reconoció como liquidación (fue ${r1.tipo})`)
    const d1 = r1.datos
    assert(d1.numeroOperacion === '48507', `operación 48507 (fue ${d1.numeroOperacion})`)
    assert(d1.documentos.length === 1, `1 documento (fue ${d1.documentos.length})`)
    assert(cerca(d1.valorAFinanciar, 30776.40), `expone valorAFinanciar suelto = 30,776.40 (fue ${d1.valorAFinanciar})`)
    assert(cerca(d1.interesMonto, 1698.86), `interés suelto = 1,698.86 (fue ${d1.interesMonto})`)
    assert(cerca(d1.adelantoBanpro, 27800), `adelanto de la operación = 27,800 (fue ${d1.adelantoBanpro})`)
    assert(cerca(d1.documentos[0]?.montoAnticipo, 29077.54), `monto anticipo = 29,077.54 (fue ${d1.documentos[0]?.montoAnticipo})`)

    // ── Tres facturas: lo nuevo ──
    console.log('\n[2] Operación 52104 — tres facturas, dos deudores')
    const r2 = await leer(page, LIQ_52104)
    const d2 = r2.datos
    console.log('    docs:', JSON.stringify(d2.documentos?.map((x: any) => [x.numeroDocumento, x.montoDocumento, x.interesMonto])))
    assert(d2.numeroOperacion === '52104', `operación 52104 (fue ${d2.numeroOperacion})`)
    assert(d2.documentos.length === 3, `saca las 3 filas, sin contar la de TOTAL (fue ${d2.documentos.length})`)

    const porDoc = Object.fromEntries((d2.documentos ?? []).map((x: any) => [x.numeroDocumento, x]))
    assert(cerca(porDoc['1739']?.montoDocumento, 4875.97), `1739: monto 4,875.97 (fue ${porDoc['1739']?.montoDocumento})`)
    assert(cerca(porDoc['1739']?.interesMonto, 151.00), `1739: interés 151.00 (fue ${porDoc['1739']?.interesMonto})`)
    assert(porDoc['1739']?.diasFinanciamiento === 68, `1739: 68 días propios (fue ${porDoc['1739']?.diasFinanciamiento})`)
    assert(cerca(porDoc['1737']?.valorAFinanciar, 8177.12), `1737: a financiar 8,177.12 (fue ${porDoc['1737']?.valorAFinanciar})`)
    assert(cerca(porDoc['1737']?.excedenteMonto, 82.60), `1737: excedente 82.60 (fue ${porDoc['1737']?.excedenteMonto})`)
    assert(porDoc['1738']?.diasFinanciamiento === 119, `1738: 119 días propios (fue ${porDoc['1738']?.diasFinanciamiento})`)
    assert(cerca(porDoc['1738']?.montoAnticipo, 15515.57), `1738: monto anticipo 15,515.57 (fue ${porDoc['1738']?.montoAnticipo})`)
    assert(porDoc['1739']?.deudor?.includes('NEXA'), `1739 es de NEXA, deudor distinto (fue "${porDoc['1739']?.deudor}")`)

    console.log('\n[3] no confunde los importes de la operación con los de cada factura')
    assert(cerca(d2.comisionEstructuracion, 252.58), `comisión 252.58 al nivel de la operación (fue ${d2.comisionEstructuracion})`)
    assert(cerca(d2.gastosAdicionales, 25.00), `gastos 25.00 de la operación (fue ${d2.gastosAdicionales})`)
    assert(cerca(d2.igvGastos, 49.96), `IGV 49.96 de la operación (fue ${d2.igvGastos})`)
    assert(cerca(d2.adelantoBanpro, 26800.00), `adelanto 26,800.00, el depósito único (fue ${d2.adelantoBanpro})`)
    assert(cerca(d2.saldoAGirar, 906.60), `saldo a girar 906.60 (fue ${d2.saldoAGirar})`)
    assert(d2.valorAFinanciar == null && d2.interesMonto == null,
      'con varias facturas NO expone importes de documento sueltos: elegir uno sería arbitrario')

    console.log('\n[4] los documentos suman los totales de BANPRO')
    const suma = (f: (x: any) => number | null) =>
      Math.round((d2.documentos ?? []).reduce((a: number, x: any) => a + (f(x) ?? 0), 0) * 100) / 100
    assert(cerca(suma(x => x.montoDocumento), 29715.57), `Σ monto documento = 29,715.57 (fue ${suma(x => x.montoDocumento)})`)
    assert(cerca(suma(x => x.valorAFinanciar), 29418.41), `Σ valor a financiar = 29,418.41 (fue ${suma(x => x.valorAFinanciar)})`)
    assert(cerca(suma(x => x.excedenteMonto), 297.16), `Σ excedente = 297.16 (fue ${suma(x => x.excedenteMonto)})`)
    assert(cerca(suma(x => x.interesMonto), 1384.28), `Σ interés = 1,384.28 (fue ${suma(x => x.interesMonto)})`)
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
