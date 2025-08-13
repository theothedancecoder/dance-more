import { NextRequest, NextResponse } from 'next/server';
import { getDefaultFavicon } from '@/lib/favicon';

// This route provides additional favicon formats and debugging
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'ico';
  const size = parseInt(searchParams.get('size') || '32');
  const debug = searchParams.get('debug') === 'true';
  
  try {
    if (debug) {
      return NextResponse.json({
        favicon: 'dancemore',
        format,
        size,
        timestamp: new Date().toISOString(),
        headers: Object.fromEntries(request.headers.entries())
      });
    }
    
    // Always serve the DanceMore favicon regardless of tenant
    const defaultFavicon = await getDefaultFavicon();
    
    return new NextResponse(defaultFavicon, {
      status: 200,
      headers: {
        'Content-Type': format === 'png' ? 'image/png' : 'image/x-icon',
        'Cache-Control': 'public, max-age=86400',
        'X-Favicon': 'dancemore',
      },
    });
    
  } catch (error) {
    console.error('❌ Favicon API error:', error);
    
    if (debug) {
      return NextResponse.json({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    return new NextResponse('Favicon not available', { status: 500 });
  }
}

export const dynamic = 'force-static';
export const runtime = 'nodejs';
