import { Tweet, NotificationLog, UserSettings } from "./types";

export const mockTweets: Tweet[] = [
  {
    id: "1",
    text: "Sample tweet text",
    createdAt: "2023-05-13T14:23:00Z",
    author: {
      username: "sample",
      name: "Sample User",
      profileImageUrl: ""
    },
    translation: "示例推文"
  }
];

export const mockNotificationLogs: NotificationLog[] = [];

export const mockSettings: UserSettings = {
  monitoredAccounts: [],
  emailAddress: "",
  phoneNumber: "",
  checkFrequency: 15,
  notificationChannels: {
    email: false,
    phone: false
  }
};