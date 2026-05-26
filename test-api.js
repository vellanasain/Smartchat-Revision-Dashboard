/**
 * Test script to verify Laravel API endpoint returns data
 * Run with: node test-api.js
 */

async function testLaravelAPI() {
  const revisionId = 1381;
  const urls = [
    `http://127.0.0.1:8000/api/revisions/${revisionId}/detail-bootstrap`,
    `http://127.0.0.1:8080/api/revisions/${revisionId}/detail-bootstrap`,
    `http://localhost:8000/api/revisions/${revisionId}/detail-bootstrap`,
    `http://localhost:8080/api/revisions/${revisionId}/detail-bootstrap`,
  ];

  for (const url of urls) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${url}`);
    console.log('='.repeat(60));
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log(`Status: ${response.status}`);
      
      if (!response.ok) {
        console.log('Response NOT OK');
        const text = await response.text();
        console.log('Response body:', text.substring(0, 200));
        continue;
      }

      const data = await response.json();
      
      console.log('✓ Response received successfully');
      console.log('\nResponse structure:');
      console.log('  - csrf_token:', data.csrf_token ? '✓ present' : '✗ missing');
      console.log('  - domain:', data.domain || 'empty');
      console.log('  - rows:', Array.isArray(data.rows) ? `✓ array with ${data.rows.length} items` : '✗ not an array');
      
      if (Array.isArray(data.rows) && data.rows.length > 0) {
        console.log('\n  Rows content:');
        data.rows.forEach((row, i) => {
          console.log(`    R${row.jenis}: stage="${row.stage}", work="${row.work}", note="${row.note}"`);
        });
      }
      
      console.log('\n  project_info:');
      if (data.project_info) {
        Object.entries(data.project_info).forEach(([key, value]) => {
          console.log(`    - ${key}: ${value || '(empty)'}`);
        });
      }
      
      console.log('\n  project_notes:');
      if (data.project_notes) {
        Object.entries(data.project_notes).forEach(([key, value]) => {
          console.log(`    - ${key}: ${value || '(empty)'}`);
        });
      }
      
      // If successful, break out of loop
      break;
      
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }
  }
}

testLaravelAPI().catch(console.error);
