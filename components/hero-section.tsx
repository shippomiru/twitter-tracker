import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="py-12 md:py-24">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
              Never Miss Important Tweets
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
              TweetWatcher monitors Twitter accounts in real-time and notifies you instantly through multiple channels when new tweets are posted.
            </p>
          </div>
          <div className="space-x-4">
            <Link href="/settings">
              <Button size="lg" className="animate-pulse">
                <Bell className="mr-2 h-4 w-4" />
                Start Monitoring
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                View Plans
              </Button>
            </Link>
          </div>
          <div className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center space-y-2 rounded-lg border p-4 transition-all hover:border-primary"
              >
                <div className="rounded-full bg-primary/10 p-2">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-center text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    title: "Real-time Monitoring",
    description: "Get instant notifications when important Twitter accounts post new content.",
    icon: Bell,
  },
  {
    title: "Auto Translation",
    description: "Automatically translate tweets to Chinese for easy understanding.",
    icon: (props: any) => (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
      >
        <path d="m5 8 6 6" />
        <path d="m4 14 6-6 2-3" />
        <path d="M2 5h12" />
        <path d="M7 2h1" />
        <path d="m22 22-5-10-5 10" />
        <path d="M14 18h6" />
      </svg>
    ),
  },
  {
    title: "Multi-Channel Alerts",
    description: "Get notified via email and Feishu phone alerts based on your preferences.",
    icon: (props: any) => (
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        <path d="M14.05 2a9 9 0 0 1 8 7.94" />
        <path d="M14.05 6A5 5 0 0 1 18 10" />
      </svg>
    ),
  },
];