/**
 * 测试推文翻译为空时的过滤功能
 */
const tweetRecordService = require('../lib/services/tweetRecordService');
const { log } = require('../lib/services/utils');

async function testTranslationFilter() {
  console.log('===== 测试推文翻译为空时的过滤功能 =====');

  // 创建测试推文记录
  const tweetWithTranslation = {
    tweet_id: 'test-with-translation',
    username: 'testuser',
    created_at: new Date().toISOString(),
    text: 'This is a test tweet with translation',
    ai_processed: {
      summary: 'Test summary',
      translation: 'This is a translation',
      is_ai_related: false,
      processed_at: new Date().toISOString()
    },
    notification_status: {
      notified: false,
      attempts: 0,
      last_attempt_at: null,
      channels: {
        email: false,
        feishu: false
      }
    }
  };

  const tweetWithEmptyTranslation = {
    tweet_id: 'test-empty-translation',
    username: 'testuser',
    created_at: new Date().toISOString(),
    text: 'This is a test tweet with empty translation',
    ai_processed: {
      summary: 'Test summary',
      translation: '',
      is_ai_related: false,
      processed_at: new Date().toISOString()
    },
    notification_status: {
      notified: false,
      attempts: 0,
      last_attempt_at: null,
      channels: {
        email: false,
        feishu: false
      }
    }
  };

  const tweetWithNullTranslation = {
    tweet_id: 'test-null-translation',
    username: 'testuser',
    created_at: new Date().toISOString(),
    text: 'This is a test tweet with null translation',
    ai_processed: {
      summary: 'Test summary',
      translation: null,
      is_ai_related: false,
      processed_at: new Date().toISOString()
    },
    notification_status: {
      notified: false,
      attempts: 0,
      last_attempt_at: null,
      channels: {
        email: false,
        feishu: false
      }
    }
  };

  const tweetWithoutAiProcessed = {
    tweet_id: 'test-without-ai-processed',
    username: 'testuser',
    created_at: new Date().toISOString(),
    text: 'This is a test tweet without ai_processed field',
    notification_status: {
      notified: false,
      attempts: 0,
      last_attempt_at: null,
      channels: {
        email: false,
        feishu: false
      }
    }
  };

  // 测试各种情况
  console.log('\n测试推文是否符合通知条件:');
  const isEligible1 = await tweetRecordService.eligibleForNotification(tweetWithTranslation);
  const isEligible2 = await tweetRecordService.eligibleForNotification(tweetWithEmptyTranslation);
  const isEligible3 = await tweetRecordService.eligibleForNotification(tweetWithNullTranslation);
  const isEligible4 = await tweetRecordService.eligibleForNotification(tweetWithoutAiProcessed);

  console.log(`- 有翻译的推文: ${isEligible1 ? '符合条件✓' : '不符合条件✗'}`);
  console.log(`- 空翻译的推文: ${isEligible2 ? '符合条件✓' : '不符合条件✗'}`);
  console.log(`- 翻译为null的推文: ${isEligible3 ? '符合条件✓' : '不符合条件✗'}`);
  console.log(`- 没有ai_processed字段的推文: ${isEligible4 ? '符合条件✓' : '不符合条件✗'}`);

  console.log('\n===== 测试完成 =====');
}

testTranslationFilter().catch(error => {
  console.error('测试过程中发生错误:', error);
}); 