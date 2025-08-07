
const http = require('http');

console.log('🔍 Testing Redirect Loop Prevention...\n');

// Helper function to make HTTP requests
function makeRequest(path, followRedirects = false, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Node.js Test Client'
      }
    };

    let redirectCount = 0;
    let requestHistory = [];

    function doRequest(currentPath) {
      const req = http.request({...options, path: currentPath}, (res) => {
        requestHistory.push({
          path: currentPath,
          statusCode: res.statusCode,
          location: res.headers.location || null,
          redirectCount
        });

        if (followRedirects && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            resolve({
              finalStatus: res.statusCode,
              redirectCount,
              history: requestHistory,
              error: 'Max redirects exceeded'
            });
            return;
          }
          
          // Follow redirect
          let nextPath = res.headers.location;
          if (nextPath.startsWith('http://localhost:3000')) {
            nextPath = nextPath.replace('http://localhost:3000', '');
          }
          
          setTimeout(() => doRequest(nextPath), 100); // Small delay
        } else {
          resolve({
            finalStatus: res.statusCode,
            redirectCount,
            history: requestHistory,
            headers: res.headers
          });
        }
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    }

    doRequest(path);
  });
}

async function runTests() {
  const tests = [
    {
      name: 'Root path access (should redirect to login)',
      path: '/',
      followRedirects: true
    },
    {
      name: 'Login page access (should load normally)', 
      path: '/login',
      followRedirects: false
    },
    {
      name: 'Dashboard access (should redirect to login)',
      path: '/dashboard',
      followRedirects: true
    },
    {
      name: 'Login with root redirect param (potential loop)',
      path: '/login?redirect=%2F',
      followRedirects: false
    }
  ];

  for (const test of tests) {
    try {
      console.log(`\n🧪 Test: ${test.name}`);
      console.log(`   Path: ${test.path}`);
      
      const result = await makeRequest(test.path, test.followRedirects);
      
      console.log(`   Final Status: ${result.finalStatus}`);
      console.log(`   Redirect Count: ${result.redirectCount}`);
      
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`);
      } else if (result.redirectCount === 0) {
        console.log(`   ✅ No redirects - page loads directly`);
      } else if (result.redirectCount <= 2) {
        console.log(`   ✅ Normal redirect behavior (${result.redirectCount} redirects)`);
      } else {
        console.log(`   ⚠️ Multiple redirects detected (${result.redirectCount})`);
      }
      
      if (result.history && result.history.length > 1) {
        console.log('   Redirect chain:');
        result.history.forEach((step, i) => {
          console.log(`     ${i + 1}. ${step.path} → ${step.statusCode} ${step.location ? `→ ${step.location}` : ''}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
    }
  }
  
  console.log('\n📊 REDIRECT LOOP PREVENTION TEST RESULTS:');
  console.log('==========================================');
  console.log('If no "Max redirects exceeded" errors appear above,');
  console.log('then the redirect loop prevention is working correctly!');
  
  console.log('\n🎯 Expected behavior:');
  console.log('- Root path (/) should redirect to /login (1-2 redirects max)');
  console.log('- Login page should load directly (0 redirects)');
  console.log('- Dashboard should redirect to /login (1-2 redirects max)');
  console.log('- No infinite redirect loops should occur');
}

runTests().catch(console.error);
