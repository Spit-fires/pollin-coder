import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageClient from "./page.client";

/**
 * Chat page (server component)
 *
 * Auth note: The API key lives in localStorage which is inaccessible from
 * server components. Ownership is verified client-side in PageClient via
 * an authenticated API call to /api/chats/[id]. If the user doesn't own
 * the chat, they are redirected away. All mutations (createMessage,
 * streaming) also require apiKey via header and check ownership.
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
