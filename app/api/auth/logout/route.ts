import { NextResponse } from "next/server";

// Only allow POST for logout to prevent CSRF attacks
export async function POST() {
  try {
    // Client will handle clearing localStorage
    // This endpoint exists for consistency and future server-side cleanup if needed
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
