"use client"

import { useState, useEffect } from "react";
import { UserSettings, MonitoredAccount } from "@/lib/types";
import { mockSettings } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Loader2, Save, Plus, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  emailAddress: z.string().email("Invalid email address").optional().or(z.literal("")),
  phoneNumber: z.string().regex(/^1[3-9]\d{9}$/, "Invalid phone number").optional().or(z.literal("")),
  checkFrequency: z.string(),
  notificationChannels: z.object({
    email: z.boolean(),
    phone: z.boolean(),
  }),
}).refine((data) => {
  // 如果开启了邮件通知，则邮箱必填
  if (data.notificationChannels.email && !data.emailAddress) {
    return false;
  }
  return true;
}, {
  message: "Email is required when email notification is enabled",
  path: ["emailAddress"],
}).refine((data) => {
  // 如果开启了电话通知，则手机号必填
  if (data.notificationChannels.phone && !data.phoneNumber) {
    return false;
  }
  return true;
}, {
  message: "Phone number is required when phone notification is enabled",
  path: ["phoneNumber"],
});

export function SettingsForm() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<MonitoredAccount[]>([]);
  const [newAccount, setNewAccount] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailAddress: "",
      phoneNumber: "",
      checkFrequency: "30",
      notificationChannels: {
        email: false,
        phone: false,
      },
    },
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      // 只在客户端运行时使用localStorage
      if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          form.reset(parsedSettings);
          setAccounts(parsedSettings.monitoredAccounts || []);
          return;
        }
      }
      
      // 如果没有本地设置，使用默认值
      form.reset({
        emailAddress: "",
        phoneNumber: "",
        checkFrequency: "30",
        notificationChannels: {
          email: false,
          phone: false,
        },
      });
      setAccounts([]);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [form]);

  const handleRemoveAccount = (username: string) => {
    setAccounts(accounts.filter(account => account.username !== username));
  };

  const handleAddAccount = async () => {
    if (!newAccount) return;
    
    // 检查是否已经有一个账号
    if (accounts.length >= 1) {
      toast({
        title: "Free Version Limit",
        description: "Free version only supports monitoring one account. Please remove the existing account before adding a new one.",
        variant: "destructive",
      });
      return;
    }
    
    setAddingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newAccountObj: MonitoredAccount = {
      username: newAccount.replace('@', ''),
      name: newAccount.replace('@', '')
    };
    
    setAccounts([...accounts, newAccountObj]);
    setNewAccount("");
    setAddingAccount(false);
    toast({
      title: "Account Added",
      description: `@${newAccountObj.username} has been added to your monitoring list`,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // 检查系统中是否已有其他用户设置了监控账号
      try {
        const checkResponse = await fetch('/api/logs');
        const checkResult = await checkResponse.json();
        
        // 检查现有账号
        const existingAccounts = checkResult.status?.accounts || [];
        
        // 如果有存在的监控账号，且与当前要设置的不同，则提示确认
        if (existingAccounts.length > 0) {
          // 获取当前用户要监控的账号
          const currentAccount = accounts.length > 0 ? accounts[0].username : null;
          
          // 检查是否有其他账号
          const otherAccounts = existingAccounts.filter((acc: any) => 
            acc.username !== currentAccount
          );
          
          if (otherAccounts.length > 0) {
            // 显示确认对话框
            if (!window.confirm(
              `System already has other monitoring accounts: ${otherAccounts.map((a: any) => '@' + a.username).join(', ')}.\n` +
              `Due to Twitter API restrictions, only one account can be monitored at the same time.\n` +
              `Do you want to clear existing monitoring and set your account?`
            )) {
              // 用户取消，停止设置过程
              toast({
                title: "Operation Cancelled",
                description: "Your settings were not saved. To ensure normal operation, only one account can be monitored at the same time.",
                variant: "destructive",
              });
              return;
            }
            
            // 用户确认后，会继续执行下面的设置保存流程
            console.log("User confirmed clearing existing monitoring");
          }
        }
      } catch (checkError) {
        console.error('Checking existing monitoring failed:', checkError);
        // 检查失败不阻止设置保存
      }
      
      setSavingSettings(true);
      
      // 准备要保存的数据
      const settingsToSave = {
        ...values,
        monitoredAccounts: accounts,
      };
      
      // 保存到localStorage
      localStorage.setItem('userSettings', JSON.stringify(settingsToSave));
      
      // 清空日志
      localStorage.removeItem('notificationLogs');
      
      try {
        console.log('Starting to save settings to API');
        
        // 调用settings API保存设置
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settingsToSave)
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          toast({
            title: 'Settings Saved',
            description: 'Monitoring settings updated, system will check for new tweets at the set frequency',
          });
          
          // 如果有警告信息
          if (result.warning) {
            toast({
              title: 'Warning',
              description: result.warning,
              variant: 'destructive',
            });
          }
        } else {
          console.error('Failed to save settings:', result.message);
          toast({
            title: 'Warning',
            description: `Failed to save settings: ${result.message || 'Unknown error'}`,
            variant: 'destructive',
          });
        }
      } catch (apiError) {
        console.error('Error calling settings API:', apiError);
        
        // 增加更多诊断信息
        const errorDetails = apiError instanceof Error 
          ? `${apiError.name}: ${apiError.message}` 
          : String(apiError);
        
        console.error(`Detailed error: ${errorDetails}`);
        
        toast({
          title: 'API Error',
          description: `Failed to save settings: ${errorDetails}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="accounts" className="space-y-8">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="accounts">Monitored Accounts</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>
            <Button type="submit" disabled={savingSettings}>
              {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </Button>
          </div>
          
          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Twitter Accounts</CardTitle>
                <CardDescription>
                  Add Twitter accounts you want to monitor for new tweets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Add Twitter username (e.g., @sama)"
                      value={newAccount}
                      onChange={(e) => setNewAccount(e.target.value)}
                      disabled={addingAccount}
                    />
                  </div>
                  <Button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleAddAccount();
                    }} 
                    disabled={!newAccount || addingAccount}
                  >
                    {addingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Add
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {accounts.length > 0 ? (
                    accounts.map((account) => (
                      <div key={account.username} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={`https://unavatar.io/twitter/${account.username}`} alt={account.username} />
                            <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">@{account.username}</p>
                            {account.lastChecked && (
                              <p className="text-xs text-muted-foreground">
                                Last checked: {new Date(account.lastChecked).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveAccount(account.username)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground">No accounts added yet</p>
                      <p className="text-xs text-muted-foreground">Add Twitter accounts to start monitoring</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="checkFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        defaultValue="30"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select how often to check for new tweets" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">Every 30 minutes</SelectItem>
                          <SelectItem value="60">Every hour</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How frequently FlashTweet will check for new tweets
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <div className="space-y-4">
                  <FormLabel>Notification Channels</FormLabel>
                  <FormDescription>
                    Select how you want to be notified when new tweets are found
                  </FormDescription>
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="notificationChannels.email"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Receive a notification email when new tweets are posted
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("notificationChannels.email") && (
                      <FormField
                        control={form.control}
                        name="emailAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="" {...field} />
                            </FormControl>
                            <FormMessage className="text-destructive" />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    <FormField
                      control={form.control}
                      name="notificationChannels.phone"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Phone Call Notifications</FormLabel>
                            <FormDescription>
                              Receive a phone call via Feishu when important tweets are posted
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("notificationChannels.phone") && (
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Phone Number Linked to Feishu</FormLabel>
                            <FormControl>
                              <Input placeholder="" {...field} />
                            </FormControl>
                            <FormMessage className="text-destructive" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}