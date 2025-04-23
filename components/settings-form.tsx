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
  phoneNumber: z.string().optional().or(z.literal("")),
  checkFrequency: z.string(),
  notificationChannels: z.object({
    email: z.boolean(),
    phone: z.boolean(),
  }),
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
      checkFrequency: "15",
      notificationChannels: {
        email: false,
        phone: false,
      },
    },
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      // 从localStorage获取设置
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        form.reset(parsedSettings);
        setAccounts(parsedSettings.monitoredAccounts || []);
        return;
      }
      
      // 如果没有本地存储的设置，使用默认值
      const defaultSettings = {
        emailAddress: '',
        phoneNumber: '',
        checkFrequency: '15',
        notificationChannels: {
          email: false,
          phone: false,
        },
        monitoredAccounts: [],
      };
      
      form.reset(defaultSettings);
      setAccounts([]);
      localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
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
      title: "Account added",
      description: `@${newAccountObj.username} has been added to your monitoring list`,
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      
      // 准备要保存的数据
      const settingsToSave = {
        ...values,
        monitoredAccounts: accounts,
      };
      
      // 保存到localStorage
      localStorage.setItem('userSettings', JSON.stringify(settingsToSave));
      
      // 显示成功提示
      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
                  <Button onClick={handleAddAccount} disabled={!newAccount || addingAccount}>
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select how often to check for new tweets" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="5">Every 5 minutes</SelectItem>
                          <SelectItem value="15">Every 15 minutes</SelectItem>
                          <SelectItem value="30">Every 30 minutes</SelectItem>
                          <SelectItem value="60">Every hour</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How frequently TweetWatcher will check for new tweets
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
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="your@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
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
                            <FormLabel>Phone Number Linked to Feishu</FormLabel>
                            <FormControl>
                              <Input placeholder="+1234567890" {...field} />
                            </FormControl>
                            <FormMessage />
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