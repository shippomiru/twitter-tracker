router.post('/clearAllMonitoringAccounts', authMiddleware, (req, res) => {
  try {
    const userCount = monitorService.clearAllMonitoringAccounts();
    console.log(`[API] 已通过API请求清除所有监控账号，共 ${userCount} 个账号`);
    res.json({ success: true, message: `已清除 ${userCount} 个监控账号` });
  } catch (error) {
    console.error('[API] 清除监控账号失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}); 