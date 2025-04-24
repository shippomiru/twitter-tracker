import { NextResponse } from 'next/server';
// 获取日志服务
const { storage } = require('@/lib/services/utils');

export async function GET() {
  try {
    console.log('[VERCEL_LOGS_API] 日志API被调用');
    
    // 从存储中获取监控状态和日志
    const monitoringStatus = {
      // 获取所有监控用户
      accounts: Array.from(storage.users.entries() as Array<[string, any]>).map(
        ([username, userData]) => ({
          username,
          userId: userData.userId,
          lastChecked: userData.lastChecked || null,
          checkCount: userData.checkCount || 0,
          status: userData.status || 'pending'
        })
      ),
      
      // 获取通知日志
      logs: storage.getNotificationLogs() || [],
      
      // 获取最近的推文
      recentTweets: Array.from(storage.users.keys() as Iterable<string>).flatMap(username => {
        const tweets = storage.getLatestTweets(username) || [];
        return tweets.map((tweet: any) => ({
          ...tweet,
          username
        }));
      }),
      
      // 系统状态
      systemStatus: {
        lastRun: storage.systemState?.lastRun || null,
        nextScheduledRun: storage.systemState?.lastRun 
          ? new Date(new Date(storage.systemState.lastRun).getTime() + 15 * 60 * 1000).toISOString()
          : null,
        isRunning: storage.systemState?.isRunning || false,
        totalChecks: storage.systemState?.totalChecks || 0
      }
    };

    return NextResponse.json({
      success: true,
      status: monitoringStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[VERCEL_LOGS_ERROR]', error);
    
    return NextResponse.json({
      success: false,
      message: '获取日志失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}