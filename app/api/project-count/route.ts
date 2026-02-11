import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const prisma = getPrisma();
    
    // Get the total count of all projects
    const count = await prisma.chat.count();
    
    // Set cache control headers
    const response = NextResponse.json({ 
      count,
      timestamp: new Date().toISOString(),
    });
    response.headers.set('Cache-Control', 'public, max-age=60'); // Cache for 1 minute
    
    return response;
  } catch (error) {
    console.error('Error fetching project count:', error);
    
    // Don't leak error details to client
    return NextResponse.json(
      { error: 'Failed to fetch project count' },
      { status: 500 }
    );
  }
} 