import { NextResponse } from 'next/server';
// 引入监控服务和KV存储
const monitorService = require('@/lib/services/monitorService');
const kvStorage = require('@/lib/services/kvStorage');
const { log } = require('@/lib/services/utils');

// 此API设计为由外部Cron Job调用，每15分钟执行一次
// 例如可以使用Vercel Cron Jobs或外部服务如cron-job.org
export async function GET(request: Request) {
  try {
    console.log(`[CRON_JOB_START] 推文检查定时任务开始执行: ${new Date().toISOString()}`);
    
    // 检查API秘钥（防止未授权访问）
    const url = new URL(request.url);
    const apiKey = url.searchParams.get('key');
    
    // 如果设置了API_KEY环境变量，则进行验证
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      console.error(`[CRON_AUTH_ERROR] 无效的API密钥`);
      return NextResponse.json({
        success: false,
        message: 'Invalid API key'
      }, { status: 401 });
    }
    
    // 更新系统状态
    await kvStorage.saveSystemState({
      lastRun: new Date().toISOString(),
      isRunning: true,
      totalChecks: (await kvStorage.getSystemState()).totalChecks + 1 || 1
    });
    
    // 获取所有监控用户
    const users = Object.keys(await kvStorage.getAllUsers());
    
    if (users.length === 0) {
      console.log(`[CRON_JOB] 没有需要监控的用户`);
      
      // 更新系统状态
      await kvStorage.saveSystemState({
        isRunning: false
      });
      
      return NextResponse.json({
        success: true,
        message: 'No users to monitor',
        result: { checkedUsers: 0 }
      });
    }
    
    console.log(`[CRON_JOB] 开始检查 ${users.length} 个用户的新推文`);
    
    // 处理所有用户的结果
    const results = await Promise.all(users.map(async (username) => {
      try {
        console.log(`[CRON_USER] 开始检查用户 ${username}`);
        
        // 调用监控服务检查用户
        await monitorService.checkUser(username);
        
        // 获取最新推文
        const tweets = await kvStorage.getUserTweets(username) || [];
        
        return {
          username,
          status: 'checked',
          tweetsCount: tweets.length,
          lastChecked: new Date().toISOString()
        };
      } catch (error) {
        console.error(`[CRON_ERROR] 检查用户 ${username} 出错:`, error);
        
        return {
          username,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }));
    
    // 更新系统状态
    await kvStorage.saveSystemState({
      isRunning: false,
      lastCompleted: new Date().toISOString()
    });
    
    console.log(`[CRON_JOB_END] 推文检查任务完成`);
    
    return NextResponse.json({
      success: true,
      message: `已检查 ${users.length} 个用户的推文`,
      results,
      systemStatus: await kvStorage.getSystemState()
    });
  } catch (error) {
    console.error(`[CRON_CRITICAL_ERROR] 定时任务执行出错:`, error);
    
    // 确保更新系统状态
    try {
      await kvStorage.saveSystemState({
        isRunning: false,
        lastError: new Date().toISOString(),
        lastErrorMessage: error instanceof Error ? error.message : String(error)
      });
    } catch (stateError) {
      console.error(`[CRON_ERROR] 更新错误状态失败:`, stateError);
    }
    
    return NextResponse.json({
      success: false,
      message: '检查推文失败',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 