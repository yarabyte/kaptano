import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

type RecentLead = {
  id: string;
  fullName: string;
  whatsappNumber: string;
  company: string | null;
  source: string;
  capturedAt: Date;
  stand: { name: string } | null;
};

const sourceLabels: Record<string, string> = {
  QR_SELF: "QR stand",
  AGENT: "Agent",
};

type RecentLeadsCardProps = {
  leads: RecentLead[];
};

export function RecentLeadsCard({ leads }: RecentLeadsCardProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="font-heading text-lg">Derniers leads</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Les contacts capturés récemment
          </p>
        </div>
        <Link href="/dashboard/leads">
          <Button variant="ghost" size="sm" className="gap-1 text-primary">
            Tout voir
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-slate-50/80 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-6 w-6" />
            </div>
            <p className="mt-4 font-medium">Aucun lead pour le moment</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Scannez un QR code sur votre stand ou capturez un contact depuis l&apos;app agent.
            </p>
            <Link href="/dashboard/capture" className="mt-4">
              <Button size="sm">Capturer un lead</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{lead.fullName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {lead.company ?? lead.whatsappNumber}
                    {lead.stand && (
                      <span className="text-border"> · </span>
                    )}
                    {lead.stand && (
                      <span className="text-muted-foreground">{lead.stand.name}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                    {sourceLabels[lead.source] ?? lead.source}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(lead.capturedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
