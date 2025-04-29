"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Info } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

export function PricingCards() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annually">("monthly");

  const plans = [
    {
      name: "Free",
      description: "Essential monitoring for casual users",
      price: {
        monthly: "$0",
        annually: "$0",
      },
      features: [
        "Monitor 3 Twitter accounts",
        "15-minute check frequency",
        "Email notifications",
        "Twitter-to-Chinese translation",
        "7-day notification history",
      ],
      limitations: [
        "No phone notifications",
        "Basic translation quality",
      ],
      cta: "Get Started",
      href: "/settings",
    },
    {
      name: "Pro",
      description: "Advanced monitoring for professionals",
      popular: true,
      price: {
        monthly: "$9.99",
        annually: "$7.99",
      },
      features: [
        "Monitor 10 Twitter accounts",
        "15-minute check frequency",
        "Email notifications",
        "Phone call notifications",
        "Twitter-to-Chinese translation",
        "Keyword filtering",
        "30-day notification history",
        "Priority support",
      ],
      cta: "Upgrade to Pro",
      href: "/settings",
    },
    {
      name: "Business",
      description: "Premium solution for organizations",
      price: {
        monthly: "$29.99",
        annually: "$24.99",
      },
      features: [
        "Monitor unlimited Twitter accounts",
        "Real-time monitoring",
        "All notification channels",
        "Advanced filtering options",
        "Multi-language translation",
        "90-day notification history",
        "API access",
        "Dedicated support",
        "Custom webhook integrations",
      ],
      cta: "Contact Sales",
      href: "mailto:sales@flashtweet.example",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex justify-center space-x-2 rounded-lg bg-muted p-1">
        <Button
          variant={billingInterval === "monthly" ? "default" : "outline"}
          onClick={() => setBillingInterval("monthly")}
          className="relative"
        >
          Monthly
        </Button>
        <Button
          variant={billingInterval === "annually" ? "default" : "outline"}
          onClick={() => setBillingInterval("annually")}
          className="relative"
        >
          Annually
          <Badge className="absolute -right-2 -top-2 rounded-md px-2 py-1 text-xs" variant="secondary">
            Save 20%
          </Badge>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`flex flex-col ${
              plan.popular
                ? "relative border-primary shadow-lg"
                : ""
            }`}
          >
            {plan.popular && (
              <Badge
                className="absolute -top-2 right-10 rounded-sm px-3 py-1"
                variant="default"
              >
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-6">
              <div className="space-y-2">
                <p className="text-4xl font-bold">
                  {plan.price[billingInterval]}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2">
                    <div className="rounded-full bg-primary/10 p-1">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
                {plan.limitations && plan.limitations.map((limitation) => (
                  <div key={limitation} className="flex items-start gap-2 text-muted-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="rounded-full bg-muted p-1">
                            <Info className="h-4 w-4" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">Limitation</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-sm">{limitation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                asChild
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="mb-4 text-xl font-semibold">Frequently Asked Questions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq, index) => (
            <div key={index} className="space-y-2">
              <h4 className="font-medium">{faq.question}</h4>
              <p className="text-sm text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const faqs = [
  {
    question: "How quickly will I be notified of new tweets?",
    answer: "Free plan checks every 15 minutes, Pro plan also checks every 15 minutes, and Business plan offers near real-time monitoring with immediate notifications."
  },
  {
    question: "Can I monitor private Twitter accounts?",
    answer: "No, FlashTweet can only monitor public Twitter accounts due to Twitter API limitations."
  },
  {
    question: "How accurate is the tweet translation?",
    answer: "We use DeepSeek's advanced AI translation technology, providing high-quality translations for most content."
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
  },
  {
    question: "Are there any API rate limits?",
    answer: "Free and Pro plans are subject to Twitter API rate limits. Business plans include higher quota allocations."
  },
  {
    question: "Do you offer custom enterprise solutions?",
    answer: "Yes, we provide custom enterprise solutions with additional features and dedicated support. Contact our sales team for details."
  }
];