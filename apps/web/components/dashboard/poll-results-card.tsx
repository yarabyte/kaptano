import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { getTenantPollResults } from "@/lib/whatsapp/poll-results";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type PollResultsCardProps = {
  tenantId: string;
};

export async function PollResultsCard({ tenantId }: PollResultsCardProps) {
  const polls = await getTenantPollResults(tenantId);

  if (polls.length === 0) {
    return null;
  }

  const recentPolls = polls.slice(0, 3);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="font-heading flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5 text-emerald-600" />
            Résultats des sondages
          </CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Votes reçus via WhatsApp
          </p>
        </div>
        <Link href="/dashboard/whatsapp">
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            Détail
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentPolls.map((poll) => {
          const maxVotes = Math.max(...poll.options.map((option) => option.count), 1);
          return (
            <div key={poll.id} className="rounded-xl border border-border/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{poll.question}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {poll.leadName} · {poll.totalVoters} vote
                    {poll.totalVoters !== 1 ? "s" : ""}
                  </p>
                </div>
                {!poll.hasVotes && <Badge variant="secondary">En attente</Badge>}
              </div>
              <div className="mt-3 space-y-2">
                {poll.options.map((option) => (
                  <div key={option.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{option.name}</span>
                      <span className="font-medium tabular-nums">{option.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(option.count / maxVotes) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
