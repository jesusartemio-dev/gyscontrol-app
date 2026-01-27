// Script to analyze Prisma migrations history
const { PrismaClient } = require('@prisma/client');

async function analyzeMigrations() {
  const prisma = new PrismaClient();
  
  try {
    // Query the _prisma_migrations table
    const migrations = await prisma.$queryRaw`
      SELECT 
        id,
        migration_name,
        started_at,
        finished_at,
        logs,
        CASE 
          WHEN finished_at > NOW() - INTERVAL '1 month' THEN 'Recent (Last Month)'
          WHEN finished_at > NOW() - INTERVAL '3 months' THEN 'Recent (Last 3 Months)'
          ELSE 'Older'
        END as time_category
      FROM "_prisma_migrations" 
      ORDER BY finished_at DESC
    `;
    
    console.log('\n=== PRISMA MIGRATIONS HISTORY ===\n');
    console.log(`Found ${migrations.length} migrations applied:\n`);
    
    migrations.forEach((migration, index) => {
      console.log(`${index + 1}. ${migration.migration_name}`);
      console.log(`   Started: ${migration.started_at}`);
      console.log(`   Finished: ${migration.finished_at}`);
      console.log(`   Category: ${migration.time_category}`);
      console.log(`   Log snippet: ${migration.logs?.substring(0, 200) || 'No logs'}...`);
      console.log('   ---');
    });
    
    // Check for recent migrations (last month)
    const recentMigrations = migrations.filter(m => 
      m.time_category.includes('Recent')
    );
    
    if (recentMigrations.length > 0) {
      console.log(`\n⚠️  RECENT MIGRATIONS (Potential problem sources):`);
      recentMigrations.forEach(m => {
        console.log(`   - ${m.migration_name} (${m.finished_at})`);
      });
    }
    
  } catch (error) {
    console.error('Error analyzing migrations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeMigrations();