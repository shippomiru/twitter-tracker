import { PricingCards } from "@/components/pricing-cards";

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="my-8 space-y-4 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">Transparent Pricing</h1>
        <p className="mx-auto max-w-[700px] text-lg text-muted-foreground">
          Choose the perfect plan for your Twitter monitoring needs
        </p>
      </div>
      <PricingCards />
    </div>
  );
}