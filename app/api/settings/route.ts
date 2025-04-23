import { NextResponse } from 'next/server';
import { UserSettings } from '@/lib/types';

// 使用内存存储作为临时解决方案
let settings: UserSettings | null = null;

export async function GET() {
  try {
    // 如果没有设置，返回默认值
    if (!settings) {
      settings = {
        emailAddress: '',
        phoneNumber: '',
        checkFrequency: 15,
        notificationChannels: {
          email: false,
          phone: false,
        },
        monitoredAccounts: [],
      };
    }
    
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
    
    // 验证设置
    if (!newSettings) {
      return NextResponse.json(
        { success: false, message: 'No settings provided' },
        { status: 400 }
      );
    }
    
    // 更新设置
    settings = {
      ...settings,
      ...newSettings,
      checkFrequency: typeof newSettings.checkFrequency === 'string' 
        ? parseInt(newSettings.checkFrequency, 10) 
        : newSettings.checkFrequency,
      monitoredAccounts: newSettings.monitoredAccounts || [],
      notificationChannels: newSettings.notificationChannels || {
        email: false,
        phone: false,
      },
    };
    
    // 记录日志
    console.log('Settings updated:', settings);
    
    return NextResponse.json({ 
      success: true, 
      settings,
      message: 'Settings saved successfully' 
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}