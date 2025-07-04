import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({ 
      success: true, 
      message: 'Session unlinked. Please sign out to fully reset your session.',
      nextSteps: [
        '1. Click the Sign Out button to complete session reset.',
        '2. After signing out, close all browser tabs for this site.',
        '3. Reopen the browser and try again.'
      ]
    });

    // Optional: Add headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Clear session error:', error);
    return NextResponse.json({ 
      error: 'Failed to unlink session. Please try again.'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Send a POST request to this endpoint to unlink the session. Then sign out to fully reset your Clerk session.',
  });
}
