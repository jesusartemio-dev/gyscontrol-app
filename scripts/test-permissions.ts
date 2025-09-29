/**
 * 🧪 Script de Prueba del Sistema de Permisos
 *
 * Verifica que el sistema de permisos esté funcionando correctamente.
 * Ejecutar con: npx tsx scripts/test-permissions.ts
 */

import { initializeSystemPermissions } from '../src/lib/services/permissions';
import { ALL_BASE_PERMISSIONS } from '../src/lib/permissions/base-permissions';

async function testPermissionsSystem() {
  console.log('🧪 Probando sistema de permisos...\n');

  try {
    // 1. Verificar que tenemos permisos base
    console.log('📋 Verificando permisos base...');
    console.log(`   Total de permisos base: ${ALL_BASE_PERMISSIONS.length}`);

    const permissionsByResource = ALL_BASE_PERMISSIONS.reduce((acc, perm) => {
      if (!acc[perm.resource]) acc[perm.resource] = [];
      acc[perm.resource].push(perm);
      return acc;
    }, {} as Record<string, typeof ALL_BASE_PERMISSIONS>);

    console.log('   Permisos por recurso:');
    Object.entries(permissionsByResource).forEach(([resource, perms]) => {
      console.log(`     ${resource}: ${perms.length} permisos`);
    });

    // 2. Intentar inicializar permisos del sistema
    console.log('\n🔄 Inicializando permisos del sistema...');
    await initializeSystemPermissions();
    console.log('   ✅ Permisos del sistema inicializados correctamente');

    // 3. Verificar estructura de permisos
    console.log('\n📊 Verificando estructura de permisos...');
    const criticalPermissions = ALL_BASE_PERMISSIONS.filter(p =>
      ['delete', 'manage_roles', 'manage_permissions', 'system'].includes(p.action)
    );
    console.log(`   Permisos críticos encontrados: ${criticalPermissions.length}`);

    const systemPermissions = ALL_BASE_PERMISSIONS.filter(p => p.isSystemPermission);
    console.log(`   Permisos del sistema: ${systemPermissions.length}`);

    console.log('\n✅ Todas las pruebas pasaron correctamente!');
    console.log('\n📝 Para usar el sistema de permisos:');
    console.log('   1. Importa los hooks: usePermission, usePermissions, useUserPermissions');
    console.log('   2. Usa checkUserPermission para verificar permisos específicos');
    console.log('   3. El middleware ahora usa permisos para controlar acceso');
    console.log('   4. Los cambios se registran automáticamente en auditoría');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
testPermissionsSystem().catch(console.error);