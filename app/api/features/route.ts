import { NextResponse } from "next/server";
import { getAllFeatureFlags } from "@/lib/features";

export async function GET() {
  const flags = await getAllFeatureFlags();
  return NextResponse.json({
    uploadsEnabled: flags.uploadEnabled,
    screenshotFlowEnabled: flags.screenshotFlowEnabled,
    shadcnEnabled: flags.shadcnEnabled,
  });
}
