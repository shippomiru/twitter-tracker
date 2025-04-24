const { MONITOR_CONFIG } = require('../config/config');
const twitterService = require('./twitterService');
const { log, storage } = require('./utils');
const { processTweetWithAI } = require('./aiService');
const { sendFeishuMessage } = require('./feishuService');
const { sendEmailNotification } = require('./emailService');

class MonitorService {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.settings = null; // 初始化设置为null
  }

  // 更新用户设置
  updateSettings(settings) {
    this.settings = settings;
    log('已更新监控服务设置');
    return this;
  }

  // 启动监控
  start() {
    if (this.isRunning) {
      log('监控服务已经在运行中');
      return;
    }

    log('启动监控服务...');
    this.isRunning = true;
    this.timer = setInterval(() => this.checkAllUsers(), MONITOR_CONFIG.CHECK_INTERVAL);
  }

  // 停止监控
  stop() {
    if (!this.isRunning) {
      log('监控服务未运行');
      return;
    }

    log('停止监控服务...');
    clearInterval(this.timer);
    this.isRunning = false;
  }

  // 添加监控用户
  async addUser(username) {
    try {
      // 获取用户信息
      const user = await twitterService.getUserByUsername(username);
      
      // 添加到存储
      storage.addUser(username, user.id);
      
      return true;
    } catch (error) {
      log(`添加监控用户失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 检查所有用户
  async checkAllUsers() {
    log('开始检查所有用户...');
    for (const [username, userInfo] of storage.users) {
      if (!storage.hasReachedMaxChecks(username)) {
        await this.checkUser(username);
      }
    }
  }

  // 处理新推文通知
  async processNewTweetNotification(username, tweet) {
    try {
      // 1. 调用大模型处理推文
      const aiResult = await processTweetWithAI(tweet);
      
      // 2. 准备通知内容
      const notificationContent = {
        username: username,
        tweetId: tweet.id,
        originalText: tweet.text,
        translatedText: aiResult.translation,
        analysis: aiResult.summary || `来自 @${username} 的新推文`,
        createdAt: tweet.created_at
      };

      // 3. 根据用户设置决定通知方式
      if (this.settings) {
        const { notificationChannels, emailAddress, phoneNumber } = this.settings;
        
        // 3.1 发送邮件通知
        if (notificationChannels?.email && emailAddress) {
          log(`根据用户设置发送邮件到 ${emailAddress}`);
          await sendEmailNotification({
            ...notificationContent,
            emailAddress
          });
        }
        
        // 3.2 发送飞书通知
        if (notificationChannels?.phone && phoneNumber) {
          log(`根据用户设置发送飞书通知到 ${phoneNumber}`);
          await sendFeishuMessage({
            ...notificationContent,
            phoneNumber
          });
        }
      } else {
        // 如果没有设置，使用默认方式发送通知
        // 3.3 发送飞书通知
        await sendFeishuMessage(notificationContent);

        // 3.4 发送邮件通知
        await sendEmailNotification(notificationContent);
      }

      // 4. 记录通知日志
      log(`已发送新推文通知:`, 'success');
      log(`用户: @${username}`);
      log(`推文ID: ${tweet.id}`);
      log(`分析结果: ${aiResult.summary || '无摘要'}`);

    } catch (error) {
      log(`处理新推文通知失败: ${error.message}`, 'error');
    }
  }

  // 检查单个用户
  async checkUser(username) {
    try {
      const user = storage.getUser(username);
      if (!user) {
        log(`用户 ${username} 未找到`, 'error');
        return;
      }

      // 更新检查次数
      storage.incrementCheckCount(username);

      // 获取最新推文
      const tweets = await twitterService.getUserTweets(
        user.userId,
        MONITOR_CONFIG.MAX_TWEETS_PER_CHECK
      );

      // 保存最新推文
      storage.saveLatestTweets(username, tweets);

      // 检查新推文
      const newTweets = storage.checkNewTweets(username, tweets);
      
      if (newTweets.length > 0) {
        log(`发现用户 ${username} 的新推文:`, 'success');
        // 处理每条新推文
        for (const tweet of newTweets) {
          log(`推文ID: ${tweet.id}`);
          log(`内容: ${tweet.text}`);
          log(`发布时间: ${tweet.created_at}`);
          
          // 调用通知处理流程
          await this.processNewTweetNotification(username, tweet);
        }
      }

    } catch (error) {
      log(`检查用户 ${username} 失败: ${error.message}`, 'error');
    }
  }
}

module.exports = new MonitorService(); 