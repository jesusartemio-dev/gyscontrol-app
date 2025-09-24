const fetch = require('node-fetch');

async function testCronogramaAPI() {
  try {
    console.log('🔍 Testing API: /api/proyectos/cmfwlrnp30001l8j0ioz97ka6/cronograma');

    const response = await fetch('http://localhost:3001/api/proyectos/cmfwlrnp30001l8j0ioz97ka6/cronograma');
    const data = await response.json();

    console.log('📡 Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testCronogramaAPI();