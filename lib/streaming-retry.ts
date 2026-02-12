/**
 * Auto-retry logic for streaming API calls on Vercel free plan (60s timeout)
 * Handles partial completions and retries with exponential backoff
 */

import { getApiKey } from './secure-storage';

interface StreamRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onPartialContent?: (content: string) => void;
}

/**
 * Fetch with automatic retry for streaming completions
 * Retries internally within the returned ReadableStream
 * 
 * @param url - API endpoint URL
 * @param body - Request body
 * @param options - Retry configuration
 * @returns ReadableStream of the completion with retry logic
 */
export async function streamingFetchWithRetry(
  url: string,
  body: { messageId: string; model?: string },
  options: StreamRetryOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const {
    maxRetries = 2,
    baseDelay = 1000,
    maxDelay = 10000,
    onPartialContent,
  } = options;

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Not authenticated');
  }

  // Cancel flag shared between start() and cancel()
  let cancelRequested = false;

  // Return a ReadableStream that handles retries internally
  return new ReadableStream({
    async start(streamController) {
      let accumulatedContent = '';
      let attempt = 0;
      let lastError: Error | null = null;
      const decoder = new TextDecoder();

      // Retry loop runs inside the stream
      while (attempt < maxRetries && !cancelRequested) {
        let fetchController: AbortController | null = null;
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
        let currentAttemptContent = ''; // Track content for THIS attempt only

        try {
          attempt++;
          fetchController = new AbortController();
          timeout = setTimeout(() => fetchController!.abort(), 65000);

          if (attempt > 1) {
            console.log(`Retry attempt ${attempt}/${maxRetries} (previous attempt accumulated ${accumulatedContent.length} chars)`);
          }

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Pollinations-Key': apiKey,
            },
            body: JSON.stringify(body),
            signal: fetchController.signal,
          });

          if (timeout) clearTimeout(timeout);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Request failed: ${response.status}`);
          }

          if (!response.body) {
            throw new Error('No body on response');
          }

          reader = response.body.getReader();
          let chunkBuffer = '';
          let isComplete = false;

          // Read the stream
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Check if we got the completion marker
              if (chunkBuffer.includes('[DONE]')) {
                isComplete = true;
              }
              break;
            }

            // Forward the chunk to output
            streamController.enqueue(value);
            
            // Parse chunk to accumulate content for retry tracking
            const chunk = decoder.decode(value, { stream: true });
            chunkBuffer += chunk;

            const lines = chunkBuffer.split('\n');
            chunkBuffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') {
                  isComplete = true;
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    currentAttemptContent += content; // Track current attempt only
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }

          // Update accumulated content with current attempt's content
          accumulatedContent += currentAttemptContent;

          // Success - stream completed
          if (isComplete) {
            streamController.close();
            return;
          }

          // Stream ended without completion marker - likely timeout
          // Only keep retrying if we got some content OR this is the first attempt
          if (currentAttemptContent.length === 0) {
            if (attempt === 1) {
              // First attempt got nothing - definitely retry
              throw new Error('Stream incomplete - no content received on first attempt');
            }
            if (accumulatedContent.length === 0) {
              // No content at all across all attempts - maybe the prompt is invalid
              throw new Error('Stream incomplete - no content received after multiple attempts');
            }
            // We have content from previous attempts, current one timed out with nothing
            // This might mean the stream is done, close successfully
            console.log(`Attempt ${attempt} received no new content, but previous attempts got ${accumulatedContent.length} chars. Completing with partial content.`);
            streamController.close();
            return;
          }
          throw new Error('Stream incomplete - possible timeout');

        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // Clean up resources
          if (timeout) clearTimeout(timeout);
          if (reader) {
            try {
              await reader.cancel();
            } catch {
              // Ignore cancel errors
            }
          }

          // Don't retry on authentication or client errors
          if (
            lastError.message.includes('Authentication') ||
            lastError.message.includes('403') ||
            lastError.message.includes('401') ||
            lastError.message.includes('400')
          ) {
            streamController.error(lastError);
            return;
          }

          // If we've exhausted retries, fail
          if (attempt >= maxRetries) {
            if (accumulatedContent) {
              console.warn(`Stream failed after ${attempt} attempts with ${accumulatedContent.length} chars partial content`);
              onPartialContent?.(accumulatedContent);
            }
            streamController.error(new Error(
              `Stream failed after ${maxRetries} retries: ${lastError.message}${
                accumulatedContent ? ' (partial content available)' : ''
              }`
            ));
            return;
          }

          // Exponential backoff before next retry
          const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
          await new Promise(resolve => setTimeout(resolve, delay));
          // Loop continues to next retry
        }
      }

      // Should never reach here
      if (!cancelRequested) {
        streamController.error(lastError || new Error('Unknown streaming error'));
      }
    },
    cancel() {
      // Called when consumer cancels the stream
      // Set flag to stop retry loop
      cancelRequested = true;
    },
  });
}

/**
 * Simple wrapper for existing authFetch pattern with retry
 * Use this as a drop-in replacement for streaming endpoints
 */
export async function authFetchWithRetry(
  url: string,
  options: RequestInit & { retryOptions?: StreamRetryOptions } = {}
): Promise<Response> {
  const { retryOptions, ...fetchOptions } = options;

  // Only apply retry logic to streaming endpoints
  if (url.includes('get-next-completion-stream-promise')) {
    const body = fetchOptions.body ? JSON.parse(fetchOptions.body as string) : {};
    const stream = await streamingFetchWithRetry(url, body, retryOptions);
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  // For non-streaming endpoints, use regular authFetch
  const apiKey = getApiKey();
  if (!apiKey) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Not authenticated');
  }

  return fetch(url, {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers,
      'X-Pollinations-Key': apiKey,
    },
  });
}
