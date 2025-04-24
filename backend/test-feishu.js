// 发送电话提醒
async function sendUrgentPhone(messageId, userId, token) {
  try {
    console.log(`开始发送电话加急，message_id: ${messageId}, user_id: ${userId}`);
    console.log(`使用的token: ${token.substring(0, 10)}...`);
    
    const response = await axios.post(
      `${FEISHU_API_BASE}/im/v1/messages/${messageId}/urgent?receive_id_type=user_id`,
      {
        user_id_list: [userId]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('电话提醒发送成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('发送电话提醒失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('错误详情:', JSON.stringify(error.response.data || {}, null, 2));
    }
    throw error;
  }
}

// 简化后的通知流程
async function notificationFlow(userId, content) {
  try {
    // 获取 token
    const token = await getTenantAccessToken();

    // 发送消息
    const messageId = await sendMessage(userId, token);
    console.log('消息发送成功，messageId:', messageId);
    console.log('消息发送完成，电话加急和检查已读功能需要企业认证后才能使用');
    
    return messageId;
  } catch (error) {
    console.error('通知流程出错:', error);
  }
}

// 测试简化后的通知流程
async function main() {
  try {
    const userId = 'dcb5ccf3'; // 测试用户ID
    const content = {
      text: '测试消息 - 这是一条测试消息，请及时查看。\nTest message - This is a test message, please check it promptly.'
    };

    const messageId = await notificationFlow(userId, content);
    console.log('测试完成，消息ID:', messageId);
  } catch (error) {
    console.error('测试失败:', error);
  }
}

main(); 