
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
