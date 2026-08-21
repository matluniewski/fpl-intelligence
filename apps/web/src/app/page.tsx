import { AppShell } from "@/components/app-shell";
import { PersonalizedNewsScreen } from "@/components/personalized-news-screen";
import { personalizedNewsData } from "@/lib/personalized-news-data";

export default function Home() {
  return (
    <AppShell
      navigation={[
        { href: "#overview", label: "Overview" },
        { href: "#squad", label: "Squad optimizer" },
        { href: "#transfers", label: "Transfers" },
        { href: "#news", label: "News intelligence", active: true },
      ]}
      pageTitle="News intelligence"
      pageDescription="Relevant squad and watchlist signals, shown with their decision context."
      seasonLabel="Illustrative season"
      gameweekLabel="Illustrative gameweek and deadline"
      statuses={[
        {
          state: "synced",
          label: "Reference data synced",
          detail: "Illustrative status",
        },
        {
          state: "refreshing",
          label: "News monitor refreshing",
          detail: "Illustrative status",
        },
      ]}
    >
      <PersonalizedNewsScreen data={personalizedNewsData} />
    </AppShell>
  );
}
