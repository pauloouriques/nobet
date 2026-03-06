import { trpc } from "@nobet/api-client";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Trophy } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "../../components/loading";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";

export const Route = createFileRoute("/admin/matches")({
  component: AdminMatches,
});

type StatusFilter = "all" | "upcoming" | "finished";
type MatchResult = "home" | "draw" | "away";

function AdminMatches() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [resolveDialog, setResolveDialog] = useState<{
    id: string;
    home: string;
    away: string;
  } | null>(null);
  const [resolveResult, setResolveResult] = useState<MatchResult>("home");
  const [resolveScoreHome, setResolveScoreHome] = useState("0");
  const [resolveScoreAway, setResolveScoreAway] = useState("0");

  // Create match form state
  const [form, setForm] = useState({
    homeTeam: "",
    awayTeam: "",
    sportTitle: "",
    sportKey: "soccer_epl",
    commenceTime: "",
  });

  const utils = trpc.useUtils();
  const sportsQuery = trpc.odds.listSports.useQuery();
  const listQuery = trpc.admin.listEvents.useQuery({ page, limit: 20, completed: status });
  const createMutation = trpc.admin.createEvent.useMutation({
    onSuccess: () => {
      utils.admin.listEvents.invalidate();
      setCreateOpen(false);
      setForm({
        homeTeam: "",
        awayTeam: "",
        sportTitle: "",
        sportKey: "soccer_epl",
        commenceTime: "",
      });
    },
  });
  const resolveMutation = trpc.admin.resolveEvent.useMutation({
    onSuccess: () => {
      utils.admin.listEvents.invalidate();
      setResolveDialog(null);
    },
  });

  const totalPages = Math.ceil((listQuery.data?.total ?? 0) / 20);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Event Management</h1>
          <p className="text-sm text-[#7090b0]">{listQuery.data?.total ?? "—"} total events</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-yellow-400 font-bold text-black hover:bg-yellow-300"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Create Event
        </Button>
      </div>

      <Tabs
        value={status}
        onValueChange={(v) => {
          setStatus(v as StatusFilter);
          setPage(1);
        }}
      >
        <TabsList className="flex h-9 w-fit items-center rounded-lg bg-[#1e1e1e] border border-[#2a2a2a] gap-0 p-1">
          {(["all", "upcoming", "finished"] as const).map((s) => (
            <TabsTrigger
              key={s}
              value={s}
              className="rounded-md px-3 py-1 text-xs capitalize text-[#7090b0] data-[state=active]:bg-yellow-400 data-[state=active]:text-black data-[state=active]:font-bold data-[state=active]:shadow-none"
            >
              {s}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="rounded-lg border border-[#2a2a2a] bg-[#1e1e1e] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2a2a2a] hover:bg-transparent">
              {["Event", "League", "Status", "Start Time", "Actions"].map((h) => (
                <TableHead key={h} className="text-[11px] font-medium uppercase text-[#7090b0]">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {listQuery.isLoading
              ? ["a", "b", "c", "d", "e"].map((k) => (
                  <TableRow key={k} className="border-[#2a2a2a]">
                    {["c1", "c2", "c3", "c4", "c5"].map((c) => (
                      <TableCell key={c}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : listQuery.data?.items.map((m) => (
                  <TableRow key={m.id} className="border-[#2a2a2a] hover:bg-[#252525]">
                    <TableCell className="text-sm font-medium text-white">
                      <div>
                        <p>
                          {m.homeTeam} v {m.awayTeam}
                        </p>
                        {m.completed && m.result && (
                          <p className="text-[10px] text-green-400">
                            Result: {m.result} ({m.scoreHome}–{m.scoreAway})
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-[#a0a0a0]">{m.sportTitle}</TableCell>
                    <TableCell>
                      <Badge
                        className={`border-0 text-[10px] ${m.completed ? "bg-[#2a2a2a] text-[#555]" : "bg-blue-900/40 text-blue-400"}`}
                      >
                        {m.completed ? "finished" : "upcoming"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-[#555]">
                      {new Date(m.commenceTime).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {!m.completed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setResolveDialog({ id: m.id, home: m.homeTeam, away: m.awayTeam })
                          }
                          className="h-7 border-[#3a3a3a] bg-transparent text-xs text-white hover:bg-[#2a2a2a]"
                        >
                          <Trophy className="mr-1 h-3 w-3" />
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#7090b0]">
          <p>
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="h-7 border-[#3a3a3a] bg-transparent text-white hover:bg-[#2a2a2a]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="h-7 border-[#3a3a3a] bg-transparent text-white hover:bg-[#2a2a2a]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create match dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-[#2a2a2a] bg-[#1e1e1e] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                id: "homeTeam",
                label: "Home Team",
                key: "homeTeam" as const,
                placeholder: "e.g. Liverpool",
              },
              {
                id: "awayTeam",
                label: "Away Team",
                key: "awayTeam" as const,
                placeholder: "e.g. Arsenal",
              },
              {
                id: "sportTitle",
                label: "League / Title",
                key: "sportTitle" as const,
                placeholder: "e.g. Premier League",
                colSpan: true,
              },
            ].map(({ id, label, key, placeholder, colSpan }) => (
              <div key={id} className={colSpan ? "col-span-2" : ""}>
                <Label htmlFor={id} className="text-xs text-[#7090b0]">
                  {label}
                </Label>
                <Input
                  id={id}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="mt-1 border-[#3a3a3a] bg-[#2a2a2a] text-white placeholder-[#555]"
                />
              </div>
            ))}
            <div>
              <Label className="text-xs text-[#7090b0]">Sport</Label>
              <Select
                value={form.sportKey}
                onValueChange={(v) => setForm({ ...form, sportKey: v })}
              >
                <SelectTrigger className="mt-1 border-[#3a3a3a] bg-[#2a2a2a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#2a2a2a] bg-[#1e1e1e] text-white">
                  {(sportsQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id} className="hover:bg-[#2a2a2a]">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="commenceTime" className="text-xs text-[#7090b0]">
                Start Time
              </Label>
              <Input
                id="commenceTime"
                type="datetime-local"
                value={form.commenceTime}
                onChange={(e) => setForm({ ...form, commenceTime: e.target.value })}
                className="mt-1 border-[#3a3a3a] bg-[#2a2a2a] text-white"
              />
            </div>
          </div>
          {createMutation.error && (
            <p className="text-sm text-red-400">{createMutation.error.message}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              className="border-[#3a3a3a] bg-transparent text-white hover:bg-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              disabled={
                !form.homeTeam ||
                !form.awayTeam ||
                !form.sportTitle ||
                !form.commenceTime ||
                createMutation.isPending
              }
              onClick={() =>
                createMutation.mutate({
                  homeTeam: form.homeTeam,
                  awayTeam: form.awayTeam,
                  sportTitle: form.sportTitle,
                  sportKey: form.sportKey,
                  commenceTime: new Date(form.commenceTime).toISOString(),
                })
              }
              className="bg-yellow-400 font-bold text-black hover:bg-yellow-300"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve match dialog */}
      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent className="border-[#2a2a2a] bg-[#1e1e1e] text-white">
          <DialogHeader>
            <DialogTitle>Resolve Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#a0a0a0]">
              {resolveDialog?.home} v {resolveDialog?.away}
            </p>
            <div>
              <Label className="text-xs text-[#7090b0]">Result</Label>
              <Select
                value={resolveResult}
                onValueChange={(v) => setResolveResult(v as MatchResult)}
              >
                <SelectTrigger className="mt-1 border-[#3a3a3a] bg-[#2a2a2a] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#2a2a2a] bg-[#1e1e1e] text-white">
                  <SelectItem value="home" className="hover:bg-[#2a2a2a]">
                    Home wins (1)
                  </SelectItem>
                  <SelectItem value="draw" className="hover:bg-[#2a2a2a]">
                    Draw (X)
                  </SelectItem>
                  <SelectItem value="away" className="hover:bg-[#2a2a2a]">
                    Away wins (2)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="scoreH" className="text-xs text-[#7090b0]">
                  Score (Home)
                </Label>
                <Input
                  id="scoreH"
                  type="number"
                  min="0"
                  value={resolveScoreHome}
                  onChange={(e) => setResolveScoreHome(e.target.value)}
                  className="mt-1 border-[#3a3a3a] bg-[#2a2a2a] text-white"
                />
              </div>
              <div>
                <Label htmlFor="scoreA" className="text-xs text-[#7090b0]">
                  Score (Away)
                </Label>
                <Input
                  id="scoreA"
                  type="number"
                  min="0"
                  value={resolveScoreAway}
                  onChange={(e) => setResolveScoreAway(e.target.value)}
                  className="mt-1 border-[#3a3a3a] bg-[#2a2a2a] text-white"
                />
              </div>
            </div>
            <div className="rounded-md bg-yellow-400/10 border border-yellow-400/20 p-3 text-xs text-yellow-300">
              All pending bets on this event will be automatically resolved and winnings paid out.
            </div>
            {resolveMutation.error && (
              <p className="text-sm text-red-400">{resolveMutation.error.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResolveDialog(null)}
              className="border-[#3a3a3a] bg-transparent text-white hover:bg-[#2a2a2a]"
            >
              Cancel
            </Button>
            <Button
              disabled={resolveMutation.isPending}
              onClick={() => {
                if (!resolveDialog) return;
                resolveMutation.mutate({
                  eventId: resolveDialog.id,
                  result: resolveResult,
                  scoreHome: Number(resolveScoreHome),
                  scoreAway: Number(resolveScoreAway),
                });
              }}
              className="bg-yellow-400 font-bold text-black hover:bg-yellow-300"
            >
              Resolve & Pay Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
