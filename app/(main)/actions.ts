"use server";

import { getPrisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import {
  getMainCodingPrompt,
  screenshotToCodePrompt,
  softwareArchitectPrompt,
} from "@/lib/prompts";
import { callPollinationsAPISync } from "@/lib/pollinations";
import { TASK_MODELS } from "@/lib/constants";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

// Allowlist of exact domains for screenshot URLs to prevent SSRF
const ALLOWED_SCREENSHOT_DOMAINS = new Set([
  'files.catbox.moe',
  'litter.catbox.moe',
]);

// Pattern for S3 buckets: <bucket>.s3.amazonaws.com or <bucket>.s3.<region>.amazonaws.com
const S3_HOSTNAME_PATTERN = /^[a-z0-9][a-z0-9.-]*\.s3(\.[a-z0-9-]+)?\.amazonaws\.com$/;

function isAllowedScreenshotUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    // Exact match for catbox domains
    if (ALLOWED_SCREENSHOT_DOMAINS.has(parsed.hostname)) return true;
    // Strict S3 pattern match (prevents matching ec2.amazonaws.com etc.)
    if (S3_HOSTNAME_PATTERN.test(parsed.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

const createChatSchema = z.object({
  prompt: z.string().min(1).max(50000),
  model: z.string().min(1).max(100),
  quality: z.enum(["high", "low"]),
  screenshotUrl: z.string().url().refine(
    (url) => isAllowedScreenshotUrl(url),
    { message: "Screenshot URL must be from an allowed domain (catbox.moe or amazonaws.com)" }
  ).optional(),
});

const createMessageSchema = z.object({
  chatId: z.string().min(1, "Chat ID is required"),
  text: z.string().min(1, "Message text cannot be empty").max(50000, "Message text is too long (max 50,000 characters)"),
  role: z.enum(["assistant", "user"]),
});

export async function createChat(
  apiKey: string,
  prompt: string,
  model: string,
  quality: "high" | "low",
  screenshotUrl: string | undefined,
) {
  // Validate input
  const validation = createChatSchema.safeParse({ prompt, model, quality, screenshotUrl });
  if (!validation.success) {
    throw new Error(`Invalid input: ${validation.error.message}`);
  }

  // Get authenticated user
  const user = await requireAuth(apiKey);
  
  if (!apiKey) {
    redirect("/login");
  }

  // Narrow apiKey to string after the guard above
  const validApiKey: string = apiKey;

  const prisma = getPrisma();
  const chat = await prisma.chat.create({
    data: {
      model,
      quality,
      prompt,
      title: "",
      shadcn: true,
      userId: user.id, // Associate with authenticated user
    },
  });

  async function fetchTitle() {
    const response = await callPollinationsAPISync(validApiKey, {
      model: TASK_MODELS.titleGeneration,
      messages: [
        {
          role: "system",
          content:
            "You are a chatbot helping the user create a simple app or script, and your current job is to create a succinct title, maximum 3-5 words, for the chat given their initial prompt. Please return only the title.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      referrer: "pollin-coder"
    });
    
    const result = await response.json();
    const title = result.choices[0].message?.content || prompt;
    return title;
  }

  async function fetchTopExample() {
    const response = await callPollinationsAPISync(validApiKey, {
      model: TASK_MODELS.exampleMatching,
      messages: [
        {
          role: "system",
          content: `You are a helpful bot. Given a request for building an app, you match it to the most similar example provided. If the request is NOT similar to any of the provided examples, return "none". Here is the list of examples, ONLY reply with one of them OR "none":

          - landing page
          - blog app
          - quiz app
          - pomodoro timer
          `,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      referrer: "pollin-coder"
    });
    
    const result = await response.json();
    const mostSimilarExample = result.choices[0].message?.content?.toLowerCase().trim() || "none";
    
    // Validate and normalize the response
    const validExamples = ["landing page", "blog app", "quiz app", "pomodoro timer"];
    const normalizedExample = validExamples.includes(mostSimilarExample) ? mostSimilarExample : "none";
    
    return normalizedExample;
  }

  const [title, mostSimilarExample] = await Promise.all([
    fetchTitle(),
    fetchTopExample(),
  ]);

  let fullScreenshotDescription;
  if (screenshotUrl) {
    const response = await callPollinationsAPISync(apiKey, {
      model: TASK_MODELS.screenshotAnalysis,
      temperature: 0.2,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: screenshotToCodePrompt },
            {
              type: "image_url",
              image_url: {
                url: screenshotUrl,
              },
            },
          ],
        },
      ],
      referrer: "pollin-coder"
    });
    
    const result = await response.json();
    fullScreenshotDescription = result.choices[0].message?.content;
  }

  let userMessage: string;
  if (quality === "high") {
    const response = await callPollinationsAPISync(apiKey, {
      model: TASK_MODELS.softwareArchitecture,
      messages: [
        {
          role: "system",
          content: softwareArchitectPrompt,
        },
        {
          role: "user",
          content: fullScreenshotDescription
            ? fullScreenshotDescription + prompt
            : prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 3000,
      referrer: "pollin-coder"
    });
    
    const result = await response.json();
    userMessage = result.choices[0].message?.content ?? prompt;
  } else if (fullScreenshotDescription) {
    userMessage =
      prompt +
      "RECREATE THIS APP AS CLOSELY AS POSSIBLE: " +
      fullScreenshotDescription;
  } else {
    userMessage = prompt;
  }

  let newChat = await prisma.chat.update({
    where: {
      id: chat.id,
    },
    data: {
      title,
      messages: {
        createMany: {
          data: [
            {
              role: "system",
              content: getMainCodingPrompt(mostSimilarExample),
              position: 0,
            },
            { role: "user", content: userMessage, position: 1 },
          ],
        },
      },
    },
    include: {
      messages: true,
    },
  });

  const lastMessage = newChat.messages
    .sort((a, b) => a.position - b.position)
    .at(-1);
  if (!lastMessage) throw new Error("No new message");

  return {
    chatId: chat.id,
    lastMessageId: lastMessage.id,
  };
}

export async function createMessage(
  apiKey: string,
  chatId: string,
  text: string,
  role: "assistant" | "user",
) {
  // Validate input
  const validation = createMessageSchema.safeParse({ chatId, text, role });
  if (!validation.success) {
    const errors = validation.error.errors.map(e => e.message).join(", ");
    throw new Error(`Invalid input: ${errors}`);
  }

  // Get authenticated user
  const user = await requireAuth(apiKey);
  
  const prisma = getPrisma();
  
  // First verify chat exists and user owns it
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true, userId: true }, // Only select needed fields
  });
  
  if (!chat) notFound();

  // Check ownership
  if (chat.userId !== user.id) {
    throw new Error("Access denied");
  }

  // Get max position efficiently with aggregation instead of loading all messages
  const maxPositionResult = await prisma.message.aggregate({
    where: { chatId },
    _max: { position: true },
  });
  
  const maxPosition = maxPositionResult._max.position ?? -1;

  const newMessage = await prisma.message.create({
    data: {
      role,
      content: text,
      position: maxPosition + 1,
      chatId,
    },
  });

  return newMessage;
}
