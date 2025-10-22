import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { getEmployeeStats } from '@/lib/employees';

export async function GET(request: NextRequest) {
  try {
    // Only allow in development or with debug flag
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get('debug') === 'true';
    
    if (process.env.NODE_ENV === 'production' && !debug) {
      return NextResponse.json(
        { error: 'Not available in production' },
        { status: 403 }
      );
    }
    
    const stats = await getEmployeeStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to get employee stats:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch employee statistics' },
      { status: 500 }
    );
  }
}