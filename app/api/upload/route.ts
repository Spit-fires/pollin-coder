import { NextResponse } from 'next/server';
import { isUploadEnabled, getUploadDisabledMessage } from '@/lib/features';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse, getClientIp } from '@/lib/rate-limit';

// Rate limit: 10 uploads per minute per IP
const UPLOAD_RATE_LIMIT = { maxRequests: 10, windowMs: 60_000 };

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed image MIME types (SVG removed — can contain JavaScript/XSS payloads)
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export async function POST(request: Request) {
  // Rate limiting — prevents upload spam
  const clientIp = getClientIp(request);
  const rl = checkRateLimit(`upload:${clientIp}`, UPLOAD_RATE_LIMIT);
  if (!rl.allowed) {
    return rateLimitResponse(rl, UPLOAD_RATE_LIMIT);
  }

  // Check if uploads are enabled
  if (!isUploadEnabled()) {
    return NextResponse.json(
      { error: getUploadDisabledMessage() },
      { status: 403 }
    );
  }

  // Require authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('reqtype');
    
    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file is actually a file
    const fileToUpload = formData.get('fileToUpload');
    if (!fileToUpload || !(fileToUpload instanceof File)) {
      return NextResponse.json(
        { error: 'Invalid file' },
        { status: 400 }
      );
    }

    // Validate file size
    if (fileToUpload.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(fileToUpload.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }
    
    // Build a sanitized FormData to prevent form field injection
    const sanitizedFormData = new FormData();
    sanitizedFormData.append('reqtype', 'fileupload');
    sanitizedFormData.append('fileToUpload', fileToUpload);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: sanitizedFormData
    });

    if (!response.ok) {
      console.error('Catbox API error:', response.status, await response.text());
      throw new Error('Upload failed');
    }

    const url = await response.text();
    
    // Check if the response is a valid URL
    if (!url.startsWith('http')) {
      console.error('Invalid response from Catbox:', url);
      throw new Error('Invalid response from upload service');
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
} 