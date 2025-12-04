const { Client } = require('pg');

async function checkTablesDirect() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos');

    // Verificar si las tablas existen
    const tables = ['CalendarioLaboral', 'DiaCalendario', 'ExcepcionCalendario', 'ConfiguracionCalendario'];

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
        console.log(`${table}: ${result.rows[0].count} registros`);
      } catch (error) {
        console.log(`${table}: Tabla no existe - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
  } finally {
    await client.end();
  }
}

checkTablesDirect();