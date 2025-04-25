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
      checkFrequency: 30,
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
    
    // 自定义的清除函数，只清除用户和推文数据，不影响系统设置
    const clearUsersAndTweetsOnly = async () => {
      try {
        // 记录当前系统设置
        const currentSettings = await kvStorage.getSystemSettings();
        
        // 清除所有用户和推文
        await kvStorage.clearAllUsers();
        
        // 恢复系统设置
        await kvStorage.saveSystemSettings(currentSettings);
        
        log('已清除用户和推文数据，并恢复了系统设置');
        return true;
      } catch (error: any) {
        log(`清除数据时出错: ${error?.message || String(error)}`, 'error');
        return false;
      }
    };
    
    // 1. 首先清除现有监控账号和相关数据
    // 但此时不要直接调用clearAllUsers，因为它会清除系统设置
    const existingUsers = await kvStorage.getAllUsers();
    log(`清除之前用户数量: ${Object.keys(existingUsers).length}`);
    
    if (Object.keys(existingUsers).length > 0) {
      // 执行清除
      await clearUsersAndTweetsOnly();
    }
    
    // 2. 然后保存新的系统设置
    await kvStorage.saveSystemSettings({
      emailAddress: settings.emailAddress,
      phoneNumber: settings.phoneNumber,
      checkFrequency: settings.checkFrequency,
      notificationChannels: settings.notificationChannels
    });
    
    // 3. 最后添加新的监控账号
    if (settings.monitoredAccounts && settings.monitoredAccounts.length > 0) {
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
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: `Failed to update settings: ${error?.message || String(error)}` },
      { status: 500 }
    );
  }
}