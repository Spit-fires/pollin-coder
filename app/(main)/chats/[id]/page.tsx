import { getPrisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import PageClient from "./page.client";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const user = await getCurrentUser();
  const chat = await getChatById(id);

  if (!chat) notFound();

  // Authorization: only the owner can access their chats
  // If chat has a userId, the viewer must be authenticated and match
  // If chat has no userId (legacy), require authentication as well
  if (!user || (chat.userId && chat.userId !== user.id)) {
    notFound();
  }

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
