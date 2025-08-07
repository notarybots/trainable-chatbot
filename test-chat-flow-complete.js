
const puppeteer = require('puppeteer');
const fs = require('fs');

async function testChatFlow() {
  console.log('🚀 Testing Complete Chat Functionality...\n');
  
  let browser;
  let page;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false,
      slowMo: 100,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Enable console logging
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', req => console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText));
    
    console.log('1️⃣  Navigating to login page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Check if we're on login page
    const isLoginPage = await page.$('input[type="email"]') !== null;
    console.log(`✅ On login page: ${isLoginPage}`);
    
    if (isLoginPage) {
      console.log('\n2️⃣  Logging in with test credentials...');
      
      // Fill login form
      await page.type('input[type="email"]', 'john@doe.com');
      await page.type('input[type="password"]', 'johndoe123');
      
      // Click sign in button
      await page.click('button:contains("Sign In")');
      
      // Wait for navigation or dashboard
      try {
        await page.waitForNavigation({ timeout: 10000 });
        console.log('✅ Login successful - navigation detected');
      } catch (error) {
        console.log('⚠️  No navigation detected, checking current state...');
      }
      
      // Wait a bit for any async operations
      await page.waitForTimeout(3000);
    }
    
    // Check if we're now in the chat interface
    console.log('\n3️⃣  Checking chat interface...');
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);
    
    // Look for chat interface elements
    const chatElements = {
      newChatButton: await page.$('button:contains("New Chat")') !== null,
      messageInput: await page.$('textarea') !== null || await page.$('input[placeholder*="message"]') !== null,
      sendButton: await page.$('button[class*="send"]') !== null || await page.$('button:contains("Send")') !== null,
      sidebar: await page.$('[class*="sidebar"]') !== null || await page.$('[class*="session"]') !== null
    };
    
    console.log('Chat interface elements found:');
    Object.entries(chatElements).forEach(([key, found]) => {
      console.log(`  ${found ? '✅' : '❌'} ${key}: ${found}`);
    });
    
    // Test New Chat Button
    console.log('\n4️⃣  Testing "New Chat" button...');
    try {
      const newChatButton = await page.$('button:contains("New Chat")');
      if (newChatButton) {
        console.log('✅ Found New Chat button, testing click...');
        
        // Listen for network requests
        const requests = [];
        page.on('request', req => {
          if (req.url().includes('/api/conversations')) {
            requests.push({
              method: req.method(),
              url: req.url(),
              headers: req.headers(),
              postData: req.postData()
            });
          }
        });
        
        await newChatButton.click();
        await page.waitForTimeout(2000);
        
        console.log(`Network requests made: ${requests.length}`);
        requests.forEach((req, i) => {
          console.log(`  Request ${i + 1}: ${req.method} ${req.url}`);
          if (req.postData) console.log(`    Body: ${req.postData}`);
        });
      } else {
        console.log('❌ New Chat button not found');
      }
    } catch (error) {
      console.log('❌ Error testing New Chat button:', error.message);
    }
    
    // Test Message Input
    console.log('\n5️⃣  Testing message input...');
    try {
      const messageInput = await page.$('textarea') || await page.$('input[placeholder*="message"]');
      if (messageInput) {
        console.log('✅ Found message input, testing typing...');
        
        await messageInput.type('Hello, this is a test message!');
        console.log('✅ Typed test message');
        
        // Test Enter key
        console.log('Testing Enter key...');
        const requestsBeforeEnter = [];
        page.on('request', req => {
          if (req.url().includes('/api/')) {
            requestsBeforeEnter.push(req.method() + ' ' + req.url());
          }
        });
        
        await messageInput.press('Enter');
        await page.waitForTimeout(3000);
        
        console.log(`API requests after Enter: ${requestsBeforeEnter.length}`);
        requestsBeforeEnter.forEach(req => console.log(`  ${req}`));
        
        // Clear input and test Send button
        await messageInput.clear();
        await messageInput.type('Testing send button');
        
        const sendButton = await page.$('button[class*="send"]') || 
                          await page.$('button:contains("Send")') ||
                          await page.$('button[type="submit"]');
        
        if (sendButton) {
          console.log('✅ Found Send button, testing click...');
          const requestsBeforeSend = [];
          page.on('request', req => {
            if (req.url().includes('/api/')) {
              requestsBeforeSend.push(req.method() + ' ' + req.url());
            }
          });
          
          await sendButton.click();
          await page.waitForTimeout(3000);
          
          console.log(`API requests after Send click: ${requestsBeforeSend.length}`);
          requestsBeforeSend.forEach(req => console.log(`  ${req}`));
        } else {
          console.log('❌ Send button not found');
        }
      } else {
        console.log('❌ Message input not found');
      }
    } catch (error) {
      console.log('❌ Error testing message input:', error.message);
    }
    
    // Check browser console for errors
    console.log('\n6️⃣  Checking for JavaScript errors...');
    const errors = await page.evaluate(() => {
      // Return any error messages from console
      return window.console.error ? 'Console errors may be present' : 'No obvious console errors';
    });
    console.log(`Browser console status: ${errors}`);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: '/home/ubuntu/trainable-chatbot/debug-screenshot.png' });
    console.log('📸 Screenshot saved as debug-screenshot.png');
    
    console.log('\n✅ Chat flow test completed!');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testChatFlow().catch(console.error);
