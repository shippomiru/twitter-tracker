import { NextResponse } from 'next/server';
import { UserSettings } from '@/lib/types';
import { mockSettings } from '@/lib/mock-data';

// This would be a real database in a production app
let settings = mockSettings;

export async function GET() {
  try {
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const newSettings: UserSettings = await request.json();
    
    // Validate settings
    if (!newSettings) {
      return NextResponse.json(
        { success: false, message: 'No settings provided' },
        { status: 400 }
      );
    }
    
    // Update settings
    settings = {
      ...settings,
      ...newSettings,
      // Make sure to preserve properties not provided in the update
      monitoredAccounts: newSettings.monitoredAccounts || settings.monitoredAccounts,
      notificationChannels: newSettings.notificationChannels || settings.notificationChannels,
    };
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}