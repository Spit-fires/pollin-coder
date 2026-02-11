import { NextResponse } from "next/server";
import { extractAdminToken, removeAdminSession } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const token = extractAdminToken(request);
    
    if (token) {
      await removeAdminSession(token);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
