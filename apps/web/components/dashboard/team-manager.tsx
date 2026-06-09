"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Mail,
  MessageCircle,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TeamUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  active: boolean;
  createdAt: string;
};

type TeamMeta = {
  tenantName: string;
  effectivePlanTier: string;
  usesSharedWhatsapp: boolean;
  agentCount: number;
  activeAgentCount: number;
};

const ROLE_LABELS: Record<string, string> = {
  EXHIBITOR_ADMIN: "Administrateur",
  AGENT: "Agent capture",
};

function initials(name: string | null, email: string): string {
  if (name?.trim()) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email.slice(0, 2).toUpperCase();
}

export function TeamManager() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [meta, setMeta] = useState<TeamMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [actionId, setActionId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TeamUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/team");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { users: TeamUser[]; meta: TeamMeta };
    setUsers(data.users);
    setMeta(data.meta);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const admins = useMemo(
    () => users.filter((u) => u.role === "EXHIBITOR_ADMIN"),
    [users]
  );

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteMessage(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), fullName: fullName.trim() }),
      });
      const data = (await res.json()) as { error?: string; emailSent?: boolean };

      if (!res.ok) {
        setInviteMessage({ type: "err", text: data.error ?? "Impossible d'inviter cet agent" });
        return;
      }

      setInviteMessage({
        type: "ok",
        text: data.emailSent
          ? "Invitation envoyée par email avec les identifiants de connexion."
          : "Agent créé. Configurez SMTP pour envoyer l'invitation par email.",
      });
      setEmail("");
      setFullName("");
      await load();
    } catch {
      setInviteMessage({ type: "err", text: "Erreur réseau lors de l'invitation." });
    } finally {
      setInviting(false);
    }
  }

  async function toggleActive(user: TeamUser) {
    setActionId(user.id);
    try {
      const res = await fetch(`/api/team/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setInviteMessage({ type: "err", text: data.error ?? "Action impossible" });
        return;
      }
      await load();
    } finally {
      setActionId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/team/${deleteTarget.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setInviteMessage({ type: "err", text: data.error ?? "Suppression impossible" });
        return;
      }
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Équipe"
        description="Invitez des agents pour capturer des leads sur vos stands"
      >
        {meta && (
          <Badge variant="secondary" className="h-8 px-3 text-sm">
            {meta.activeAgentCount} agent{meta.activeAgentCount !== 1 ? "s actifs" : " actif"}
          </Badge>
        )}
      </PageHeader>

      {meta?.usesSharedWhatsapp && (
        <div className="flex gap-3 rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50 to-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
            <MessageCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-blue-950">WhatsApp partagé Kaptano</p>
            <p className="mt-1 text-blue-900/80">
              Sur le plan {meta.effectivePlanTier}, vos agents capturent les leads sur stand.
              Les envois WhatsApp passent par le numéro partagé de la plateforme — aucune
              configuration WhatsApp n&apos;est requise côté agent.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Membres"
          value={users.length}
          hint="Tous les comptes"
        />
        <StatCard
          icon={UserCheck}
          label="Agents actifs"
          value={meta?.activeAgentCount ?? 0}
          hint="Accès capture"
          accent="emerald"
        />
        <StatCard
          icon={Shield}
          label="Administrateurs"
          value={admins.length}
          hint="Gestion espace"
          accent="violet"
        />
      </div>

      <Card className="overflow-hidden border-primary/15 shadow-sm">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-accent/40 to-white">
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            Inviter un agent
          </CardTitle>
          <CardDescription>
            L&apos;agent recevra un email avec un mot de passe temporaire pour se connecter.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {inviteMessage && (
            <div
              className={cn(
                "mb-4 rounded-xl border px-4 py-3 text-sm",
                inviteMessage.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-destructive/30 bg-destructive/5 text-destructive"
              )}
            >
              {inviteMessage.text}
            </div>
          )}

          <form onSubmit={invite} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="agentName">Nom complet</Label>
              <Input
                id="agentName"
                placeholder="Jean Dupont"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={inviting}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentEmail">Email professionnel</Label>
              <Input
                id="agentEmail"
                type="email"
                placeholder="agent@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={inviting}
                className="h-11"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={inviting} className="h-11 w-full sm:w-auto">
                {inviting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Envoyer l&apos;invitation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="font-heading text-lg font-semibold">Membres de l&apos;équipe</h2>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement…
          </div>
        ) : users.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">Aucun membre pour le moment</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Invitez votre premier agent pour déléguer la capture sur stand.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {users.map((user) => (
              <MemberCard
                key={user.id}
                user={user}
                busy={actionId === user.id}
                onToggle={() => toggleActive(user)}
                onDelete={() => setDeleteTarget(user)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce membre ?</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  <strong>{deleteTarget.fullName ?? deleteTarget.email}</strong> sera définitivement
                  retiré de {meta?.tenantName ?? "votre espace"}. Son compte de connexion sera
                  supprimé.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = "blue",
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint: string;
  accent?: "blue" | "emerald" | "violet";
}) {
  const accentMap = {
    blue: {
      card: "border-blue-100 from-blue-50 to-white",
      icon: "bg-white/80 text-blue-600",
    },
    emerald: {
      card: "border-emerald-100 from-emerald-50 to-white",
      icon: "bg-white/80 text-emerald-600",
    },
    violet: {
      card: "border-violet-100 from-violet-50 to-white",
      icon: "bg-white/80 text-violet-600",
    },
  } as const;

  const styles = accentMap[accent];

  return (
    <Card className={cn("border bg-gradient-to-br shadow-sm", styles.card)}>
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            styles.icon
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground/80">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MemberCard({
  user,
  busy,
  onToggle,
  onDelete,
}: {
  user: TeamUser;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const isAgent = user.role === "AGENT";
  const name = user.fullName ?? user.email;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
              user.active
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            {initials(user.fullName, user.email)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{name}</p>
              <Badge variant={user.role === "EXHIBITOR_ADMIN" ? "default" : "secondary"}>
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
              <Badge variant={user.active ? "success" : "secondary"}>
                {user.active ? "Actif" : "Désactivé"}
              </Badge>
            </div>
            <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {user.email}
            </p>
          </div>
        </div>

        {isAgent && (
          <div className="flex shrink-0 gap-2 sm:ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
              disabled={busy}
              className="h-9"
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : user.active ? (
                <UserX className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
              )}
              {user.active ? "Désactiver" : "Réactiver"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={busy}
              className="h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Supprimer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
