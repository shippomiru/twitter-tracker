# Resend邮件API测试

本目录包含测试Resend邮件发送API的脚本。Resend是一个简单易用的邮件发送服务。

## 准备工作

### 1. 注册Resend账户并获取API密钥

1. 访问 [Resend官网](https://resend.com/) 并注册账户
2. 登录后，在仪表盘中点击"API Keys"，然后创建一个新的API密钥
3. 复制生成的API密钥，它的格式类似于 `re_123456789...`

### 2. 配置测试脚本

在测试脚本中，替换以下变量：

- `YOUR_RESEND_API_KEY`: 替换为你的API密钥
- `test@example.com`: 替换为你想要接收测试邮件的邮箱地址
- 默认情况下，发件人邮箱是`onboarding@resend.dev`，这是Resend提供的默认发件人地址。如果你想使用自己的域名，需要在Resend平台上验证域名所有权。

## 运行测试

我们提供了两种测试脚本：

### 使用HTTP请求直接调用API

```bash
node test-resend.js
# 或
npm run test-http
```

### 使用Resend官方SDK

```bash
node test-resend-sdk.js
# 或
npm run test-sdk
```

## 如何解读结果

- 如果请求成功，你会看到"✅ 邮件发送成功!"消息，并且API响应中会包含生成的邮件ID
- 如果请求失败，你会看到"❌ 邮件发送失败!"消息，以及错误详情

## 常见问题

1. **API密钥错误**: 确保你正确复制了API密钥，并且密钥仍然有效
2. **发件人地址限制**: 如果不使用`onboarding@resend.dev`，需要确保使用的发件人地址是经过验证的
3. **请求限制**: 免费计划有API请求速率限制，如果发送过于频繁可能会被限制

## 官方文档

- [Resend API文档](https://resend.com/docs/api-reference/introduction)
- [Resend Node.js SDK](https://resend.com/docs/sdk/nodejs/introduction) 