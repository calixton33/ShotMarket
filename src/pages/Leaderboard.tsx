import { useGetLeaderboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { Trophy, Medal, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!leaderboard) return null;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-muted-foreground" />
        <h1 className="text-4xl font-medium tracking-normal">Leaderboard</h1>
      </div>

      <div className="grid gap-3">
        {leaderboard.map((entry, index) => {
          const isTop3 = index < 3;
          
          return (
            <Card key={entry.id} className={`overflow-hidden transition-all ${isTop3 ? 'border-primary bg-card' : 'bg-card border-border'}`}>
              <div className="flex items-center p-4">
                <div className="w-12 text-center flex-shrink-0 flex items-center justify-center">
                  {index === 0 && <Crown className="w-6 h-6 text-primary" />}
                  {index === 1 && <Medal className="w-6 h-6 text-foreground" />}
                  {index === 2 && <Medal className="w-6 h-6 text-muted-foreground" />}
                  {index > 2 && <span className="text-lg font-medium text-muted-foreground">#{index + 1}</span>}
                </div>
                
                <div className="flex-1 px-4">
                  <div className={`font-medium text-xl ${index === 0 ? 'text-foreground' : 'text-foreground'}`}>
                    {entry.username}
                  </div>
                  <div className="flex gap-4 text-xs font-medium text-muted-foreground mt-1">
                    <span>{entry.wins}W - {entry.losses}L</span>
                    <span>{Math.round(entry.winRate)}% WR</span>
                    <span>{entry.totalBets} BETS</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Bankroll</div>
                  <div className={`text-2xl font-medium leading-none ${entry.balance > 100 ? 'text-primary' : entry.balance < 100 ? 'text-destructive' : ''}`}>
                    {formatMoney(entry.balance)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {leaderboard.length === 0 && (
          <div className="text-center py-12 text-muted-foreground font-medium">
            No players yet.
          </div>
        )}
      </div>
    </div>
  );
}
