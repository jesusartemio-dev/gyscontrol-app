# Analisis de Flujo - Area de Administracion
## GySControl - Contabilidad Gerencial

**Fecha:** 16 de febrero 2026
**Objetivo:** Sustentar los flujos implementados en el sistema, auditar el proceso actual del area de administracion, y detectar oportunidades de mejora.

---

## 1. MAPA GENERAL DE FLUJOS FINANCIEROS

```
INGRESOS (Cobros)                           EGRESOS (Pagos)
=================                           ================

Proyecto                                    Logistica
  |                                           |
  v                                           v
VALORIZACION                                ORDEN DE COMPRA
(gestor crea, cliente aprueba)              (logistico crea, gerencia aprueba)
  |                                           |
  | estado: facturada                         | vinculo manual (opcional)
  v                                           v
CUENTA POR COBRAR (CxC)                    CUENTA POR PAGAR (CxP)
(auto-creada al facturar)                   (admin crea al recibir factura proveedor)
  |                                           |
  v                                           v
PAGOS RECIBIDOS                             PAGOS REALIZADOS
(transferencia, cheque, detraccion)         (transferencia, cheque, efectivo)
  |                                           |
  v                                           v
  +-- CUENTA BANCARIA <---+                  +-- CUENTA BANCARIA
                           |
                    GASTOS OPERATIVOS
                    (requerimientos de dinero)
                           |
                           v
                    HOJA DE GASTOS
                    (anticipo → gasto → rendicion)
```

---

## 2. FLUJO DE VALORIZACIONES + FACTURACION

### 2.1 Estados y Responsables

| # | Estado | Quien | Accion | Datos ingresados |
|---|--------|-------|--------|-----------------|
| 1 | **Borrador** | Gestor | Crea valorización con monto, periodo, % descuento/adelanto/IGV/fondo garantia | Monto, periodo inicio/fin, moneda, tipo cambio |
| 2 | **Enviada** | Gestor | Marca como enviada al cliente | Se registra fecha envio |
| 3 | **Aprobada Cliente** | Gestor | Registra que el cliente aprobó | Se registra fecha aprobacion |
| 4 | **Facturada** | Admin | Ingresa N° factura + fecha vencimiento → auto-crea CxC | N° factura, fecha vencimiento |
| 5 | **Pagada** | Admin | Marca como pagada (a traves de pagos en CxC) | Via pagos registrados en CxC |
| - | **Anulada** | Gestor/Admin | Anula (no se cuenta en acumulado) | - |

### 2.2 Calculo Automatico
```
Subtotal = Monto Valorización - Descuento Comercial - Adelanto
IGV = Subtotal × 18%
Fondo Garantía = Subtotal × %
Neto a Recibir = Subtotal + IGV - Fondo Garantía
```

El sistema calcula automaticamente: acumulado anterior, acumulado actual, saldo por valorizar y % avance.

### 2.3 Preguntas para Administracion

> **P1.** Cuando el gestor les avisa que el cliente aprobó una valorización, ¿cómo se enteran ustedes? ¿Email, WhatsApp, llamada?

> **P2.** ¿Quién decide el N° de factura? ¿Tienen correlativo? ¿Lo sacan de un sistema de facturación electrónica (SUNAT)?

> **P3.** ¿Cuánto tiempo pasa entre que el cliente aprueba y ustedes emiten la factura?

> **P4.** ¿Cómo hacen seguimiento de las facturas emitidas pendientes de cobro? ¿Excel, cuaderno, memoria?

> **P5.** ¿Llevan control del fondo de garantía retenido? ¿Cuándo y cómo lo recuperan?

> **P6.** ¿Manejan detracciones? ¿En qué porcentaje? ¿Cómo registran el pago parcial (detraccion + neto)?

### 2.4 Puntos de Auditoria

- [ ] ¿Existen valorizaciones aprobadas por el cliente que nunca se facturaron?
- [ ] ¿El tiempo entre aprobacion y facturacion es razonable (< 5 dias)?
- [ ] ¿Hay facturas vencidas sin gestión de cobranza?
- [ ] ¿Los montos de fondo de garantía están controlados y se recuperan?

---

## 3. FLUJO DE ORDENES DE COMPRA + CxP

### 3.1 Estados de Orden de Compra

| # | Estado | Quien | Accion |
|---|--------|-------|--------|
| 1 | **Borrador** | Logístico | Crea OC con items, proveedor, montos |
| 2 | **Aprobada** | Gerencia | Revisa y aprueba la OC |
| 3 | **Enviada** | Logístico | Envia al proveedor |
| 4 | **Confirmada** | Logístico | Proveedor confirma, se establece fecha entrega estimada |
| 5 | **Parcial** | Logístico | Recepcion parcial (algunos items) |
| 6 | **Completada** | Logístico | Todos los items recibidos |
| - | **Cancelada** | Cualquiera | Se cancela (solo desde borrador/aprobada) |

### 3.2 Creacion de Cuenta por Pagar

La CxP se crea **manualmente** cuando Administración recibe la factura del proveedor.

```
OC Confirmada/Completada
        |
        | Admin recibe factura del proveedor
        v
Nueva CxP (pre-llena: proveedor, monto, moneda, proyecto, condicion pago)
        |
        | Registra pagos
        v
CxP Pagada
```

**El sistema muestra un banner "OCs sin factura registrada"** como recordatorio: OCs confirmadas/completadas que no tienen CxP vinculada.

### 3.3 Datos de la CxP

| Campo | Descripcion | Fuente |
|-------|-------------|--------|
| Proveedor | Quien nos factura | Auto desde OC o manual |
| N° Factura | Numero del comprobante del proveedor | Manual |
| Monto | Importe de la factura | Auto desde OC (ajustable) |
| Moneda | PEN o USD | Auto desde OC |
| Fecha Recepcion | Cuando recibimos la factura | Manual |
| Fecha Vencimiento | Cuando debemos pagar | Manual |
| Condicion de Pago | Contado, 15, 30, 45, 60, 90 dias | Auto desde OC |
| Proyecto | A que proyecto se imputa | Auto desde OC |
| OC vinculada | Referencia a la orden de compra | Auto |

### 3.4 Preguntas para Administracion

> **P7.** Cuando logística recibe material, ¿cómo les llega la factura del proveedor? ¿Física, email, portal SUNAT?

> **P8.** ¿Verifican que la factura del proveedor coincida con la OC (proveedor, montos, items)?

> **P9.** ¿Cuántas facturas de proveedores reciben al mes aproximadamente?

> **P10.** ¿Han tenido casos de facturas de proveedores que no corresponden a ninguna OC? ¿Qué hacen?

> **P11.** ¿Cómo controlan las fechas de vencimiento de pago? ¿Alguna vez han pagado con mora?

> **P12.** ¿Manejan retenciones de IGV? ¿Cómo las registran?

> **P13.** ¿Un proveedor puede enviar varias facturas para una misma OC? (Ej: entrega parcial, factura parcial)

### 3.5 Puntos de Auditoria

- [ ] ¿Hay OCs completadas hace mas de 15 dias sin CxP registrada?
- [ ] ¿Las facturas del proveedor coinciden en monto con la OC?
- [ ] ¿Existen CxP vencidas sin pago programado?
- [ ] ¿Se respetan las condiciones de pago pactadas?

---

## 4. FLUJO DE GASTOS OPERATIVOS (Requerimientos de Dinero)

### 4.1 Flujo Completo

```
SIN ANTICIPO:
Borrador → Enviado → Aprobado → Rendido → Validado → Cerrado
(empleado)  (emp)    (jefe)    (emp)     (admin)    (admin)

CON ANTICIPO:
Borrador → Enviado → Aprobado → Depositado → Rendido → Validado → Cerrado
(empleado)  (emp)    (jefe)     (admin)      (emp)     (admin)    (admin)
```

### 4.2 Estados y Responsables

| # | Estado | Quien | Accion | Notas |
|---|--------|-------|--------|-------|
| 1 | **Borrador** | Empleado | Crea requerimiento: motivo, monto, proyecto/CC | N° auto: REQ-YYMMDD-001 |
| 2 | **Enviado** | Empleado | Envia para aprobacion | Se notifica al aprobador |
| 3 | **Aprobado** | Jefe/Gestor | Revisa y aprueba | Si no: rechaza con comentario |
| 4 | **Depositado** | Admin | Deposita anticipo al empleado | Solo si `requiereAnticipo = true` |
| 5 | **Rendido** | Empleado | Adjunta boletas/facturas con sus líneas de gasto | Mínimo 1 línea con adjunto |
| 6 | **Validado** | Admin | Verifica conformidad de cada línea | Todas deben ser "conforme" |
| 7 | **Cerrado** | Admin | Cierra el requerimiento | Calcula saldo final |

### 4.3 Datos por Linea de Gasto

Cada línea de gasto registra:
- Descripcion del gasto
- Fecha del gasto
- Monto y moneda
- Tipo de comprobante (boleta, factura, recibo)
- Numero de comprobante
- Proveedor (nombre + RUC)
- Verificacion SUNAT (automatica via API Decolecta)
- Adjunto (foto/scan del comprobante)
- Conformidad: conforme / no conforme / pendiente

### 4.4 Calculo de Saldo

```
Monto Depositado (anticipo)     = S/ X,XXX
(-) Total Gastado (sum líneas)  = S/ X,XXX
(=) Saldo                       = S/ X,XXX  (positivo: devuelve, negativo: reembolsar)
```

### 4.5 Preguntas para Administracion

> **P14.** ¿Cuántos requerimientos de dinero procesan al mes?

> **P15.** ¿Cómo se hace el deposito del anticipo? ¿Transferencia, efectivo? ¿A qué cuenta?

> **P16.** ¿Cuánto tiempo se le da al empleado para rendir desde que recibe el anticipo?

> **P17.** ¿Qué hacen cuando un empleado no rinde a tiempo?

> **P18.** ¿Cómo verifican que los comprobantes (boletas/facturas) sean legítimos? ¿Consultan SUNAT?

> **P19.** Cuando una línea de gasto es "no conforme", ¿qué pasa? ¿El empleado asume el gasto?

> **P20.** ¿Cómo manejan el saldo? Si el empleado gastó menos, ¿devuelve efectivo o se descuenta?

> **P21.** Si el empleado gastó más de lo depositado, ¿cómo le reembolsan?

### 4.6 Puntos de Auditoria

- [ ] ¿Hay requerimientos aprobados hace mas de 7 dias sin deposito?
- [ ] ¿Hay anticipos depositados hace mas de 30 dias sin rendicion?
- [ ] ¿Se valida SUNAT en todos los comprobantes?
- [ ] ¿El % de líneas "no conforme" es alto? (indica falta de capacitacion)

---

## 5. CUENTAS BANCARIAS

### 5.1 Datos Registrados

| Campo | Ejemplo |
|-------|---------|
| Banco | BCP, BBVA, Interbank, Scotiabank |
| N° Cuenta | 191-12345678-0-12 |
| CCI | 00219100123456780012 |
| Tipo | Corriente / Ahorro |
| Moneda | PEN / USD |
| Estado | Activa / Inactiva |
| Descripcion | "BCP Soles - Operaciones" |

### 5.2 Uso en el Sistema

- Al registrar pagos de CxC (cobros)
- Al registrar pagos de CxP (desembolsos)
- Referencia para depositos de anticipo

### 5.3 Preguntas para Administracion

> **P22.** ¿Cuántas cuentas bancarias manejan? ¿En qué bancos?

> **P23.** ¿Tienen cuentas separadas por moneda (soles y dolares)?

> **P24.** ¿Llevan conciliacion bancaria? ¿Con qué frecuencia?

> **P25.** ¿Necesitan ver saldos bancarios en el sistema o eso lo ven en el banco directamente?

---

## 6. DASHBOARD DE ADMINISTRACION

### 6.1 Metricas Actuales

El dashboard muestra en tiempo real:

| Indicador | Detalle |
|-----------|---------|
| **CxC Pendiente** | Total por cobrar separado PEN / USD |
| **CxC Vencidas** | Top 10 facturas vencidas con cliente y proyecto |
| **CxP Pendiente** | Total por pagar separado PEN / USD |
| **CxP Vencidas** | Monto vencido PEN / USD |
| **CxP Proximas** | Facturas que vencen en los proximos 7 dias |
| **Balance** | CxC - CxP por moneda (lo que nos deben vs lo que debemos) |
| **Cuentas Bancarias** | Lista de cuentas activas |

### 6.2 Preguntas para Administracion

> **P26.** ¿Qué informacion necesitan ver al iniciar el dia? ¿Qué es lo primero que revisan?

> **P27.** ¿Necesitan algun indicador adicional? (Ej: flujo de caja proyectado, aging de cartera)

> **P28.** ¿Con qué frecuencia reportan a gerencia? ¿Qué datos incluye ese reporte?

---

## 7. FLUJOS CRUZADOS - VISION INTEGRADA

### 7.1 Ciclo de Ingresos (Proyecto → Cobro)

```
1. Gestor crea VALORIZACION con monto del periodo
2. Gestor envia al cliente
3. Cliente aprueba
4. Admin ve en "Facturación" las valorizaciones aprobadas pendientes
5. Admin factura: ingresa N° factura → se crea CxC automaticamente
6. Admin hace seguimiento de cobro en "Cuentas por Cobrar"
7. Cliente paga → Admin registra pago con cuenta bancaria
8. CxC pasa a "pagada" cuando saldo = 0
```

### 7.2 Ciclo de Egresos (Compra → Pago)

```
1. Logístico crea ORDEN DE COMPRA con items y proveedor
2. Gerencia aprueba la OC
3. Logístico envia al proveedor y confirma
4. Proveedor entrega material → logístico registra recepcion
5. Proveedor envia factura → Admin ve en "OCs sin factura"
6. Admin crea CxP vinculando a la OC (pre-llena datos)
7. Admin programa pago segun condicion de pago
8. Admin registra pago con cuenta bancaria
9. CxP pasa a "pagada"
```

### 7.3 Ciclo de Gastos Operativos

```
1. Empleado crea REQUERIMIENTO de dinero
2. Jefe/Gestor aprueba
3. Admin deposita anticipo (si aplica)
4. Empleado ejecuta gastos en campo
5. Empleado rinde: sube comprobantes con foto
6. Sistema verifica SUNAT automaticamente
7. Admin valida conformidad linea por linea
8. Admin cierra → calcula saldo (devolucion o reembolso)
```

---

## 8. COMPARATIVA: PROCESO MANUAL vs SISTEMA

| Aspecto | Proceso Manual (Excel/papel) | Sistema GySControl |
|---------|------------------------------|-------------------|
| **Seguimiento valorizaciones** | Excel con fechas, estados manuales | Estados automaticos, banner de pendientes |
| **Facturacion** | Depende de que alguien avise | Pagina dedicada con valorizaciones aprobadas pendientes |
| **Control CxC** | Excel de facturas emitidas | Tabla con filtros, alertas de vencimiento, pagos parciales |
| **Control CxP** | Excel de facturas recibidas | Banner de OCs sin factura, pre-llenado automatico |
| **Gastos operativos** | Cuaderno, fotos por WhatsApp | App con flujo completo, verificacion SUNAT, adjuntos |
| **Rendicion de gastos** | Revisar boletas fisicas | Digital con conformidad por linea, validacion SUNAT |
| **Reportes a gerencia** | Armar Excel cada vez | Dashboard en tiempo real |
| **Vencimientos** | Recordar o revisar Excel | Alertas automaticas, banner de proximos a vencer |
| **Conciliacion OC-Factura** | Comparar documentos fisicos | Vinculo OC-CxP con pre-llenado |

---

## 9. CHECKLIST PARA LA REUNION

### Antes de empezar
- [ ] Pedir que muestren su Excel/herramienta actual de control
- [ ] Preguntar cuantas personas trabajan en el area
- [ ] Preguntar quien hace qué (roles internos)

### Durante la reunion
- [ ] Recorrer cada flujo (secciones 2-4) con las preguntas
- [ ] Anotar excepciones y casos especiales que mencionan
- [ ] Identificar "puntos de dolor" (donde pierden tiempo, donde cometen errores)
- [ ] Preguntar por el volumen (cuantas valorizaciones/facturas/requerimientos al mes)

### Despues de la reunion
- [ ] Priorizar las mejoras segun impacto vs esfuerzo
- [ ] Documentar excepciones que el sistema no cubre aun
- [ ] Planificar capacitacion del equipo en el nuevo sistema

---

## 10. POSIBLES MEJORAS FUTURAS (para evaluar)

| Mejora | Impacto | Complejidad |
|--------|---------|-------------|
| Integrar con facturacion electronica SUNAT | Alto | Alta |
| Alertas por email/WhatsApp de vencimientos | Alto | Media |
| Flujo de caja proyectado (cashflow forecast) | Alto | Media |
| Aging de cartera (CxC por antiguedad) | Medio | Baja |
| Auto-crear CxP al confirmar recepcion OC | Medio | Baja |
| Conciliacion bancaria basica | Alto | Alta |
| Reporte P&L por proyecto | Alto | Media |
| Control de detracciones/retenciones | Medio | Media |
