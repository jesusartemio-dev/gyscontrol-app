// Script para debuggear el problema del proveedor
// Ejecutar en la consola del navegador en la página de proveedores

console.log('🔍 Debugging proveedor creation...');

// Test 1: Verificar si la API está disponible
fetch('/api/proveedor')
  .then(response => {
    console.log('✅ API GET response:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('📊 Current providers:', data);
  })
  .catch(error => {
    console.error('❌ API GET error:', error);
  });

// Test 2: Intentar crear un proveedor
const testProvider = {
  nombre: 'Debug Test Provider',
  ruc: '20999888777'
};

fetch('/api/proveedor', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testProvider),
})
  .then(response => {
    console.log('✅ API POST response:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('🎉 Created provider:', data);
  })
  .catch(error => {
    console.error('❌ API POST error:', error);
  });

// Test 3: Verificar el estado del formulario
setTimeout(() => {
  const form = document.querySelector('form');
  if (form) {
    console.log('📝 Form found:', form);
    const inputs = form.querySelectorAll('input');
    console.log('🔤 Form inputs:', inputs.length);
    inputs.forEach((input, index) => {
      console.log(`Input ${index}:`, input.name, input.value);
    });
  } else {
    console.log('❌ No form found');
  }
}, 1000);

console.log('🏁 Debug script completed. Check the results above.');