import { NextResponse } from 'next/server';
import { UserSettings } from '@/lib/types';
// 导入kvStorage服务实例而不是类
const kvStorage = require('@/lib/services/kvStorage');
// 使用现有的日志工具
const { log } = require('@/lib/services/utils');

// 使用内存存储作为临时解决方案
let settings: UserSettings | null = null;

export async function GET() {
  try {
    // 从kvStorage获取设置
    const systemSettings = await kvStorage.getSystemSettings();
    const users = await kvStorage.getAllUsers();
    
    // 构建完整的设置对象
    settings = {
      ...systemSettings,
      monitoredAccounts: Object.values(users).map((user: any) => ({
        username: user.username,
        userId: user.userId,
        lastChecked: user.lastChecked
      }))
    };
    
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // 初始化设置
    let settings: UserSettings = {
      emailAddress: '',
      phoneNumber: '',
      checkFrequency: 15,
      notificationChannels: {
        email: false,
        phone: false
      },
      monitoredAccounts: []
    };
    
    // 验证和合并数据
    if (data) {
      settings = {
        ...settings,
        ...data
      };
    }
    
    // 保存系统设置
    await kvStorage.saveSystemSettings({
      emailAddress: settings.emailAddress,
      phoneNumber: settings.phoneNumber,
      checkFrequency: settings.checkFrequency,
      notificationChannels: settings.notificationChannels
    });
    
    // 处理监控账号 - 假设monitoredAccounts是账号对象数组
    if (settings.monitoredAccounts && settings.monitoredAccounts.length > 0) {
      // 先清除现有账号
      await kvStorage.clearAllUsers();
      
      // 添加新账号
      for (const account of settings.monitoredAccounts) {
        const monitorService = require('@/lib/services/monitorService');
        await monitorService.addUser(account.username);
      }
    }
    
    log(`设置已保存: ${JSON.stringify({
      emailAddress: settings.emailAddress ? '已设置' : '未设置',
      phoneNumber: settings.phoneNumber ? '已设置' : '未设置',
      checkFrequency: settings.checkFrequency,
      notificationChannels: settings.notificationChannels,
      monitoredAccounts: settings.monitoredAccounts.length
    })}`, 'info');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update settings' },
      { status: 500 }
    );
  }
}