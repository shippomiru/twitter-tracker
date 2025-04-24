const monitorService = require('./monitorService');
const { log } = require('./utils');

async function testMonitor() {
  try {
    // 添加测试用户
    await monitorService.addUser('night_breeze_zz');
    
    // 启动监控服务
    log('启动监控服务...');
    monitorService.start();
    
    // 运行35分钟（确保能完成两次15分钟的检查）
    await new Promise(resolve => setTimeout(resolve, 35 * 60 * 1000));
    
    // 停止监控服务
    log('停止监控服务...');
    monitorService.stop();
    
    log('测试完成，监控服务已停止');
  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`, 'error');
  }
}

// 运行测试
testMonitor(); 