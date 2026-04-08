import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  AlertTriangle,
  BedDouble,
  CheckCircle2,
  Clock,
  Database,
  Loader2,
  Lock,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import { HealthMonitor } from "../components/HealthMonitor";
import {
  useAllProviders,
  useCanisterState,
  useIsAdmin,
  useRegisterProvider,
  useToggleLive,
  useVerifyProvider,
} from "../hooks/useQueries";
import { isProviderStale, statusLabel } from "../utils/providerUtils";

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  MAT: "MAT Clinic",
  Narcan: "Narcan Distribution",
  ER: "Emergency Room",
};

type EmergencyStatus = "open_bed" | "72hr_bridge" | null;

function getEmergencyStatus(
  id: string,
): { status: EmergencyStatus; setAt: number } | null {
  try {
    const raw = localStorage.getItem(`emergency_status_${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      status: EmergencyStatus;
      setAt: number;
    };
    if (Date.now() - parsed.setAt > 72 * 60 * 60 * 1000) {
      localStorage.removeItem(`emergency_status_${id}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setEmergencyStatus(id: string, status: EmergencyStatus) {
  if (!status) {
    localStorage.removeItem(`emergency_status_${id}`);
  } else {
    localStorage.setItem(
      `emergency_status_${id}`,
      JSON.stringify({ status, setAt: Date.now() }),
    );
  }
}

function isERProvider(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes(" er") ||
    lower.includes("emergency") ||
    lower.includes("hospital") ||
    lower.includes("bridge")
  );
}

function formatCountdown(setAt: number): string {
  const elapsed = Date.now() - setAt;
  const remaining = 72 * 60 * 60 * 1000 - elapsed;
  if (remaining <= 0) return "Expired";
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m remaining`;
}

const SEED_PROVIDERS = [
  {
    id: "seed-mat-001",
    name: "Signature Health – Cleveland",
    lat: 41.4849,
    lng: -81.7984,
    providerType: "MAT",
  },
  {
    id: "seed-mat-002",
    name: "FrontLine Service – Broadway",
    lat: 41.4578,
    lng: -81.6645,
    providerType: "MAT",
  },
  {
    id: "seed-mat-003",
    name: "Oriana House – Akron",
    lat: 41.0814,
    lng: -81.519,
    providerType: "MAT",
  },
  {
    id: "seed-mat-004",
    name: "Cornerstone of Recovery – Akron",
    lat: 41.057,
    lng: -81.5544,
    providerType: "MAT",
  },
  {
    id: "seed-mat-005",
    name: "Meridian Health Services – Youngstown",
    lat: 41.0891,
    lng: -80.6551,
    providerType: "MAT",
  },
  {
    id: "seed-mat-006",
    name: "Signature Health – Elyria",
    lat: 41.3683,
    lng: -82.1077,
    providerType: "MAT",
  },
  {
    id: "seed-narcan-001",
    name: "AIDS Taskforce of Greater Cleveland",
    lat: 41.5078,
    lng: -81.6621,
    providerType: "Narcan",
  },
  {
    id: "seed-narcan-002",
    name: "Community Health Center of Akron",
    lat: 41.08,
    lng: -81.4967,
    providerType: "Narcan",
  },
  {
    id: "seed-narcan-003",
    name: "Mahoning County Public Health",
    lat: 41.1119,
    lng: -80.728,
    providerType: "Narcan",
  },
  {
    id: "seed-narcan-004",
    name: "Stark County Health Dept – North Canton",
    lat: 40.8756,
    lng: -81.4234,
    providerType: "Narcan",
  },
  {
    id: "seed-narcan-005",
    name: "Lorain County Health & Dentistry",
    lat: 41.4534,
    lng: -82.1824,
    providerType: "Narcan",
  },
  {
    id: "seed-narcan-006",
    name: "Quest Recovery – Canton Narcan Dist.",
    lat: 40.7735,
    lng: -81.3859,
    providerType: "Narcan",
  },
  {
    id: "seed-er-001",
    name: "MetroHealth Medical Center ER",
    lat: 41.4714,
    lng: -81.6997,
    providerType: "ER",
  },
  {
    id: "seed-er-002",
    name: "Cleveland Clinic Main Campus ER",
    lat: 41.5036,
    lng: -81.6203,
    providerType: "ER",
  },
  {
    id: "seed-er-003",
    name: "Summa Health – Akron City Hospital ER",
    lat: 41.0839,
    lng: -81.5063,
    providerType: "ER",
  },
  {
    id: "seed-er-004",
    name: "St. Elizabeth Youngstown Hospital ER",
    lat: 41.1064,
    lng: -80.6639,
    providerType: "ER",
  },
  {
    id: "seed-er-005",
    name: "Aultman Hospital ER – Canton",
    lat: 40.782,
    lng: -81.4191,
    providerType: "ER",
  },
  {
    id: "seed-er-006",
    name: "UH Elyria Medical Center ER",
    lat: 41.37,
    lng: -82.1035,
    providerType: "ER",
  },
];

export function AdminPage() {
  const { login, loginStatus } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: providers = [] } = useAllProviders();
  const { data: canisterState } = useCanisterState();
  const registerProvider = useRegisterProvider();
  const toggleLive = useToggleLive();
  const verifyProvider = useVerifyProvider();
  const { actor } = useActor(createActor);

  const [form, setForm] = useState({
    id: "",
    name: "",
    lat: "",
    lng: "",
    providerType: "MAT Clinic",
  });
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [seedProgress, setSeedProgress] = useState<{
    running: boolean;
    done: number;
    total: number;
    errors: string[];
  }>({ running: false, done: 0, total: 18, errors: [] });

  // Emergency availability state
  const [emergencyStatuses, setEmergencyStatuses] = useState<
    Record<string, { status: EmergencyStatus; setAt: number } | null>
  >({});

  useEffect(() => {
    const map: Record<
      string,
      { status: EmergencyStatus; setAt: number } | null
    > = {};
    for (const p of providers) {
      map[p.id] = getEmergencyStatus(p.id);
    }
    setEmergencyStatuses(map);
  }, [providers]);

  const handleEmergencyToggle = (id: string, status: EmergencyStatus) => {
    const current = emergencyStatuses[id]?.status;
    const next = current === status ? null : status;
    setEmergencyStatus(id, next);
    setEmergencyStatuses((prev) => ({
      ...prev,
      [id]: next ? { status: next, setAt: Date.now() } : null,
    }));
    if (next) {
      toast.success(
        `${status === "open_bed" ? "Open Bed" : "72-Hour Bridge"} status set for this provider.`,
      );
    } else {
      toast.success("Emergency status cleared.");
    }
  };

  const pendingProviders = providers.filter((p) => !p.isLive);

  const handleApprove = async (id: string) => {
    setApprovingIds((prev) => new Set(prev).add(id));
    try {
      await verifyProvider.mutateAsync(id);
      toast.success("Provider approved — now live on map");
    } catch {
      toast.error("Approval failed. Admin access required.");
    } finally {
      setApprovingIds((prev) => {
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
        providerType: form.providerType,
      });
      toast.success("Provider registered!");
      setForm({
        id: "",
        name: "",
        lat: "",
        lng: "",
        providerType: "MAT Clinic",
      });
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
        await (actor as any).registerProvider(
          p.id,
          p.name,
          p.lat,
          p.lng,
          p.providerType,
        );
        await (actor as any).toggleLive(p.id, true);
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

  // ER providers for emergency availability section
  const erProviders = providers.filter((p) => isERProvider(p.name));

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
            Provider verification, seeding, and system controls.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* High-Risk Window */}
        {canisterState?.high_risk_window_active && (
          <div
            className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3"
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

        {/* Pending Verification */}
        <div className="bg-white rounded-2xl shadow-card border border-border p-6 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-5 h-5 text-live-green" />
            <h2 className="font-bold text-navy">Pending Verification</h2>
            {pendingProviders.length > 0 && (
              <Badge className="ml-auto bg-amber-100 text-amber-800 border-amber-200">
                {pendingProviders.length} pending
              </Badge>
            )}
          </div>
          {pendingProviders.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 py-8 text-center"
              data-ocid="admin.empty_state"
            >
              <CheckCircle2 className="w-8 h-8 text-live" />
              <p className="text-sm text-muted-foreground">
                No providers pending approval
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border" data-ocid="admin.list">
              {pendingProviders.map((p, i) => {
                const pAny = p as any;
                const typeLabel =
                  PROVIDER_TYPE_LABELS[pAny.providerType] ||
                  pAny.providerType ||
                  "Unknown";
                const isApproving = approvingIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center gap-3"
                    data-ocid={`admin.item.${i + 1}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        NPI: {p.id}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs self-start sm:self-auto"
                    >
                      {typeLabel}
                    </Badge>
                    <Button
                      size="sm"
                      disabled={isApproving}
                      onClick={() => handleApprove(p.id)}
                      className="min-h-[36px] bg-live-green hover:bg-live-green/90 text-navy font-semibold self-start sm:self-auto"
                      data-ocid={`admin.confirm_button.${i + 1}`}
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Approving…
                        </>
                      ) : (
                        "Approve"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Emergency Availability Section */}
        <div
          className="rounded-2xl border p-6 mb-8"
          style={{
            background: "oklch(0.13 0.03 240)",
            border: "1px solid oklch(0.24 0.05 240)",
          }}
          data-ocid="admin.panel"
        >
          <div className="flex items-center gap-2 mb-2">
            <BedDouble className="w-5 h-5" style={{ color: "#00ff88" }} />
            <h2 className="font-bold" style={{ color: "oklch(0.90 0.01 200)" }}>
              Emergency Availability
            </h2>
            <Badge
              variant="outline"
              className="ml-auto text-[10px] font-bold border-live-green/30 text-live-green"
            >
              ER / Bridge Clinics
            </Badge>
          </div>
          <p className="text-sm mb-6" style={{ color: "oklch(0.55 0.03 220)" }}>
            Signal real-time bed or bridge prescription availability for ER and
            bridge clinics. Status is stored locally and clears after 72 hours.
          </p>

          {erProviders.length === 0 ? (
            <div className="py-8 text-center" data-ocid="admin.empty_state">
              <AlertTriangle
                className="w-8 h-8 mx-auto mb-2"
                style={{ color: "oklch(0.40 0.05 220)" }}
              />
              <p className="text-sm" style={{ color: "oklch(0.50 0.03 220)" }}>
                No ER or bridge providers found. Seed demo providers to populate
                this list.
              </p>
            </div>
          ) : (
            <div className="space-y-3" data-ocid="admin.list">
              {erProviders.map((p, i) => {
                const emergData = emergencyStatuses[p.id];
                const currentStatus = emergData?.status ?? null;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl p-4"
                    style={{
                      background: "oklch(0.16 0.03 240)",
                      border: currentStatus
                        ? "1px solid oklch(0.82 0.18 145 / 0.25)"
                        : "1px solid oklch(0.22 0.05 240)",
                    }}
                    data-ocid={`admin.item.${i + 1}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            className="font-semibold text-sm truncate"
                            style={{ color: "oklch(0.88 0.08 195)" }}
                          >
                            {p.name}
                          </p>
                          {currentStatus && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{
                                background:
                                  currentStatus === "open_bed"
                                    ? "oklch(0.55 0.18 145 / 0.15)"
                                    : "oklch(0.75 0.18 70 / 0.15)",
                                color:
                                  currentStatus === "open_bed"
                                    ? "#4ade80"
                                    : "#fbbf24",
                                border: `1px solid ${currentStatus === "open_bed" ? "#4ade8040" : "#fbbf2440"}`,
                              }}
                            >
                              {currentStatus === "open_bed" ? (
                                <BedDouble className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {currentStatus === "open_bed"
                                ? "ACTIVE: Open Bed"
                                : "ACTIVE: 72-Hr Bridge"}
                            </span>
                          )}
                        </div>
                        {emergData && (
                          <p
                            className="text-[11px] mt-0.5"
                            style={{ color: "oklch(0.45 0.03 220)" }}
                          >
                            {formatCountdown(emergData.setAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleEmergencyToggle(p.id, "open_bed")
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px]"
                          style={{
                            background:
                              currentStatus === "open_bed"
                                ? "oklch(0.55 0.18 145 / 0.25)"
                                : "oklch(0.20 0.04 240)",
                            border: `1px solid ${currentStatus === "open_bed" ? "#4ade8040" : "oklch(0.28 0.05 240)"}`,
                            color:
                              currentStatus === "open_bed"
                                ? "#4ade80"
                                : "oklch(0.60 0.04 220)",
                          }}
                          data-ocid={`admin.toggle.${i + 1}`}
                        >
                          Open Bed
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleEmergencyToggle(p.id, "72hr_bridge")
                          }
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[36px]"
                          style={{
                            background:
                              currentStatus === "72hr_bridge"
                                ? "oklch(0.75 0.18 70 / 0.20)"
                                : "oklch(0.20 0.04 240)",
                            border: `1px solid ${currentStatus === "72hr_bridge" ? "#fbbf2440" : "oklch(0.28 0.05 240)"}`,
                            color:
                              currentStatus === "72hr_bridge"
                                ? "#fbbf24"
                                : "oklch(0.60 0.04 220)",
                          }}
                          data-ocid={`admin.toggle.${i + 1}`}
                        >
                          72-Hr Bridge
                        </button>
                        {currentStatus && (
                          <button
                            type="button"
                            onClick={() => handleEmergencyToggle(p.id, null)}
                            className="p-1.5 rounded-lg transition-all min-h-[36px] min-w-[36px] flex items-center justify-center"
                            style={{
                              background: "oklch(0.20 0.04 240)",
                              border: "1px solid oklch(0.28 0.05 240)",
                              color: "oklch(0.50 0.03 220)",
                            }}
                            aria-label="Clear emergency status"
                            data-ocid={`admin.cancel_button.${i + 1}`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p
            className="text-[11px] mt-4"
            style={{ color: "oklch(0.38 0.03 220)" }}
          >
            ⓘ Emergency status is stored in this browser only. It resets
            automatically after 72 hours and does not update the canister.
          </p>
        </div>

        {/* Seed Demo Providers */}
        <div className="bg-white rounded-2xl shadow-card border border-border p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-live-green" />
            <h2 className="font-bold text-navy">Seed Demo Providers</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Populate the map with verified Ohio providers for demo and pitch
            purposes.
          </p>
          {seedDone ? (
            <div
              className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200"
              data-ocid="admin.success_state"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium text-emerald-800">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Register provider */}
          <div className="bg-white rounded-2xl shadow-card border border-border p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-5 h-5 text-live-green" />
              <h2 className="font-bold text-navy">Register Provider</h2>
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
              <div>
                <Label htmlFor="reg-type">Provider Type</Label>
                <select
                  id="reg-type"
                  value={form.providerType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, providerType: e.target.value }))
                  }
                  className="mt-1 w-full min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  data-ocid="admin.input"
                >
                  <option value="MAT Clinic">MAT Clinic</option>
                  <option value="Narcan Distribution">
                    Narcan Distribution
                  </option>
                  <option value="Emergency Room">Emergency Room</option>
                </select>
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

          {/* Provider toggles */}
          <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Users className="w-4 h-4 text-live-green" />
              <h2 className="font-bold text-navy">Provider Controls</h2>
            </div>
            {providers.length === 0 ? (
              <div
                className="p-8 text-center text-muted-foreground"
                data-ocid="admin.empty_state"
              >
                No providers yet.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {providers.map((p, i) => (
                  <div
                    key={p.id}
                    className="px-5 py-3 flex items-center gap-3"
                    data-ocid={`admin.item.${i + 1}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-navy truncate">
                        {p.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isProviderStale(p.lastVerified)
                          ? "stale"
                          : statusLabel(p.status)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {p.isLive ? "Live" : "Offline"}
                    </Badge>
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

        {/* Health Monitor */}
        <div className="mt-8">
          <HealthMonitor />
        </div>
      </div>
    </main>
  );
}
