"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type User = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  active: boolean;
};

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = (await res.json()) as { users: User[] };
      setUsers(data.users);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(user: User) {
    await fetch(`/api/team/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    load();
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName }),
    });
    const data = (await res.json()) as { error?: string; emailSent?: boolean };
    if (!res.ok) {
      setInviteMessage(data.error ?? "Impossible d'inviter cet agent");
      return;
    }
    setInviteMessage(
      data.emailSent
        ? "Invitation envoyée par email avec les identifiants de connexion."
        : "Agent créé. Configurez SMTP pour envoyer l'invitation par email."
    );
    setEmail("");
    setFullName("");
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Équipe</h1>
        <p className="text-muted-foreground">Invitez des agents pour la capture sur stand</p>
      </div>

      {inviteMessage && (
        <div className="rounded-lg border border-primary/20 bg-accent p-4 text-sm">
          {inviteMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inviter un agent</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={invite} className="flex flex-wrap gap-3">
            <div className="space-y-2">
              <Label htmlFor="agentName">Nom</Label>
              <Input id="agentName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentEmail">Email</Label>
              <Input id="agentEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex items-end">
              <Button type="submit">
                <UserPlus className="mr-2 h-4 w-4" />
                Inviter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-accent/30">
            <tr>
              <th className="px-4 py-3 text-left">Nom</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Rôle</th>
              <th className="px-4 py-3 text-left">Statut</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="px-4 py-3">{u.fullName ?? "—"}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.active ? "success" : "secondary"}>
                    {u.active ? "Actif" : "Inactif"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {u.role === "AGENT" && (
                    <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                      {u.active ? "Désactiver" : "Réactiver"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
