
const fs = require('fs');

function addDebugLogging() {
  console.log('🔧 Adding debug logging to chat components...\n');
  
  // 1. Add debug logging to chat-container.tsx
  console.log('1️⃣  Adding debug logging to chat-container.tsx...');
  
  let chatContainer = fs.readFileSync('components/chat/chat-container.tsx', 'utf8');
  
  // Add debug logging to createNewConversation function
  if (!chatContainer.includes('console.log(\'🆕 createNewConversation called\')')) {
    chatContainer = chatContainer.replace(
      'const createNewConversation = async (): Promise<Conversation | null> => {',
      `const createNewConversation = async (): Promise<Conversation | null> => {
    console.log('🆕 createNewConversation called');`
    );
  }
  
  // Add debug logging to sendMessage function
  if (!chatContainer.includes('console.log(\'📤 sendMessage called with:\', content)')) {
    chatContainer = chatContainer.replace(
      'const sendMessage = async (content: string) => {',
      `const sendMessage = async (content: string) => {
    console.log('📤 sendMessage called with:', content);`
    );
  }
  
  // Add debug logging for disabled state
  if (!chatContainer.includes('console.log(\'🔒 MessageInput disabled state:\')')) {
    chatContainer = chatContainer.replace(
      'disabled={chatState === \'processing\' || loading || !isAuthenticated || sessionError}',
      `disabled={(() => {
            const isDisabled = chatState === 'processing' || loading || !isAuthenticated || sessionError;
            console.log('🔒 MessageInput disabled state:', {
              chatState,
              loading,
              isAuthenticated,
              sessionError,
              disabled: isDisabled
            });
            return isDisabled;
          })()}`
    );
  }
  
  fs.writeFileSync('components/chat/chat-container.tsx', chatContainer);
  console.log('✅ Added debug logging to chat-container.tsx');
  
  // 2. Add debug logging to message-input.tsx
  console.log('\n2️⃣  Adding debug logging to message-input.tsx...');
  
  let messageInput = fs.readFileSync('components/chat/message-input.tsx', 'utf8');
  
  // Add debug logging to handleSend function
  if (!messageInput.includes('console.log(\'📨 handleSend called with:\', message.trim())')) {
    messageInput = messageInput.replace(
      'const handleSend = () => {',
      `const handleSend = () => {
    console.log('📨 handleSend called with:', message.trim());
    console.log('📨 handleSend state:', { disabled, isLoading });`
    );
  }
  
  // Add debug logging to handleKeyPress function
  if (!messageInput.includes('console.log(\'⌨️ handleKeyPress - Enter pressed\')')) {
    messageInput = messageInput.replace(
      'if (e.key === \'Enter\' && !e.shiftKey) {',
      `if (e.key === 'Enter' && !e.shiftKey) {
      console.log('⌨️ handleKeyPress - Enter pressed');`
    );
  }
  
  // Add debug logging for props
  if (!messageInput.includes('console.log(\'🎛️ MessageInput props:\')')) {
    messageInput = messageInput.replace(
      'export function MessageInput({ onSendMessage, disabled = false, isLoading = false }: MessageInputProps) {',
      `export function MessageInput({ onSendMessage, disabled = false, isLoading = false }: MessageInputProps) {
  console.log('🎛️ MessageInput props:', { disabled, isLoading });`
    );
  }
  
  fs.writeFileSync('components/chat/message-input.tsx', messageInput);
  console.log('✅ Added debug logging to message-input.tsx');
  
  // 3. Add debug logging to session-sidebar.tsx
  console.log('\n3️⃣  Adding debug logging to session-sidebar.tsx...');
  
  let sessionSidebar = fs.readFileSync('components/chat/session-sidebar.tsx', 'utf8');
  
  // Add debug logging to New Chat button click
  if (!sessionSidebar.includes('console.log(\'🆕 New Chat button clicked\')')) {
    sessionSidebar = sessionSidebar.replace(
      'onClick={onNewChat}',
      `onClick={() => {
              console.log('🆕 New Chat button clicked');
              onNewChat();
            }}`
    );
  }
  
  fs.writeFileSync('components/chat/session-sidebar.tsx', sessionSidebar);
  console.log('✅ Added debug logging to session-sidebar.tsx');
  
  console.log('\n4️⃣  Creating user-friendly test instructions...');
  
  const testInstructions = `
# 🧪 Chat Functionality Debug Instructions

After adding debug logging, follow these steps:

## Step 1: Access the Application
1. Open http://localhost:3000 in your browser
2. Login with credentials: john@doe.com / johndoe123

## Step 2: Open Developer Tools
1. Press F12 or right-click and select "Inspect"
2. Go to the "Console" tab
3. Clear the console (click the clear button)

## Step 3: Test New Chat Button
1. Look for the "New Chat" button in the sidebar
2. Click it
3. Check the console for these logs:
   - 🆕 New Chat button clicked
   - 🆕 createNewConversation called
   - Network requests to /api/conversations

## Step 4: Test Message Sending
1. Look for the message input at the bottom
2. Check console for props log: 🎛️ MessageInput props
3. Check if input is disabled: 🔒 MessageInput disabled state
4. Type a test message: "Hello, this is a test"
5. Press Enter and check console for:
   - ⌨️ handleKeyPress - Enter pressed
   - 📨 handleSend called with: Hello, this is a test
   - 📤 sendMessage called with: Hello, this is a test
6. Try clicking the Send button instead

## Step 5: Check Network Activity
1. Go to "Network" tab in dev tools
2. Filter by "Fetch/XHR"
3. Repeat the tests above
4. Look for requests to:
   - /api/conversations (for new chat)
   - /api/chat (for sending messages)

## Expected Behavior
- New Chat button should create API request and add new conversation
- Message input should not be disabled when authenticated
- Enter key and Send button should both trigger message sending
- Chat API should return streaming response

## Troubleshooting
If no logs appear:
- Check if JavaScript is enabled
- Verify you're logged in (check for authentication state logs)
- Look for any red error messages in console

If logs appear but API fails:
- Check HTTP status codes in Network tab
- Verify authentication token is being sent
- Check server logs for backend errors
`;
  
  fs.writeFileSync('DEBUG_INSTRUCTIONS.md', testInstructions);
  console.log('✅ Created DEBUG_INSTRUCTIONS.md');
  
  console.log('\n🎉 Debug logging setup complete!');
  console.log('Next steps:');
  console.log('1. Restart the development server: yarn dev');
  console.log('2. Follow the instructions in DEBUG_INSTRUCTIONS.md');
  console.log('3. Report back with the console logs you see');
}

addDebugLogging();
