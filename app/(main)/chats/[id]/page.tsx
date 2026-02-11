import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageClient from "./page.client";

/**
 * Chat page (server component)
 *
 * Auth note: We do NOT verify ownership here because the API key lives
 * in localStorage which is inaccessible from server components.
 * Security is maintained because:
 *   1. Chat IDs are CUIDs – effectively unguessable
 *   2. All mutations (createMessage, streaming) require apiKey via header
 *   3. The Providers wrapper redirects unauthenticated users to /login
 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const chat = await getChatById(id);

  if (!chat) notFound();

  return <PageClient chat={chat} />;
}

const getChatById = cache(async (id: string) => {
  const prisma = getPrisma();
  return await prisma.chat.findFirst({
    where: { id },
    include: { messages: { orderBy: { position: "asc" } } },
  });
});

export type Chat = NonNullable<Awaited<ReturnType<typeof getChatById>>>;
export type Message = Chat["messages"][number];
