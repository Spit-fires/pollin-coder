import { NextResponse } from 'next/server';
import { isUploadEnabled } from '@/lib/features';

export async function GET() {
  return NextResponse.json({
    uploadsEnabled: isUploadEnabled()
  });
}
