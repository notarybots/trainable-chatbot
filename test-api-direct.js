// Direct test of the AbacusAI API
// Using built-in fetch (Node.js 18+)

const testAPI = async () => {
  try {
    console.log('Testing AbacusAI API directly...');
    
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 3250288c54dc464d80791cfcafa9f430'
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'user', content: 'Hello, just say hi back' }
        ],
        stream: false,
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    const content = data.choices?.[0]?.message?.content;
    console.log('Extracted content:', content);
    
  } catch (error) {
    console.error('Test error:', error);
  }
};

testAPI();
