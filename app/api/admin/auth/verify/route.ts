import { NextResponse } from "next/server";
import { extractAdminToken, verifyAdminToken } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const token = extractAdminToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: "No token provided" },
        { status: 401 }
      );
    }

    const session = await verifyAdminToken(token);
    
    if (!session) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json({ 
      success: true,
      admin: {
        id: session.adminId,
        email: session.email,
      }
    });
  } catch (error) {
    console.error("Admin token verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
