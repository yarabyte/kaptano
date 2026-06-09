"use client";

import { useEffect, useState } from "react";
import { Plus, Calendar, Pencil, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Event = {
  id: string;
  name: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  _count: { stands: number };
};

type EventForm = {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
};

const emptyForm: EventForm = { name: "", location: "", startDate: "", endDate: "" };

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function toIsoDate(date: string, endOfDay = false): string {
  return new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}`).toISOString();
}

function formatEventDates(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (d: string) =>
    new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(d));
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  if (start) return `À partir du ${fmt(start)}`;
  return `Jusqu'au ${fmt(end!)}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/events");
    const data = (await res.json()) as { events: Event[] };
    setEvents(data.events ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createEvent(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        location: form.location || undefined,
        startDate: form.startDate ? toIsoDate(form.startDate) : undefined,
        endDate: form.endDate ? toIsoDate(form.endDate, true) : undefined,
      }),
    });
    setForm(emptyForm);
    setLoading(false);
    setCreateOpen(false);
    load();
  }

  function startEdit(event: Event) {
    setEditingId(event.id);
    setEditForm({
      name: event.name,
      location: event.location ?? "",
      startDate: toDateInputValue(event.startDate),
      endDate: toDateInputValue(event.endDate),
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    await fetch(`/api/events/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        location: editForm.location || undefined,
        startDate: editForm.startDate ? toIsoDate(editForm.startDate) : undefined,
        endDate: editForm.endDate ? toIsoDate(editForm.endDate, true) : undefined,
      }),
    });
    setSaving(false);
    setEditingId(null);
    load();
  }

  async function removeEvent(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (editingId === id) setEditingId(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Événements</h1>
          <p className="text-muted-foreground">Salons professionnels, foires et expositions</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel événement
        </Button>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
            <DialogDescription>
              Créez un salon, une foire ou une exposition pour regrouper vos stands.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={createEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventName">Nom</Label>
              <Input
                id="eventName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Foire BTP Douala 2026"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventLocation">Lieu</Label>
              <Input
                id="eventLocation"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Douala, Cameroun"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="eventStart">Date de début</Label>
                <DatePicker
                  id="eventStart"
                  value={form.startDate}
                  onChange={(startDate) => setForm({ ...form, startDate })}
                  placeholder="Date de début"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventEnd">Date de fin</Label>
                <DatePicker
                  id="eventEnd"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={(endDate) => setForm({ ...form, endDate })}
                  placeholder="Date de fin"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  setForm(emptyForm);
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Création…" : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {events.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="mb-4 h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">Aucun événement</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Créez votre premier salon ou foire pour organiser vos stands.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nouvel événement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="pt-6">
                {editingId === event.id ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`edit-name-${event.id}`}>Nom</Label>
                      <Input
                        id={`edit-name-${event.id}`}
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`edit-location-${event.id}`}>Lieu</Label>
                      <Input
                        id={`edit-location-${event.id}`}
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`edit-start-${event.id}`}>Date de début</Label>
                        <DatePicker
                          id={`edit-start-${event.id}`}
                          value={editForm.startDate}
                          onChange={(startDate) => setEditForm({ ...editForm, startDate })}
                          placeholder="Date de début"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`edit-end-${event.id}`}>Date de fin</Label>
                        <DatePicker
                          id={`edit-end-${event.id}`}
                          value={editForm.endDate}
                          min={editForm.startDate || undefined}
                          onChange={(endDate) => setEditForm({ ...editForm, endDate })}
                          placeholder="Date de fin"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} disabled={saving || !editForm.name.trim()}>
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <Calendar className="mt-1 h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="font-medium">{event.name}</p>
                        {event.location && (
                          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {event.location}
                          </p>
                        )}
                        {formatEventDates(event.startDate, event.endDate) && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {formatEventDates(event.startDate, event.endDate)}
                          </p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                          {event._count.stands} stand{event._count.stands !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(event)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Modifier
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeEvent(event.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
