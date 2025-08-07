
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zddulwamthwhgxdmihny.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZHVsd2FtdGh3aGd4ZG1paG55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0MzA2MDUsImV4cCI6MjA3MDAwNjYwNX0.Lv1xPXi8TvEPwVjE0gNp9sI585w8WcLGRSP7CJeJ4rE';

async function testCompleteChatFlow() {
    console.log('🚀 Testing Complete Chat Flow...');
    
    try {
        // 1. Test authentication and create Supabase client
        console.log('\n1️⃣ Testing Authentication...');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Sign in with test credentials
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'john@doe.com',
            password: 'johndoe123'
        });
        
        if (authError) {
            console.error('❌ Auth failed:', authError.message);
            return;
        }
        
        console.log('✅ Authentication successful for:', authData.user.email);
        const accessToken = authData.session.access_token;
        
        // 2. Test conversation creation
        console.log('\n2️⃣ Creating conversation...');
        const convResponse = await fetch('http://localhost:3000/api/conversations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Cookie': `sb-access-token=${accessToken}; sb-refresh-token=${authData.session.refresh_token}`
            },
            body: JSON.stringify({
                title: 'Test Conversation',
                metadata: {}
            })
        });
        
        if (!convResponse.ok) {
            const error = await convResponse.text();
            console.error('❌ Conversation creation failed:', error);
            return;
        }
        
        const conversation = await convResponse.json();
        console.log('✅ Conversation created:', conversation.id);
        
        // 3. Test chat API with streaming
        console.log('\n3️⃣ Testing Chat API with streaming...');
        const chatResponse = await fetch('http://localhost:3000/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'Cookie': `sb-access-token=${accessToken}; sb-refresh-token=${authData.session.refresh_token}`
            },
            body: JSON.stringify({
                messages: [
                    { role: 'user', content: 'Hello! Can you tell me a short joke?' }
                ],
                conversationId: conversation.id
            })
        });
        
        console.log('Chat API Status:', chatResponse.status);
        console.log('Chat API Headers:', Object.fromEntries(chatResponse.headers.entries()));
        
        if (!chatResponse.ok) {
            const error = await chatResponse.text();
            console.error('❌ Chat API failed:', error);
            return;
        }
        
        // 4. Process streaming response
        console.log('\n4️⃣ Processing streaming response...');
        const reader = chatResponse.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let partialRead = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                partialRead += decoder.decode(value, { stream: true });
                let lines = partialRead.split('\n');
                partialRead = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            console.log('🏁 Streaming completed');
                            break;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.status === 'processing') {
                                process.stdout.write('.');
                            } else if (parsed.status === 'completed') {
                                console.log('\n✅ AI Response received:', parsed.result?.content?.substring(0, 100) + '...');
                                fullResponse = parsed.result?.content || '';
                                return;
                            } else if (parsed.status === 'error') {
                                console.error('\n❌ AI Response error:', parsed.error);
                                return;
                            }
                        } catch (e) {
                            // Skip invalid JSON chunks
                        }
                    }
                }
            }
        } catch (streamError) {
            console.error('❌ Stream processing error:', streamError.message);
        }
        
        if (fullResponse) {
            console.log('\n🎉 Complete chat flow successful!');
            console.log('Full AI Response:', fullResponse.substring(0, 200) + '...');
        } else {
            console.log('\n⚠️ Chat flow completed but no AI response received');
        }
        
        // 5. Clean up - sign out
        await supabase.auth.signOut();
        console.log('\n🧹 Signed out and cleaned up');
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

testCompleteChatFlow();
