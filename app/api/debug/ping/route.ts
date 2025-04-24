import { NextResponse } from 'next/server';

// 简单的ping接口，用于验证API调用和日志是否正常
export async function GET() {
  try {
    // 记录多个不同类型的日志，确保Vercel能捕获到
    console.log('[VERCEL_PING] 诊断接口被调用');
    console.info('[VERCEL_PING_INFO] 这是一条info级别日志');
    console.warn('[VERCEL_PING_WARN] 这是一条warn级别日志');
    console.error('[VERCEL_PING_ERROR] 这是一条error级别日志');
    
    // 记录环境变量信息（不含敏感值）
    console.log(`[VERCEL_ENV_CHECK] NODE_ENV=${process.env.NODE_ENV || '未设置'}`);
    console.log(`[VERCEL_ENV_CHECK] VERCEL=${process.env.VERCEL || '未设置'}`);
    console.log(`[VERCEL_ENV_CHECK] TWITTER_API_BASE=${process.env.TWITTER_API_BASE ? '已设置' : '未设置'}`);
    console.log(`[VERCEL_ENV_CHECK] TWITTER_BEARER_TOKEN=${process.env.TWITTER_BEARER_TOKEN ? '已设置' : '未设置'}`);
    
    return NextResponse.json({
      success: true,
      message: 'Ping successful',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  } catch (error) {
    console.error('[VERCEL_PING_CRITICAL] 诊断接口出错:', error);
    
    return NextResponse.json({
      success: false,
      message: '诊断接口出错',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 