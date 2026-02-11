import { NextResponse } from "next/server";
import { FALLBACK_MODELS } from "@/lib/constants";

export const runtime = "nodejs";

const POLLINATIONS_MODELS_ENDPOINT = "https://gen.pollinations.ai/v1/models";

/**
 * Returns a comma-separated list of model values for use in authorization URLs
 * e.g., "openai,openai-fast,openai-large,claude,mistral"
 */
export async function GET() {
  try {
    const response = await fetch(POLLINATIONS_MODELS_ENDPOINT, {
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract model IDs and join with commas
    const modelList = data.data?.map((model: any) => model.id).join(",") || 
                      FALLBACK_MODELS.map((m) => m.value).join(",");

    return NextResponse.json({ models: modelList });
  } catch (error) {
    console.error("Error fetching models from Pollinations:", error);
    
    // Return fallback models as comma-separated string
    return NextResponse.json(
      { models: FALLBACK_MODELS.map((m) => m.value).join(",") },
      { status: 200 }
    );
  }
}
