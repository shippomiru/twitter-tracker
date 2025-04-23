import { NextResponse } from 'next/server';
import { twitterClient, translationClient, emailClient, phoneClient } from '@/lib/api-clients';
import { UserSettings, Tweet, NotificationLog } from '@/lib/types';
import { mockSettings, mockTweets } from '@/lib/mock-data';

// This would be a real database in a production app
let settings = mockSettings;
let notificationLogs: NotificationLog[] = [];

// In a real app, this would be a scheduled function
// For this MVP, we'll make it an API endpoint that could be called by a cron job
export async function GET() {
  try {
    // 1. Get all monitored accounts
    const accounts = settings.monitoredAccounts;
    const newTweets: Tweet[] = [];
    
    // 2. Check each account for new tweets
    for (const account of accounts) {
      console.log(`Checking tweets for @${account.username}`);
      
      try {
        // In a real app, this would call the Twitter API
        // For now, we'll simulate finding a new tweet sometimes
        const shouldFindNewTweet = Math.random() > 0.7;
        
        if (shouldFindNewTweet) {
          // Simulate a new tweet
          const tweet = mockTweets[Math.floor(Math.random() * mockTweets.length)];
          
          // 3. Translate the tweet
          const translation = await translationClient.translate(
            tweet.text,
            'en',
            'zh'
          );
          
          const newTweet: Tweet = {
            ...tweet,
            translation
          };
          
          newTweets.push(newTweet);
          
          // 4. Send notifications
          await sendNotifications(newTweet, settings);
          
          // 5. Update last checked time and tweet ID
          account.lastChecked = new Date().toISOString();
          account.lastTweetId = tweet.id;
        }
      } catch (error) {
        console.error(`Error processing tweets for @${account.username}:`, error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Checked ${accounts.length} accounts, found ${newTweets.length} new tweets`,
      newTweets 
    });
  } catch (error) {
    console.error('Error in monitor route:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check for new tweets' },
      { status: 500 }
    );
  }
}

async function sendNotifications(tweet: Tweet, settings: UserSettings) {
  const { notificationChannels, emailAddress, phoneNumber } = settings;
  
  // Send email notification
  if (notificationChannels.email && emailAddress) {
    try {
      const emailSent = await emailClient.sendNotification(
        emailAddress,
        `New tweet from @${tweet.author.username}`,
        `
          ${tweet.text}
          
          ${tweet.translation ? `Translation: ${tweet.translation}` : ''}
          
          View on Twitter: https://twitter.com/${tweet.author.username}/status/${tweet.id}
        `
      );
      
      const log: NotificationLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        tweetId: tweet.id,
        accountName: tweet.author.username,
        notificationType: 'email',
        status: emailSent ? 'success' : 'failed'
      };
      
      notificationLogs.push(log);
    } catch (error) {
      console.error('Error sending email notification:', error);
      
      const log: NotificationLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        tweetId: tweet.id,
        accountName: tweet.author.username,
        notificationType: 'email',
        status: 'failed',
        errorMessage: 'Failed to send email notification'
      };
      
      notificationLogs.push(log);
    }
  }
  
  // Send phone notification
  if (notificationChannels.phone && phoneNumber) {
    try {
      const phoneSent = await phoneClient.sendCallNotification(
        phoneNumber,
        `New tweet from ${tweet.author.name}: ${tweet.text.substring(0, 100)}${tweet.text.length > 100 ? '...' : ''}`
      );
      
      const log: NotificationLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        tweetId: tweet.id,
        accountName: tweet.author.username,
        notificationType: 'phone',
        status: phoneSent ? 'success' : 'failed'
      };
      
      notificationLogs.push(log);
    } catch (error) {
      console.error('Error sending phone notification:', error);
      
      const log: NotificationLog = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        tweetId: tweet.id,
        accountName: tweet.author.username,
        notificationType: 'phone',
        status: 'failed',
        errorMessage: 'Failed to connect to phone service'
      };
      
      notificationLogs.push(log);
    }
  }
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}