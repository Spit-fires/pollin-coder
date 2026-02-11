import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import CodeRunner from "@/components/code-runner";
import { getPrisma } from "@/lib/prisma";

/** Sanitize text for safe embedding in HTML meta tags */
function sanitizeForMeta(text: string): string {
  return text.replace(/[<>"'&]/g, '').slice(0, 200);
}

/*
  This is the Share page for v1 apps, before the chat interface was added.

  It's here to preserve existing URLs.
*/
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const generatedApp = await getGeneratedAppByID((await params).id);

  let prompt = generatedApp?.prompt;
  if (typeof prompt !== "string") {
    notFound();
  }

  const safePrompt = sanitizeForMeta(prompt);
  let searchParams = new URLSearchParams();
  searchParams.set("prompt", safePrompt);

  return {
    title: "An app generated with Pollin Coder",
    description: `Prompt: ${safePrompt}`,
    openGraph: {
      images: [`/api/og?${searchParams}`],
    },
    twitter: {
      title: "An app generated with Pollin Coder",
      card: "summary_large_image",
      images: [`/api/og?${searchParams}`],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // if process.env.DATABASE_URL is not set, throw an error
  if (typeof id !== "string") {
    notFound();
  }

  const generatedApp = await getGeneratedAppByID(id);

  if (!generatedApp) {
    return <div>App not found</div>;
  }

  return (
    <div className="flex h-full w-full grow items-center justify-center">
      <CodeRunner language="tsx" code={generatedApp.code} />
    </div>
  );
}

const getGeneratedAppByID = cache(async (id: string) => {
  const prisma = getPrisma();
  return prisma.generatedApp.findUnique({
    where: {
      id,
    },
  });
});
