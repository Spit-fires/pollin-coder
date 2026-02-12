/**
 * Pollinations AI API utilities with BYOP (Bring Your Own Pollen) authentication
 * API key is passed explicitly from client → server actions / API routes.
 */

const POLLINATIONS_API_URL = "https://gen.pollinations.ai/v1/chat/completions";

/**
 * Create headers for Pollinations AI API requests with API key authentication
 */
function createPollinationsHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };
}

/**
 * Make a request to Pollinations AI API with authentication
 */
export async function callPollinationsAPI(
  apiKey: string,
  body: any,
  options: {
    stream?: boolean;
    timeout?: number;
  } = {}
): Promise<Response> {
  const { timeout = 30000 } = options;

  if (!apiKey) {
    throw new Error("API key is required for Pollinations API calls");
  }

  const headers = createPollinationsHeaders(apiKey);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(POLLINATIONS_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error("Authentication failed. Please reconnect your Pollinations account.");
      }
      if (response.status === 402) {
        throw new Error("Insufficient pollen balance. Please add more pollen to your account.");
      }
      if (response.status === 403) {
        throw new Error("Access denied. Check your API key permissions.");
      }
      
      throw new Error(`Pollinations API error: ${response.status} - ${errorText}`);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Pollinations API request timed out');
    }
    throw error;
  }
}

/**
 * Make a streaming request to Pollinations AI API
 * Uses a longer timeout (60s) since streams can run for the full maxDuration.
 */
export async function callPollinationsAPIStream(
  apiKey: string,
  body: any
): Promise<Response> {
  return callPollinationsAPI(apiKey, body, { stream: true, timeout: 60_000 });
}

/**
 * Make a non-streaming request to Pollinations AI API
 * Uses shorter timeout (20s) to fit multiple calls within 60s server action limit
 */
export async function callPollinationsAPISync(
  apiKey: string,
  body: any
): Promise<Response> {
  return callPollinationsAPI(apiKey, body, { stream: false, timeout: 20_000 });
}