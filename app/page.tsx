import { TweetFeed } from '@/components/tweet-feed';
import { HeroSection } from '@/components/hero-section';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-6">
      <HeroSection />
      <TweetFeed />
    </div>
  );
}