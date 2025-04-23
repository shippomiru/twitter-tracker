export interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  author: {
    username: string;
    name: string;
    profileImageUrl: string;
  };
  translation?: string;
}

export interface NotificationLog {
  id: string;
  timestamp: string;
  tweetId: string;
  accountName: string;
  notificationType: 'email' | 'phone';
  status: 'success' | 'failed';
  errorMessage?: string;
}

export interface MonitoredAccount {
  username: string;
  name?: string;
  lastChecked?: string;
  lastTweetId?: string;
}

export interface UserSettings {
  monitoredAccounts: MonitoredAccount[];
  checkFrequency: number; // minutes
  notificationChannels: {
    email: boolean;
    phone: boolean;
  };
  emailAddress?: string;
  phoneNumber?: string;
}