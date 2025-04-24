"use client"

import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { NotificationLog } from "@/lib/types";
import { mockNotificationLogs } from "@/lib/mock-data";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Mail, Phone, ChevronDown, X, RefreshCw, Search } from "lucide-react";

export function LogsTable() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'email' | 'phone' | 'success' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // In a real app, this would fetch from the API
    const loadLogs = async () => {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 检查localStorage中是否有日志
      if (typeof window !== 'undefined') {
        const savedLogs = localStorage.getItem('notificationLogs');
        if (savedLogs) {
          setLogs(JSON.parse(savedLogs));
        } else {
          setLogs([]);
        }
      } else {
        setLogs([]);
      }
      
      setLoading(false);
    };

    loadLogs();
  }, []);

  const getFilteredLogs = () => {
    return logs.filter(log => {
      if (searchQuery && !log.accountName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      switch (filterType) {
        case 'email':
          return log.notificationType === 'email';
        case 'phone':
          return log.notificationType === 'phone';
        case 'success':
          return log.status === 'success';
        case 'failed':
          return log.status === 'failed';
        default:
          return true;
      }
    });
  };

  const filteredLogs = getFilteredLogs();

  const handleRefresh = async () => {
    setLoading(true);
    // Simulate API refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLogs(mockNotificationLogs);
    setLoading(false);
  };

  const getNotificationTypeIcon = (type: 'email' | 'phone') => {
    return type === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />;
  };

  const getStatusBadge = (status: 'success' | 'failed') => {
    return status === 'success' ? (
      <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400">
        Success
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400">
        Failed
      </Badge>
    );
  };

  const clearFilters = () => {
    setFilterType('all');
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-between">
                {filterType === 'all' ? 'All notifications' : 
                 filterType === 'email' ? 'Email notifications' :
                 filterType === 'phone' ? 'Phone notifications' :
                 filterType === 'success' ? 'Successful notifications' :
                 'Failed notifications'}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterType('all')}>
                All notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('email')}>
                <Mail className="mr-2 h-4 w-4" /> Email notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('phone')}>
                <Phone className="mr-2 h-4 w-4" /> Phone notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterType('success')}>
                Successful notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('failed')}>
                Failed notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {filterType !== 'all' && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <div className="flex space-x-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by account name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableCaption>
              {filteredLogs.length > 0 
                ? `A list of your recent notifications. Total: ${filteredLogs.length}` 
                : "No notification logs found."}
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {format(new Date(log.timestamp), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>@{log.accountName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getNotificationTypeIcon(log.notificationType)}
                        <span className="capitalize">{log.notificationType}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-right">
                      {log.status === 'failed' && log.errorMessage ? log.errorMessage : "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}