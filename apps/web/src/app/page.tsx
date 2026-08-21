import { PersonalizedNewsScreen } from "@/components/personalized-news-screen";
import { personalizedNewsData } from "@/lib/personalized-news-data";

export default function Home() {
  return <PersonalizedNewsScreen data={personalizedNewsData} />;
}
