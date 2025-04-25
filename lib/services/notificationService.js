const { log } = require('./utils');
const { sendFeishuMessage } = require('./feishuService');
const { sendEmailNotification } = require('./emailService');
const tweetRecordService = require('./tweetRecordService');
const kvStorage = require('./kvStorage');

/**
 * 通知服务
 * 负责处理推文通知的合并与发送
 */
class NotificationService {
  constructor() {
    this.settings = null;
  }

  // 更新系统设置
  updateSettings(settings) {
    this.settings = settings;
    log('[NOTIFICATION] 已更新通知服务设置');
    return this;
  }

  // 准备通知内容
  prepareNotificationContent(tweets, username) {
    // 区分新推文和重试推文
    const newTweets = tweets.filter(tweet => tweet.is_new);
    const retryTweets = tweets.filter(tweet => !tweet.is_new);
    
    let notificationTitle = `【新推文通知】@${username} 共 ${tweets.length} 条推文更新`;
    let content = [];
    
    // 添加新推文部分
    if (newTweets.length > 0) {
      content.push(`--- 新推文 (${newTweets.length}条) ---\n`);
      newTweets.forEach(tweet => {
        content.push(this.formatTweetContent(tweet));
      });
    }
    
    // 添加重试推文部分
    if (retryTweets.length > 0) {
      content.push(`--- 之前未通知成功的推文 (${retryTweets.length}条) ---\n`);
      retryTweets.forEach(tweet => {
        content.push(this.formatTweetContent(tweet));
      });
    }
    
    return {
      title: notificationTitle,
      content: content.join('\n\n'),
      tweetCount: tweets.length,
      newTweetCount: newTweets.length,
      retryTweetCount: retryTweets.length
    };
  }
  
  // 格式化单条推文内容
  formatTweetContent(tweet) {
    const createdAt = new Date(tweet.created_at).toLocaleString('zh-CN');
    
    return `@${tweet.username}
摘要: ${tweet.ai_processed.summary || '无摘要'}
翻译: ${tweet.ai_processed.translation || '无翻译'}
原文: ${tweet.text}
${createdAt}`;
  }
  
  // 发送合并通知
  async sendBatchNotification(username, tweets) {
    try {
      if (!tweets || tweets.length === 0) {
        log('[NOTIFICATION] 没有需要通知的推文');
        return { success: true, email: false, feishu: false };
      }
      
      // 确保有系统设置
      if (!this.settings) {
        const systemSettings = await kvStorage.getSystemSettings();
        if (systemSettings) {
          this.settings = systemSettings;
        } else {
          log('[NOTIFICATION] 未找到系统设置，使用默认设置');
          this.settings = {
            emailAddress: '',
            phoneNumber: '',
            notificationChannels: { email: false, phone: false }
          };
        }
      }
      
      // 准备通知内容
      const { title, content, tweetCount } = this.prepareNotificationContent(tweets, username);
      
      log(`[NOTIFICATION] 准备发送批量通知: ${username}, ${tweetCount}条推文`);
      
      // 跟踪通知是否成功发送
      let notificationResult = {
        success: false,
        email: false,
        feishu: false
      };
      
      const tweetIds = tweets.map(tweet => tweet.tweet_id);
      
      // 根据用户设置决定通知方式
      if (this.settings) {
        const { notificationChannels, emailAddress, phoneNumber } = this.settings;
        
        // 发送邮件通知
        if (notificationChannels?.email && emailAddress) {
          log(`[NOTIFICATION] 根据用户设置发送邮件到 ${emailAddress}`);
          const emailSuccess = await sendEmailNotification({
            emailAddress,
            subject: title,
            body: content.replace(/\n/g, '<br>'),
            tweetIds: tweetIds
          });
          
          if (emailSuccess) {
            notificationResult.email = true;
            notificationResult.success = true;
            log(`[NOTIFICATION] 邮件通知成功发送到 ${emailAddress}`);
          }
        }
        
        // 发送飞书通知
        if (notificationChannels?.phone && phoneNumber) {
          log(`[NOTIFICATION] 根据用户设置发送飞书通知到 ${phoneNumber}`);
          const feishuSuccess = await sendFeishuMessage({
            phoneNumber,
            title: title,
            content: content,
            tweetIds: tweetIds
          });
          
          if (feishuSuccess) {
            notificationResult.feishu = true;
            notificationResult.success = true;
            log(`[NOTIFICATION] 飞书通知成功发送到 ${phoneNumber}`);
          }
        }
      } else {
        // 如果没有设置，使用默认方式发送通知
        log('[NOTIFICATION] 使用默认设置发送通知');
        
        // 尝试发送飞书通知
        const feishuSuccess = await sendFeishuMessage({
          title: title,
          content: content,
          tweetIds: tweetIds
        });
        
        if (feishuSuccess) {
          notificationResult.feishu = true;
          notificationResult.success = true;
          log('[NOTIFICATION] 飞书通知成功发送（使用默认设置）');
        }

        // 尝试发送邮件通知
        const emailSuccess = await sendEmailNotification({
          subject: title,
          body: content.replace(/\n/g, '<br>'),
          tweetIds: tweetIds
        });
        
        if (emailSuccess) {
          notificationResult.email = true;
          notificationResult.success = true;
          log('[NOTIFICATION] 邮件通知成功发送（使用默认设置）');
        }
      }
      
      // 更新通知状态
      await tweetRecordService.handleNotificationResult(username, notificationResult, tweetIds);
      
      // 记录通知结果
      if (notificationResult.success) {
        log(`[NOTIFICATION] 已发送批量通知:`, 'success');
        log(`[NOTIFICATION] 用户: @${username}`);
        log(`[NOTIFICATION] 推文数量: ${tweetCount}`);
      } else {
        log(`[NOTIFICATION] 通知发送失败: 没有可用的通知渠道或所有通知方式均失败`, 'warn');
      }
      
      return notificationResult;
    } catch (error) {
      log(`[NOTIFICATION] 发送批量通知失败: ${error.message}`, 'error');
      return { success: false, email: false, feishu: false };
    }
  }
}

module.exports = new NotificationService(); 