"use client";

import { createMessage } from "@/app/(main)/actions";
import LogoSmall from "@/components/icons/logo-small";
import { splitByFirstCodeFence } from "@/lib/utils";
import { isResponseIncomplete, getContinuationPrompt } from "@/lib/continuation-detector";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, use, useEffect, useRef, useState } from "react";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import CodeViewer from "./code-viewer";
import CodeViewerLayout from "./code-viewer-layout";
import type { Chat } from "./page";
import { Context } from "../../providers";
import ThreeBackgroundScene from "@/components/ThreeBackgroundScene";
import { authFetch } from "@/lib/api-client";
import { authFetchWithRetry } from "@/lib/streaming-retry";
import { getApiKey } from "@/lib/secure-storage";

// Helper for parsing SSE streams
class ChatCompletionStream {
  static fromReadableStream(stream: ReadableStream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedContent = "";
    let contentHandlers: ((delta: string, content: string) => void)[] = [];
    let finalContentHandlers: ((content: string) => void)[] = [];
    let cancelled = false;

    const processBuffer = () => {
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep any incomplete line for next time

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.substring(6);
          if (dataStr === "[DONE]") continue;
          
          try {
            const data = JSON.parse(dataStr);
            const delta = data?.choices?.[0]?.delta?.content || "";
            accumulatedContent += delta;
            
            if (!cancelled) {
              contentHandlers.forEach(handler => handler(delta, accumulatedContent));
            }
          } catch (e) {
            console.error("Error parsing SSE data:", e);
          }
        }
      }
    };

    const process = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) {
            if (!cancelled) {
              finalContentHandlers.forEach(handler => handler(accumulatedContent));
            }
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          processBuffer();
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error reading stream:", error);
          // Invoke finalContent handlers even on error to save partial content
          if (accumulatedContent) {
            finalContentHandlers.forEach(handler => handler(accumulatedContent));
          }
        }
      }
    };

    process();

    return {
      on(event: 'content' | 'finalContent', handler: ((delta: string, content: string) => void) | ((content: string) => void)) {
        if (event === "content") {
          contentHandlers.push(handler as (delta: string, content: string) => void);
        } else if (event === "finalContent") {
          finalContentHandlers.push(handler as (content: string) => void);
        }
        return this;
      },
      cancel() {
        cancelled = true;
        reader.cancel().catch(() => {});
      }
    };
  }
}

export default function PageClient({ chat }: { chat: Chat }) {
  const context = use(Context);
  const [streamPromise, setStreamPromise] = useState<
    Promise<ReadableStream> | undefined
  >(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [isShowingCodeViewer, setIsShowingCodeViewer] = useState(
    chat.messages.some((m) => m.role === "assistant"),
  );
  const [activeTab, setActiveTab] = useState<"code" | "preview">("preview");
  const router = useRouter();
  const isHandlingStreamRef = useRef(false);
  const ownershipVerifiedRef = useRef(false);
  const [activeMessage, setActiveMessage] = useState(
    chat.messages.filter((m) => m.role === "assistant").at(-1),
  );

  // Verify chat ownership on mount to prevent read-only IDOR
  useEffect(() => {
    if (ownershipVerifiedRef.current) return;
    authFetch(`/api/chats/${chat.id}`)
      .then((res) => {
        if (!res.ok) {
          router.push('/');
        } else {
          ownershipVerifiedRef.current = true;
        }
      })
      .catch(() => {
        // If auth fails (no key), api-client redirects to /login
      });
  }, [chat.id, router]);

  useEffect(() => {
    let streamInstance: ReturnType<typeof ChatCompletionStream.fromReadableStream> | null = null;

    async function f() {
      if (!streamPromise || isHandlingStreamRef.current) return;

      isHandlingStreamRef.current = true;
      context.setStreamPromise(undefined);

      let stream: ReadableStream;
      try {
        stream = await streamPromise;
      } catch (error) {
        console.error("Error getting stream:", error);
        isHandlingStreamRef.current = false;
        setStreamText("");
        setStreamPromise(undefined);
        alert(error instanceof Error ? error.message : 'Failed to get completion stream');
        return;
      }
      let didPushToCode = false;
      let didPushToPreview = false;

      streamInstance = ChatCompletionStream.fromReadableStream(stream)
        .on("content", (delta, content) => {
          setStreamText((text) => text + delta);

          if (
            !didPushToCode &&
            splitByFirstCodeFence(content).some(
              (part) => part.type === "first-code-fence-generating",
            )
          ) {
            didPushToCode = true;
            setIsShowingCodeViewer(true);
            setActiveTab("code");
          }

          if (
            !didPushToPreview &&
            splitByFirstCodeFence(content).some(
              (part) => part.type === "first-code-fence",
            )
          ) {
            didPushToPreview = true;
            setIsShowingCodeViewer(true);
            setActiveTab("preview");
          }
        })
        .on("finalContent", async (finalText: string) => {
          startTransition(async () => {
            const apiKey = getApiKey();
            if (!apiKey) {
              console.error("No API key available");
              isHandlingStreamRef.current = false;
              setStreamText("");
              setStreamPromise(undefined);
              return;
            }
            
            // Validate that we have content to save
            const trimmedText = finalText.trim();
            if (!trimmedText) {
              console.warn("Stream completed with no content - the request may have failed or been rate limited");
              isHandlingStreamRef.current = false;
              setStreamText("");
              setStreamPromise(undefined);
              return;
            }
            
            try {
              // Save the assistant message
              const message = await createMessage(
                apiKey,
                chat.id,
                trimmedText,
                "assistant",
              );

              // Check if response is incomplete and needs continuation
              if (isResponseIncomplete(trimmedText)) {
                console.log("Response appears incomplete, requesting continuation...");
                
                try {
                  // Create continuation request
                  const continuationPrompt = getContinuationPrompt(trimmedText);
                  const continueMessage = await createMessage(
                    apiKey,
                    chat.id,
                    continuationPrompt,
                    "user",
                  );

                  // Start a new stream for continuation
                  const continueStreamPromise = authFetchWithRetry(
                    "/api/get-next-completion-stream-promise",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        messageId: continueMessage.id,
                        model: chat.model,
                      }),
                      retryOptions: {
                        maxRetries: 2,
                        onPartialContent: (content) => {
                          console.log(`Continuation partial: ${content.length} chars`);
                        },
                      },
                    },
                  ).then((res) => {
                    if (!res.body) {
                      throw new Error("No body on response");
                    }
                    return res.body;
                  }).catch((error) => {
                    console.error('Continuation stream rejected:', error);
                    throw error;
                  });

                  // Update state to show continuation is happening
                  setActiveMessage(message);
                  setStreamPromise(continueStreamPromise);
                  context.setStreamPromise(continueStreamPromise);
                  isHandlingStreamRef.current = false;
                  router.refresh();
                } catch (continueError) {
                  console.error('Failed to request continuation:', continueError);
                  // Continue normally even if continuation fails
                  isHandlingStreamRef.current = false;
                  setStreamText("");
                  setStreamPromise(undefined);
                  setActiveMessage(message);
                  // No router.refresh() needed — message already saved, state is updated
                }
              } else {
                // Response is complete, no continuation needed
                isHandlingStreamRef.current = false;
                setStreamText("");
                setStreamPromise(undefined);
                setActiveMessage(message);
                router.refresh();
              }
            } catch (error) {
              console.error('Error saving assistant message:', error);
              isHandlingStreamRef.current = false;
              setStreamText("");
              setStreamPromise(undefined);
              // No router.refresh() needed — nothing was saved
            }
          });
        });
    }

    f();

    return () => {
      // Cancel stream reader on unmount to prevent memory leaks
      if (streamInstance) {
        streamInstance.cancel();
      }
    };
  }, [chat.id, router, streamPromise, context]);

  return (
    <div className="h-dvh">
      {/* 3D Background */}
      <div className="fixed inset-0 z-0">
        <ThreeBackgroundScene />
      </div>

      <div className="flex h-full relative z-10">
        <div className="mx-auto flex w-full shrink-0 flex-col overflow-hidden lg:w-1/2">
          <div className="flex items-center gap-4 px-4 py-4">
            <Link href="/">
              <LogoSmall />
            </Link>
            <p className="italic text-white">{chat.title}</p>
          </div>

          <ChatLog
            chat={chat}
            streamText={streamText}
            activeMessage={activeMessage}
            onMessageClick={(message) => {
              if (message !== activeMessage) {
                setActiveMessage(message);
                setIsShowingCodeViewer(true);
              } else {
                setActiveMessage(undefined);
                setIsShowingCodeViewer(false);
              }
            }}
          />

          <ChatBox
            chat={chat}
            onNewStreamPromise={setStreamPromise}
            isStreaming={!!streamPromise}
          />
        </div>

        <CodeViewerLayout
          isShowing={isShowingCodeViewer}
          onClose={() => {
            setActiveMessage(undefined);
            setIsShowingCodeViewer(false);
          }}
        >
          {isShowingCodeViewer && (
            <CodeViewer
              streamText={streamText}
              chat={chat}
              message={activeMessage}
              onMessageChange={setActiveMessage}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onClose={() => {
                setActiveMessage(undefined);
                setIsShowingCodeViewer(false);
              }}
              onRequestFix={(error: string) => {
                startTransition(async () => {
                  const errorText = error.trimStart();
                  if (!errorText) {
                    alert('No error information provided');
                    return;
                  }
                  
                  let newMessageText = `The code is not working. Can you fix it? Here's the error:\n\n`;
                  newMessageText += errorText;
                  
                  const apiKey = getApiKey();
                  if (!apiKey) {
                    alert("You need to log in first");
                    return;
                  }
                  
                  try {
                    const message = await createMessage(
                      apiKey,
                      chat.id,
                      newMessageText,
                      "user",
                    );

                  const streamPromise = authFetchWithRetry(
                    "/api/get-next-completion-stream-promise",
                    {
                      method: "POST",
                      body: JSON.stringify({
                        messageId: message.id,
                        model: chat.model,
                      }),
                      retryOptions: {
                        maxRetries: 2,
                        onPartialContent: (content) => {
                          console.log(`Partial completion received: ${content.length} chars`);
                        },
                      },
                    },
                  ).then((res) => {
                    if (!res.body) {
                      throw new Error("No body on response");
                    }
                    return res.body;
                  }).catch((error) => {
                    // Log and re-throw to be handled by the stream consumer
                    console.error('Stream promise rejected:', error);
                    throw error;
                  });
                  setStreamPromise(streamPromise);
                  router.refresh();
                  } catch (error) {
                    console.error('Error requesting fix:', error);
                    alert(error instanceof Error ? error.message : 'Failed to request fix. Please try again.');
                  }
                });
              }}
            />
          )}
        </CodeViewerLayout>
      </div>
    </div>
  );
}
