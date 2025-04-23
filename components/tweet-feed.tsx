"use client"

import { useState, useEffect } from "react";
import { Tweet } from "@/lib/types";
import { TweetCard } from "@/components/tweet-card";
import { Loader2 } from "lucide-react";
import { mockTweets } from "@/lib/mock-data";

export function TweetFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from the API
    // For now, use mock data
    const loadTweets = async () => {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTweets(mockTweets);
      setLoading(false);
    };

    loadTweets();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Latest Tweets</h2>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : tweets.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {tweets.map((tweet) => (
            <TweetCard key={tweet.id} tweet={tweet} />
          ))}
        </div>
      ) : (
        <div className="flex h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
          <h3 className="mt-4 text-lg font-semibold">No tweets found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start monitoring Twitter accounts to see tweets here
          </p>
        </div>
      )}
    </div>
  );
}