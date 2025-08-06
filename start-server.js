
// Start development server with proper error handling
const { spawn } = require('child_process');

function startDevServer() {
  console.log('\n🚀 STARTING TRAINABLE CHATBOT DEVELOPMENT SERVER');
  console.log('='.repeat(60));

  const server = spawn('npm', ['run', 'dev'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '3000' }
  });

  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(output);
    
    // Check for successful startup
    if (output.includes('Local:') || output.includes('localhost:3000')) {
      console.log('\n🎉 SERVER STARTED SUCCESSFULLY!');
      console.log('📧 Login with: demo@example.com / demo123');
      console.log('🌐 Access: http://localhost:3000');
    }
  });

  server.stderr.on('data', (data) => {
    const error = data.toString();
    if (!error.includes('Warning:') && !error.includes('Node.js API')) {
      console.error('❌ Error:', error);
    }
  });

  server.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.kill();
    process.exit(0);
  });

  return server;
}

// Start the server
console.log('⏳ Starting server...');
startDevServer();
