import { NextResponse } from "next/server";import { FALLBACK_MODELS } from "@/lib/constants";
export const runtime = "nodejs";

const POLLINATIONS_MODELS_ENDPOINT = "https://gen.pollinations.ai/v1/models";

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
    
    // Transform the response to match our app's model format
    // Pollinations returns an array of model objects with { id, name, ... }
    const models = data.data?.map((model: any) => ({
      label: model.name || model.id,
      value: model.id,
    })) || [];

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Error fetching models from Pollinations:", error);
    
    // Return fallback models if the API fails
    return NextResponse.json(
      { models: FALLBACK_MODELS },
      { status: 200 }
    );
  }
}
