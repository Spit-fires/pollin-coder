/**
 * Example: Using Pollinations AI with BYOP (Bring Your Own Pollen) Authentication
 * 
 * This example shows how to:
 * 1. Redirect users to Pollinations to authorize your app
 * 2. Extract the API key from the URL fragment after redirect
 * 3. Make authenticated requests to the new gen.pollinations.ai API
 */

// Step 1: Redirect user to Pollinations authorization page
function redirectToAuth() {
  const redirectUrl = encodeURIComponent(`${window.location.origin}/auth/callback`);
  
  // NOTE: In production, fetch models dynamically from /api/auth/model-scopes
  // This ensures the authorization always includes all available models.
  // Example:
  //   const response = await fetch('/api/auth/model-scopes');
  //   const { models } = await response.json();
  //   const authorizeUrl = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile,balance&models=${models}&expiry=30`;
  
  // For this example, we use a minimal static list:
  const models = "openai-large,openai,openai-fast,claude,mistral";
  const authorizeUrl = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile,balance&models=${models}&expiry=30`;
  window.location.href = authorizeUrl;
}

// Step 2: Extract API key from URL fragment after redirect
function extractApiKeyFromFragment() {
  const fragment = window.location.hash.slice(1); // Remove the #
  const params = new URLSearchParams(fragment);
  return params.get('api_key');
}

// Method 1: Using Authorization Header (Recommended)
async function callWithAuthHeader(apiKey, prompt) {
  const url = 'https://gen.pollinations.ai/v1/chat/completions';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'openai-fast',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return await response.json();
}

// Method 2: Using Query Parameter
async function callWithQueryParam(apiKey, prompt) {
  const url = `https://gen.pollinations.ai/v1/chat/completions?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai-fast',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return await response.json();
}

// Example: Generate an image using the new API
async function generateImage(apiKey, prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  const imageUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?width=1024&height=1024`;
  
  // For image generation, you can use it directly in an <img> tag or fetch it
  const response = await fetch(imageUrl, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Image API Error: ${response.status}`);
  }
  
  return response.blob();
}

// Example: Check API key status
async function checkKeyStatus(apiKey) {
  const response = await fetch('https://gen.pollinations.ai/account/key', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Key validation failed: ${response.status}`);
  }
  
  return await response.json();
}

// Example: Check pollen balance
async function checkBalance(apiKey) {
  const response = await fetch('https://gen.pollinations.ai/account/balance', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`Balance check failed: ${response.status}`);
  }
  
  return await response.json();
}

// Complete BYOP workflow example
async function completeBYOPWorkflow() {
  try {
    // In a real app, you'd initiate this when user clicks "Connect with Pollinations"
    console.log('Step 1: Redirect to Pollinations (uncomment to test)');
    // redirectToAuth();
    
    // After redirect back, extract the key
    console.log('Step 2: Extract API key from URL fragment');
    const apiKey = extractApiKeyFromFragment();
    
    if (!apiKey) {
      console.error('No API key found in URL fragment');
      return;
    }
    
    console.log('API Key received:', apiKey.substring(0, 10) + '...');
    
    // Validate the key
    console.log('\nStep 3: Validate API key');
    const keyStatus = await checkKeyStatus(apiKey);
    console.log('Key status:', keyStatus);
    
    // Check balance
    console.log('\nStep 4: Check pollen balance');
    const balance = await checkBalance(apiKey);
    console.log('Balance:', balance);
    
    // Make a chat completion request
    console.log('\nStep 5: Test chat completion');
    const result = await callWithAuthHeader(apiKey, 'Hello, how are you?');
    console.log('Chat response:', result.choices[0].message.content);
    
    console.log('\n✓ BYOP workflow completed successfully!');
  } catch (error) {
    console.error('Error in BYOP workflow:', error.message);
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    redirectToAuth,
    extractApiKeyFromFragment,
    callWithAuthHeader,
    callWithQueryParam,
    generateImage,
    checkKeyStatus,
    checkBalance,
    completeBYOPWorkflow
  };
}