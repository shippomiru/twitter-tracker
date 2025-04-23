import { NextResponse } from 'next/server';
import { mockNotificationLogs } from '@/lib/mock-data';

// This would be a real database in a production app
let logs = mockNotificationLogs;

export async function GET() {
  try {
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Error getting logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get logs' },
      { status: 500 }
    );
  }
}