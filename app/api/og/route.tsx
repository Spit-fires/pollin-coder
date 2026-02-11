import { ImageResponse } from "next/og";
import { domain } from "@/lib/domain";

/** Sanitize text for safe rendering */
function sanitizeText(text: string): string {
  return text.replace(/[<>"'&]/g, '');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawPrompt = searchParams.get("prompt");
  const prompt = rawPrompt ? sanitizeText(rawPrompt) : null;

  return new ImageResponse(
    (
      <div
        style={{
          backgroundImage: `url(${domain}/dynamic-og.png)`,
          backgroundSize: "1200px 630px",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          fontSize: 50,
          color: "black",
          background: "white",
          width: "100%",
          height: "100%",
          padding: "50px 200px",
          textAlign: "center",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {prompt && prompt.length > 100 ? prompt.slice(0, 97) + "..." : prompt}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
