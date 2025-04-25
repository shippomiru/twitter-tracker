import { NextResponse } from 'next/server';
const twitterUserCache = require('@/lib/services/twitterUserCache');
const { log } = require('@/lib/services/utils');

// 获取缓存统计信息
export async function GET() {
  try {
    const stats = await twitterUserCache.getStats();
    return NextResponse.json({ 
      success: true, 
      stats: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    log(`API获取Twitter缓存统计出错: ${error.message}`, 'error');
    return NextResponse.json(
      { success: false, message: '获取缓存统计失败', error: error.message },
      { status: 500 }
    );
  }
}

// 添加或更新缓存
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { username, userId } = data;
    
    if (!username || !userId) {
      return NextResponse.json(
        { success: false, message: '用户名和用户ID不能为空' },
        { status: 400 }
      );
    }
    
    const result = await twitterUserCache.saveUserId(username, userId);
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: `成功缓存用户映射: ${username} -> ${userId}`
      });
    } else {
      return NextResponse.json(
        { success: false, message: '缓存保存失败' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    log(`API保存Twitter缓存出错: ${error.message}`, 'error');
    return NextResponse.json(
      { success: false, message: '保存缓存失败', error: error.message },
      { status: 500 }
    );
  }
}

// 删除缓存
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const username = url.searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        { success: false, message: '用户名参数不能为空' },
        { status: 400 }
      );
    }
    
    const result = await twitterUserCache.clearUser(username);
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: `成功删除用户缓存: ${username}`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `未找到用户缓存: ${username}`
      });
    }
  } catch (error: any) {
    log(`API删除Twitter缓存出错: ${error.message}`, 'error');
    return NextResponse.json(
      { success: false, message: '删除缓存失败', error: error.message },
      { status: 500 }
    );
  }
} 