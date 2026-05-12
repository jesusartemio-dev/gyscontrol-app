// ═══════════════════════════════════════════════════════════════
// Test de generación IPERC con IA — proyecto CJM39
// Pegar en consola del browser estando logueado en app.gyscontrol.com
// ═══════════════════════════════════════════════════════════════

const PROYECTO_ID = '60ff07f0-d438-4d2d-b928-cd50741581a9';

// Limpiar IPERC previo si existe
const existente = await fetch(`/api/proyectos/${PROYECTO_ID}/iperc`).then(r => r.json());
if (existente.data) {
  console.log('Eliminando IPERC previo...');
  await fetch(`/api/proyectos/${PROYECTO_ID}/iperc`, { method: 'DELETE' });
  console.log('Eliminado OK');
}

// Crear IPERC nuevo
const creado = await fetch(`/api/proyectos/${PROYECTO_ID}/iperc`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    codigoDocumento: 'GYS-CJM39-IPERC-001',
    area: 'INSTALACIONES',
    evaluadores: [{ nombre: 'Ing. Yony Apaza Arpasi', cargo: 'Supervisor SSOMA' }]
  })
}).then(r => r.json());

console.log('IPERC creado:', creado);
if (creado.error) { throw new Error('No se pudo crear el IPERC: ' + creado.error + ' — ' + JSON.stringify(creado.faltantes)); }

// Iniciar generación con IA
console.log('Iniciando generación con IA...');
const startTime = Date.now();

const response = await fetch(`/api/proyectos/${PROYECTO_ID}/iperc/generar-ia`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});

if (!response.ok && response.status !== 200) {
  const err = await response.json().catch(() => ({}));
  throw new Error(`HTTP ${response.status}: ${JSON.stringify(err)}`);
}

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = '';
const eventos = [];

while (true) {
  const { value, done } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split('\n');
  buffer = lines.pop();

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      const eventName = line.slice(7).trim();
      eventos.push({ _event: eventName });
    }
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (eventos.length > 0) {
          Object.assign(eventos[eventos.length - 1], data);
        }
        const t = ((Date.now() - startTime) / 1000).toFixed(1);
        const ev = eventos[eventos.length - 1]?._event ?? '?';
        // Imprimir todo excepto filas_parciales (muy verboso)
        if (ev !== 'filas_parciales') {
          console.log(`[${t}s] ${ev}`, data);
        } else {
          console.log(`[${t}s] filas_parciales — ${data.filas?.length ?? 0} filas`);
        }
      } catch {}
    }
  }
}

const duracion = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✅ Terminó en ${duracion}s — Total eventos: ${eventos.length}`);
window._ipercEventos = eventos;

// Verificar resultados
const final = await fetch(`/api/proyectos/${PROYECTO_ID}/iperc`).then(r => r.json());
const filas = final.data?.filas ?? [];
console.log(`\nFilas generadas: ${filas.length}`);

if (filas.length > 0) {
  console.log('\nPrimera fila:', filas[0]);
  console.log('Última fila:', filas.at(-1));

  const porFactor = {};
  for (const f of filas) {
    porFactor[f.factorRiesgo] = (porFactor[f.factorRiesgo] || 0) + 1;
  }
  console.log('\nDistribución por factor de riesgo:');
  console.table(porFactor);

  const porNivel = { ALTO: 0, MEDIO: 0, BAJO: 0 };
  const MATRIZ = {'1A':1,'1B':2,'2A':3,'1C':4,'2B':5,'3A':6,'1D':7,'2C':8,'3B':9,'4A':10,'1E':11,'2D':12,'3C':13,'4B':14,'5A':15,'2E':16,'3D':17,'4C':18,'5B':19,'3E':20,'4D':21,'5C':22,'4E':23,'5D':24,'5E':25};
  for (const f of filas) {
    const v = MATRIZ[`${f.severidad}${f.probabilidad}`] ?? 99;
    if (v <= 8) porNivel.ALTO++;
    else if (v <= 15) porNivel.MEDIO++;
    else porNivel.BAJO++;
  }
  console.log('\nDistribución por nivel de riesgo inicial:');
  console.table(porNivel);
}
