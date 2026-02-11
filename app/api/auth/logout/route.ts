import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Only allow POST for logout to prevent CSRF attacks
export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear the API key cookie
    cookieStore.delete("pollinations_api_key");
    
    // Clear the profile cookie
    cookieStore.delete("pollinations_profile");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
