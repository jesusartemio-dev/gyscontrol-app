// Script de prueba para la API de importación de clientes
const testData = [
  {
    codigo: "TEST001",
    nombre: "Cliente de Prueba 1",
    ruc: "12345678901",
    direccion: "Av. Test 123",
    telefono: "987654321",
    correo: "test1@example.com"
  },
  {
    codigo: "TEST002",
    nombre: "Cliente de Prueba 2",
    ruc: "10987654321",
    direccion: "Jr. Prueba 456",
    telefono: "123456789",
    correo: "test2@example.com"
  }
];

async function testImport() {
  try {
    console.log('🧪 Testing client import API...');
    
    const response = await fetch('http://localhost:3000/api/cliente/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientes: testData })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.text();
    console.log('Response body:', result);
    
    if (response.ok) {
      console.log('✅ Import successful!');
    } else {
      console.log('❌ Import failed!');
    }
  } catch (error) {
    console.error('🚨 Test error:', error);
  }
}

testImport();