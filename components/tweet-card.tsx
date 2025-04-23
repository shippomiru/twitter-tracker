"use client"

import { Tweet } from "@/lib/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Repeat, Heart, Share } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface TweetCardProps {
  tweet: Tweet;
}

export function TweetCard({ tweet }: TweetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const formattedDate = formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true });
  const tweetUrl = `https://twitter.com/${tweet.author.username}/status/${tweet.id}`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <Avatar>
            <AvatarImage src={tweet.author.profileImageUrl} alt={tweet.author.name} />
            <AvatarFallback>{tweet.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{tweet.author.name}</p>
                <p className="text-sm text-muted-foreground">@{tweet.author.username}</p>
              </div>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
            <div className={cn(
              "transition-all duration-300",
              !isExpanded && tweet.text.length > 280 ? "max-h-36 overflow-hidden" : "max-h-none"
            )}>
              <p className="whitespace-pre-wrap break-words">{tweet.text}</p>
            </div>
            {tweet.text.length > 280 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-primary h-auto py-0 px-2"
              >
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
      
      {tweet.translation && (
        <>
          <Separator />
          <div className="bg-muted/30 p-4">
            <div className="mb-2">
              <Badge variant="outline" className="gap-1 border-primary/20 text-primary">
                <span className="text-xs">中文翻译</span>
              </Badge>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm">{tweet.translation}</p>
          </div>
        </>
      )}
      
      <CardFooter className="flex justify-between p-2">
        <div className="h-9 w-9 flex items-center justify-center text-muted-foreground">
          <MessageCircle className="h-4 w-4" />
        </div>
        <div className="h-9 w-9 flex items-center justify-center text-muted-foreground">
          <Repeat className="h-4 w-4" />
        </div>
        <div className="h-9 w-9 flex items-center justify-center text-muted-foreground">
          <Heart className="h-4 w-4" />
        </div>
        <div className="h-9 w-9 flex items-center justify-center text-muted-foreground">
          <Share className="h-4 w-4" />
        </div>
      </CardFooter>
    </Card>
  );
}