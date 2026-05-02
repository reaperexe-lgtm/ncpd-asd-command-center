import AchievementsCard from "@/components/AchievementsCard";
import WeeklyChallengesCard from "@/components/WeeklyChallengesCard";
import MemberOfMonthCard from "@/components/MemberOfMonthCard";
import MedalWallCard from "@/components/MedalWallCard";

const AchievementsPage = () => {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-primary">🏆 Achievements & Highlights</h1>
      <p className="text-sm text-muted-foreground">Deine Badges, Wochen-Challenges und Member-of-the-Month auf einen Blick.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MemberOfMonthCard />
        <WeeklyChallengesCard />
      </div>
      <AchievementsCard />
      <MedalWallCard />
    </div>
  );
};

export default AchievementsPage;