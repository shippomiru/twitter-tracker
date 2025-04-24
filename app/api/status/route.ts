import { NextResponse } from 'next/server';
const kvStorage = require('@/lib/services/kvStorage');
const { log } = require('@/lib/services/utils');

// 定义用户数据类型
interface UserData {
  username?: string;
  userId?: string;
  baselineTime?: string;
  checkCount?: number;
  lastChecked?: string;
  status?: string;
  [key: string]: any;
}

// 获取当前监控状态的API
export async function GET(request: Request) {
  try {
    console.log(`[STATUS_API] 获取监控状态`);
    
    // 获取系统状态
    const systemState = await kvStorage.getSystemState();
    
    // 获取所有监控用户
    const users = await kvStorage.getAllUsers();
    const usersList = Object.entries(users).map(([username, userData]) => ({
      username,
      lastChecked: (userData as UserData).lastChecked || null,
      baselineTime: (userData as UserData).baselineTime || null,
      checkCount: (userData as UserData).checkCount || 0
    }));
    
    return NextResponse.json({
      success: true,
      systemState,
      monitoredAccounts: usersList,
      totalAccounts: usersList.length
    });
  } catch (error) {
    console.error(`[STATUS_API_ERROR] 获取监控状态失败:`, error);
    
    return NextResponse.json({
      success: false,
      message: '获取监控状态失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 