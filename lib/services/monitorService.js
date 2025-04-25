const { MONITOR_CONFIG } = require('../config/config');
const twitterService = require('./twitterService');
const { log } = require('./utils');
const kvStorage = require('./kvStorage');
const { processTweetWithAI } = require('./aiService');
const tweetRecordService = require('./tweetRecordService');
const notificationService = require('./notificationService');

class MonitorService {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.settings = null; // 初始化设置为null
  }

  // 更新用户设置
  updateSettings(settings) {
    this.settings = settings;
    notificationService.updateSettings(settings);
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
      await kvStorage.addUser(username, user.id);
      
      return true;
    } catch (error) {
      log(`添加监控用户失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 检查所有用户
  async checkAllUsers() {
    log('开始检查所有用户...');
    const users = await kvStorage.getAllUsers();
    
    for (const username in users) {
      await this.checkUser(username);
    }
  }

  // 处理单条推文
  async processTweet(tweet, username) {
    try {
      // 1. 保存推文记录
      await tweetRecordService.saveTweetRecord({
        id: tweet.id,
        username: username,
        author: { username: username },
        created_at: tweet.created_at,
        text: tweet.text
      });
      
      // 2. 检查是否已经处理过
      const isProcessed = await tweetRecordService.isTweetProcessed(tweet.id);
      if (isProcessed) {
        log(`推文 ${tweet.id} 已经处理过，跳过AI处理`);
        return true;
      }
      
      // 3. 调用大模型处理推文
      const aiResult = await processTweetWithAI(tweet, username);
      
      // 4. 保存处理结果
      await tweetRecordService.updateTweetAIResults(tweet.id, {
        summary: aiResult.summary || '',
        translation: aiResult.translation || '',
        is_ai_related: aiResult.is_ai_related || false
      });
      
      // 5. 检查翻译是否为空
      if (!aiResult.translation || aiResult.translation.trim() === '') {
        log(`推文 ${tweet.id} 的翻译为空，将不会发送通知`, 'info');
      }
      
      log(`成功处理推文: ${tweet.id}`);
      return true;
    } catch (error) {
      log(`处理推文失败: ${error.message}`, 'error');
      return false;
    }
  }

  // 检查单个用户
  async checkUser(username) {
    try {
      // 记录当前检查时间，用于更新基准时间
      const checkTime = new Date().toISOString();
      
      // 首先获取最新的系统设置
      const systemSettings = await kvStorage.getSystemSettings();
      if (systemSettings) {
        this.settings = systemSettings;
        notificationService.updateSettings(systemSettings);
        log(`已加载系统设置，邮箱: ${this.settings.emailAddress ? '已配置' : '未配置'}, 手机号: ${this.settings.phoneNumber ? '已配置' : '未配置'}`);
      }
      
      const user = await kvStorage.getUser(username);
      if (!user) {
        log(`用户 ${username} 未找到`, 'error');
        return;
      }

      // 更新检查次数
      await kvStorage.incrementCheckCount(username);

      // 获取最新推文
      const tweets = await twitterService.getUserTweets(
        user.userId,
        MONITOR_CONFIG.MAX_TWEETS_PER_CHECK
      );

      // 保存最新推文到KV存储
      await kvStorage.saveUserTweets(username, tweets);

      // 检查新推文
      const newTweets = await kvStorage.checkNewTweets(username, tweets);
      const newTweetIds = newTweets.map(tweet => tweet.id);
      
      if (newTweets.length > 0) {
        log(`发现用户 ${username} 的新推文: ${newTweets.length} 条`, 'success');
        
        // 处理每条新推文（AI处理和记录保存）
        for (const tweet of newTweets) {
          log(`推文ID: ${tweet.id}`);
          log(`内容: ${tweet.text}`);
          log(`发布时间: ${tweet.created_at}`);
          
          // 处理推文
          await this.processTweet(tweet, username);
        }
      }
      
      // 获取所有待通知推文（包括新发现的和之前通知失败的）
      const { newTweets: newTweetsForNotify, retryTweets, allEligibleTweets, missingTweetIds } = 
        await tweetRecordService.getNotificationTweets(username, newTweetIds);
      
      // 如果有缺失的推文记录，尝试重新处理
      if (missingTweetIds && missingTweetIds.length > 0) {
        log(`发现 ${missingTweetIds.length} 条推文记录缺失，尝试重新处理`, 'warn');
        
        // 找出缺失ID对应的原始推文
        const missingTweets = newTweets.filter(tweet => missingTweetIds.includes(tweet.id));
        
        // 重新处理这些推文
        for (const tweet of missingTweets) {
          log(`重新处理缺失的推文记录: ${tweet.id}`);
          
          // 使用更多重试和等待确保记录被保存
          let success = false;
          for (let i = 0; i < 3 && !success; i++) {
            // 再次尝试处理推文
            success = await this.processTweet(tweet, username);
            if (!success) {
              // 等待更长时间再重试
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
          
          if (success) {
            log(`成功重新处理推文: ${tweet.id}`, 'success');
            
            // 获取处理后的记录检查是否符合通知条件
            const record = await tweetRecordService.getTweetRecord(tweet.id);
            const isEligible = record && await tweetRecordService.eligibleForNotification(record);
            
            if (!isEligible) {
              // 不符合通知条件（可能是翻译为空），从待通知列表移除
              log(`重新处理后推文 ${tweet.id} 不符合通知条件，从待通知列表移除`, 'info');
              await tweetRecordService.removePendingTweet(username, tweet.id);
            }
          } else {
            log(`无法重新处理推文: ${tweet.id}，将跳过此推文通知`, 'error');
          }
        }
      }
      
      // 为通知做准备，标记新/旧推文
      const notificationTweets = [
        ...newTweetsForNotify.map(tweet => ({ ...tweet, is_new: true })),
        ...retryTweets.map(tweet => ({ ...tweet, is_new: false }))
      ];
      
      // 发送合并通知
      if (notificationTweets.length > 0) {
        log(`准备发送通知, 共 ${notificationTweets.length} 条推文 (${newTweetsForNotify.length} 条新推文, ${retryTweets.length} 条重试)`);
        await notificationService.sendBatchNotification(username, notificationTweets);
      } else {
        // 检查待通知列表是否有内容但无法发送
        const pendingCount = await tweetRecordService.getPendingTweets(username).then(tweets => tweets.length);
        if (pendingCount > 0) {
          log(`有 ${pendingCount} 条推文在待通知列表中，但没有符合条件的推文可发送通知`, 'warn');
        } else {
          log(`没有需要通知的推文`);
        }
      }
      
      // 更新基准时间为当前检查时间
      // 注意：无论是否找到新推文或通知是否成功，都更新基准时间
      // 这确保下次检查只会检查从现在开始的新推文
      await kvStorage.setUserBaseline(username, checkTime);
      log(`已更新基准时间: ${checkTime}`);

    } catch (error) {
      log(`检查用户 ${username} 失败: ${error.message}`, 'error');
    }
  }

  // 清除所有监控账号
  async clearAllMonitoringAccounts() {
    console.log('[MONITOR] 正在清除所有监控账号...');
    const userCount = await kvStorage.clearAllUsers();
    console.log(`[MONITOR] 已清除 ${userCount} 个监控账号`);
    return userCount;
  }
}

module.exports = new MonitorService(); 