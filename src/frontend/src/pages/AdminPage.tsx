import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
  Lock,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { Helper } from "../backend";
import {
  useAllHelpers,
  useAllProviders,
  useCanisterState,
  useIsAdmin,
  useRegisterProvider,
  useToggleLive,
} from "../hooks/useQueries";
import { isProviderStale, statusLabel } from "../utils/providerUtils";

// ── Type inference from provider name (Option 4 workaround) ──────────────────
function inferProviderType(name: string): "MAT Clinic" | "Narcan" | "ER" {
  const lower = name.toLowerCase();
  if (
    lower.includes("narcan") ||
    lower.includes("distribution") ||
    lower.includes("naloxone")
  )
    return "Narcan";
  if (
    lower.includes("emergency") ||
    lower.includes(" er ") ||
    lower.includes("hospital") ||
    lower.includes("medical center")
  )
    return "ER";
  return "MAT Clinic";
}

function ProviderTypeBadge({ name }: { name: string }) {
  const type = inferProviderType(name);
  if (type === "Narcan")
    return (
      <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200 shrink-0">
        Narcan
      </Badge>
    );
  if (type === "ER")
    return (
      <Badge className="text-xs bg-red-100 text-red-800 border-red-200 shrink-0">
        ER
      </Badge>
    );
  return (
    <Badge className="text-xs bg-teal-900/40 text-live-green border-live-green/30 shrink-0">
      MAT Clinic
    </Badge>
  );
}

function StatusDot({
  isLive,
  lastVerified,
}: { isLive: boolean; lastVerified: bigint }) {
  const stale = isProviderStale(lastVerified);
  if (!isLive)
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/50 shrink-0" />
        Offline
      </span>
    );
  if (stale)
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-500">
        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        Stale
      </span>
    );
  return (
    <span className="flex items-center gap-1.5 text-xs text-live-green">
      <span className="w-2 h-2 rounded-full bg-live-green shrink-0" />
      Live
    </span>
  );
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***-***-****";
  return `***-***-${digits.slice(-4)}`;
}

function formatDate(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function HelperCard({ helper, idx }: { helper: Helper; idx: number }) {
  const truncatedNote =
    helper.note.length > 80 ? `${helper.note.slice(0, 80)}…` : helper.note;
  return (
    <div
      className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col gap-2"
      data-ocid={`admin.helper_item.${idx + 1}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-semibold text-sm text-foreground">
          {helper.firstName}
        </p>
        <span className="text-xs text-muted-foreground">
          {formatDate(helper.createdAt)}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>ZIP: {helper.zip}</span>
        <span>Phone: {maskPhone(helper.phone)}</span>
      </div>
      {truncatedNote && (
        <p className="text-xs text-foreground/70 italic">{truncatedNote}</p>
      )}
    </div>
  );
}

const SEED_PROVIDERS = [
  {
    id: "seed-mat-001",
    name: "Signature Health – Cleveland",
    lat: 41.4849,
    lng: -81.7984,
  },
  {
    id: "seed-mat-002",
    name: "FrontLine Service – Broadway",
    lat: 41.4578,
    lng: -81.6645,
  },
  {
    id: "seed-mat-003",
    name: "Oriana House – Akron",
    lat: 41.0814,
    lng: -81.519,
  },
  {
    id: "seed-mat-004",
    name: "Cornerstone of Recovery – Akron",
    lat: 41.057,
    lng: -81.5544,
  },
  {
    id: "seed-mat-005",
    name: "Meridian Health Services – Youngstown",
    lat: 41.0891,
    lng: -80.6551,
  },
  {
    id: "seed-mat-006",
    name: "Signature Health – Elyria",
    lat: 41.3683,
    lng: -82.1077,
  },
  {
    id: "seed-narcan-001",
    name: "AIDS Taskforce of Greater Cleveland – Narcan Distribution",
    lat: 41.5078,
    lng: -81.6621,
  },
  {
    id: "seed-narcan-002",
    name: "Community Health Center of Akron – Naloxone Distribution",
    lat: 41.08,
    lng: -81.4967,
  },
  {
    id: "seed-narcan-003",
    name: "Mahoning County Public Health – Narcan",
    lat: 41.1119,
    lng: -80.728,
  },
  {
    id: "seed-narcan-004",
    name: "Stark County Health Dept – North Canton Narcan",
    lat: 40.8756,
    lng: -81.4234,
  },
  {
    id: "seed-narcan-005",
    name: "Lorain County Health & Dentistry – Naloxone",
    lat: 41.4534,
    lng: -82.1824,
  },
  {
    id: "seed-narcan-006",
    name: "Quest Recovery – Canton Narcan Distribution",
    lat: 40.7735,
    lng: -81.3859,
  },
  {
    id: "seed-er-001",
    name: "MetroHealth Medical Center ER",
    lat: 41.4714,
    lng: -81.6997,
  },
  {
    id: "seed-er-002",
    name: "Cleveland Clinic Main Campus Emergency Room",
    lat: 41.5036,
    lng: -81.6203,
  },
  {
    id: "seed-er-003",
    name: "Summa Health – Akron City Hospital ER",
    lat: 41.0839,
    lng: -81.5063,
  },
  {
    id: "seed-er-004",
    name: "St. Elizabeth Youngstown Hospital Emergency Room",
    lat: 41.1064,
    lng: -80.6639,
  },
  {
    id: "seed-er-005",
    name: "Aultman Hospital ER – Canton",
    lat: 40.782,
    lng: -81.4191,
  },
  {
    id: "seed-er-006",
    name: "UH Elyria Medical Center Emergency Room",
    lat: 41.37,
    lng: -82.1035,
  },
];

const DECAY_24H_NS = 86_400_000_000_000n; // 24 hours in nanoseconds

export function AdminPage() {
  const { login, loginStatus } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: providers = [], isLoading: providersLoading } =
    useAllProviders();
  const { data: helpers = [], isLoading: helpersLoading } = useAllHelpers();
  const { data: canisterState } = useCanisterState();
  const registerProvider = useRegisterProvider();
  const toggleLive = useToggleLive();
  const { actor } = useActor(createActor);

  const [form, setForm] = useState({ id: "", name: "", lat: "", lng: "" });
  const [makingLiveIds, setMakingLiveIds] = useState<Set<string>>(new Set());
  const [seedProgress, setSeedProgress] = useState<{
    running: boolean;
    done: number;
    total: number;
    errors: string[];
  }>({ running: false, done: 0, total: 18, errors: [] });

  // Newly registered = registered within last 24 hours AND not yet live
  const now = BigInt(Date.now()) * 1_000_000n;
  const newlyRegistered = providers.filter(
    (p) => !p.isLive && now - p.lastVerified < DECAY_24H_NS,
  );

  const handleMakeLive = async (id: string) => {
    setMakingLiveIds((prev) => new Set(prev).add(id));
    try {
      await toggleLive.mutateAsync({ id, status: true });
      toast.success("Provider is now live on the map");
    } catch {
      toast.error("Failed to activate provider. Admin access required.");
    } finally {
      setMakingLiveIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerProvider.mutateAsync({
        id: form.id,
        name: form.name,
        lat: Number.parseFloat(form.lat),
        lng: Number.parseFloat(form.lng),
      });
      toast.success("Provider registered!");
      setForm({ id: "", name: "", lat: "", lng: "" });
    } catch {
      toast.error("Registration failed. Admin access required.");
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      await toggleLive.mutateAsync({ id, status: !current });
      toast.success(`Provider ${!current ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Toggle failed.");
    }
  };

  const handleSeedDemoData = async () => {
    if (!actor) return;
    setSeedProgress({
      running: true,
      done: 0,
      total: SEED_PROVIDERS.length,
      errors: [],
    });
    const errors: string[] = [];
    let done = 0;

    for (const p of SEED_PROVIDERS) {
      try {
        await actor.registerProvider(p.id, p.name, p.lat, p.lng);
        await actor.toggleLive(p.id, true);
        done++;
        setSeedProgress((prev) => ({ ...prev, done }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${p.name}: ${msg}`);
        setSeedProgress((prev) => ({
          ...prev,
          errors: [...prev.errors, `${p.name}: ${msg}`],
        }));
      }
    }

    setSeedProgress((prev) => ({ ...prev, running: false }));
    if (errors.length === 0) {
      toast.success("All 18 Ohio providers seeded successfully!");
    } else {
      toast.warning(
        `Seeded ${done} of ${SEED_PROVIDERS.length} providers. ${errors.length} errors.`,
      );
    }
  };

  if (adminLoading || loginStatus === "logging-in") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        data-ocid="admin.loading_state"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (loginStatus !== "success" || !isAdmin) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
        data-ocid="admin.page"
      >
        <Lock className="w-12 h-12 text-muted-foreground" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-navy mb-2">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground text-sm">
            Sign in with Internet Identity to access admin controls.
          </p>
        </div>
        <Button
          onClick={() => login()}
          className="min-h-[44px] bg-action-blue hover:bg-action-blue/90 text-white"
          data-ocid="admin.primary_button"
        >
          Sign In
        </Button>
      </div>
    );
  }

  const seedDone =
    seedProgress.done === SEED_PROVIDERS.length &&
    !seedProgress.running &&
    seedProgress.done > 0;
  const seedPercent = Math.round(
    (seedProgress.done / seedProgress.total) * 100,
  );

  return (
    <main className="min-h-screen" data-ocid="admin.page">
      {/* Dark hero header */}
      <section className="bg-navy px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-live-green" />
            <p className="text-xs font-bold uppercase tracking-widest text-live-green">
              Admin
            </p>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Admin <span className="text-live-green">Panel</span>
          </h1>
          <p className="text-on-dark">
            Provider activation, helpers, seeding, and system controls.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        {/* High-Risk Window */}
        {canisterState?.high_risk_window_active && (
          <div
            className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3"
            data-ocid="admin.error_state"
          >
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold text-amber-800">
                High-Risk Window Active
              </p>
              <p className="text-sm text-amber-700">
                Risk score above threshold for one or more providers.
              </p>
            </div>
          </div>
        )}

        {/* ── Newly Registered — Awaiting Activation ─────────────────────────── */}
        <div className="bg-card rounded-2xl shadow-card border border-border p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-5 h-5 text-live-green" />
            <h2 className="font-bold text-foreground">
              Newly Registered — Awaiting Activation
            </h2>
            {newlyRegistered.length > 0 && (
              <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200">
                {newlyRegistered.length} pending
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Providers registered in the last 24 hours that haven't been made
            live yet.
          </p>

          {providersLoading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <Skeleton key={n} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : newlyRegistered.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 py-8 text-center"
              data-ocid="admin.empty_state"
            >
              <CheckCircle2 className="w-8 h-8 text-live-green" />
              <p className="text-sm text-muted-foreground">
                No new providers awaiting activation
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border" data-ocid="admin.list">
              {newlyRegistered.map((p, i) => {
                const isActivating = makingLiveIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    data-ocid={`admin.item.${i + 1}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">
                          {p.name}
                        </p>
                        <ProviderTypeBadge name={p.name} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ID: {p.id}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={isActivating}
                      onClick={() => handleMakeLive(p.id)}
                      className="min-h-[36px] bg-live-green hover:bg-live-green/90 text-navy font-semibold self-start sm:self-auto shrink-0"
                      data-ocid={`admin.confirm_button.${i + 1}`}
                    >
                      {isActivating ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Activating…
                        </>
                      ) : (
                        <>
                          <Zap className="mr-1.5 h-3.5 w-3.5" />
                          Make Live
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Registered Helpers ─────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl shadow-card border border-border p-6">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-live-green" />
            <p className="text-xs font-bold uppercase tracking-widest text-live-green">
              Community
            </p>
          </div>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-bold text-foreground">Registered Helpers</h2>
            {helpers.length > 0 && (
              <Badge className="bg-teal-900/40 text-live-green border-live-green/30">
                {helpers.length} volunteer{helpers.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {helpersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : helpers.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 py-10 text-center"
              data-ocid="admin.helper_empty_state"
            >
              <Users className="w-8 h-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  No helpers registered yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Volunteers who sign up via the Be a Helper page will appear
                  here.
                </p>
              </div>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              data-ocid="admin.helpers_list"
            >
              {helpers.map((h, i) => (
                <HelperCard key={h.id} helper={h} idx={i} />
              ))}
            </div>
          )}
        </div>

        {/* ── Seed Demo Providers ────────────────────────────────────────────── */}
        <div className="bg-card rounded-2xl shadow-card border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-live-green" />
            <h2 className="font-bold text-foreground">Seed Demo Providers</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Populate the map with verified Ohio providers for demo and pitch
            purposes.
          </p>

          {seedDone ? (
            <div
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/40 border border-live-green/30"
              data-ocid="admin.success_state"
            >
              <CheckCircle2 className="w-5 h-5 text-live-green shrink-0" />
              <p className="text-sm font-medium text-live-green">
                All 18 providers seeded successfully
              </p>
            </div>
          ) : (
            <>
              <Button
                onClick={handleSeedDemoData}
                disabled={seedProgress.running || !actor}
                className="min-h-[44px] bg-live-green hover:bg-live-green/90 text-navy font-semibold"
                data-ocid="admin.primary_button"
              >
                {seedProgress.running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Seeding… {seedProgress.done} / {seedProgress.total}
                  </>
                ) : (
                  "Seed 18 Ohio Providers"
                )}
              </Button>

              {seedProgress.running && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {seedProgress.done} / {seedProgress.total} seeded
                    </span>
                    <span>{seedPercent}%</span>
                  </div>
                  <div className="bg-muted rounded-full h-2 w-full overflow-hidden">
                    <div
                      className="bg-live-green h-2 rounded-full transition-all duration-300"
                      style={{ width: `${seedPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {seedProgress.errors.length > 0 && (
            <div className="mt-4 space-y-1" data-ocid="admin.error_state">
              <p className="text-xs font-semibold text-destructive">
                {seedProgress.errors.length} error
                {seedProgress.errors.length > 1 ? "s" : ""}:
              </p>
              <ul className="text-xs text-destructive/80 space-y-0.5 list-disc list-inside">
                {seedProgress.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Register + All Providers ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Register provider */}
          <div className="bg-card rounded-2xl shadow-card border border-border p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-5 h-5 text-live-green" />
              <h2 className="font-bold text-foreground">Register Provider</h2>
            </div>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="reg-id">Provider ID</Label>
                <Input
                  id="reg-id"
                  value={form.id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id: e.target.value }))
                  }
                  placeholder="provider-001"
                  className="mt-1 min-h-[44px]"
                  required
                  data-ocid="admin.input"
                />
              </div>
              <div>
                <Label htmlFor="reg-name">Provider Name</Label>
                <Input
                  id="reg-name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Brightside Health — Cleveland"
                  className="mt-1 min-h-[44px]"
                  required
                  data-ocid="admin.input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="reg-lat">Latitude</Label>
                  <Input
                    id="reg-lat"
                    type="number"
                    step="any"
                    value={form.lat}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lat: e.target.value }))
                    }
                    placeholder="41.48"
                    className="mt-1 min-h-[44px]"
                    required
                    data-ocid="admin.input"
                  />
                </div>
                <div>
                  <Label htmlFor="reg-lng">Longitude</Label>
                  <Input
                    id="reg-lng"
                    type="number"
                    step="any"
                    value={form.lng}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lng: e.target.value }))
                    }
                    placeholder="-81.74"
                    className="mt-1 min-h-[44px]"
                    required
                    data-ocid="admin.input"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                ⚠ No ZIP code, no PHI stored.
              </p>
              <Button
                type="submit"
                disabled={registerProvider.isPending}
                className="w-full min-h-[44px] bg-live-green hover:bg-live-green/90 text-navy font-semibold"
                data-ocid="admin.submit_button"
              >
                {registerProvider.isPending
                  ? "Registering…"
                  : "Register Provider"}
              </Button>
            </form>
          </div>

          {/* All Providers table */}
          <div className="bg-card rounded-2xl shadow-card border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">All Providers</h2>
              {providers.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {providers.length} total
                </span>
              )}
            </div>
            {providersLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div
                className="p-8 text-center text-muted-foreground"
                data-ocid="admin.empty_state"
              >
                No providers yet.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                {providers.map((p, i) => (
                  <div
                    key={p.id}
                    className="px-4 py-3 flex items-center gap-3"
                    data-ocid={`admin.item.${i + 1}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground truncate">
                          {p.name}
                        </p>
                        <ProviderTypeBadge name={p.name} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <StatusDot
                          isLive={p.isLive}
                          lastVerified={p.lastVerified}
                        />
                        <span className="text-xs text-muted-foreground/60">
                          {Number(p.lat).toFixed(3)}, {Number(p.lng).toFixed(3)}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={p.isLive}
                      onCheckedChange={() => handleToggle(p.id, p.isLive)}
                      data-ocid={`admin.toggle.${i + 1}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
