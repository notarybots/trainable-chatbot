
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Next.js development server...');

// Kill any existing processes
try {
  const { execSync } = require('child_process');
  execSync('pkill -f "next dev" || true', { stdio: 'ignore' });
  console.log('🧹 Cleaned up existing processes');
} catch (e) {
  // Ignore errors
}

// Change to project directory
process.chdir(__dirname);

// Start the development server
const server = spawn('yarn', ['dev'], {
  stdio: 'pipe',
  env: { ...process.env, PORT: '3002' }
});

let serverReady = false;
let startupTimeout;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(output.trim());
  
  if (output.includes('Ready in') || output.includes('localhost:')) {
    if (!serverReady) {
      serverReady = true;
      console.log('\n✅ Server is ready!');
      console.log('🌐 Open http://localhost:3002 in your browser');
      console.log('👤 Login with: john@doe.com / johndoe123');
      clearTimeout(startupTimeout);
    }
  }
});

server.stderr.on('data', (data) => {
  const error = data.toString();
  if (!error.includes('webpack') && !error.includes('Attention')) {
    console.error('❌ Error:', error.trim());
  }
});

server.on('close', (code) => {
  console.log(`\n🔄 Server process exited with code ${code}`);
});

// Set a timeout for server startup
startupTimeout = setTimeout(() => {
  if (!serverReady) {
    console.log('\n⏰ Server is taking longer than expected to start...');
    console.log('📋 Check the output above for any errors');
  }
}, 30000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.kill();
  process.exit(0);
});
