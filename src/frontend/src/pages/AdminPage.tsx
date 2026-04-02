import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
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

export function AdminPage() {
  const { login, loginStatus } = useInternetIdentity();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: providers = [] } = useAllProviders();
  const { data: canisterState } = useCanisterState();
  const registerProvider = useRegisterProvider();
  const toggleLive = useToggleLive();
  const verifyProvider = useVerifyProvider();

  const [form, setForm] = useState({ id: "", name: "", lat: "", lng: "" });
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  const pendingProviders = providers.filter((p) => !(p as any).is_verified);

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

  return (
    <main className="min-h-screen py-10 px-4" data-ocid="admin.page">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-navy mb-8">Admin Panel</h1>

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
            <ShieldCheck className="w-5 h-5 text-cplus-teal" />
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
                      className="min-h-[36px] bg-cplus-teal hover:bg-cplus-teal/90 text-white self-start sm:self-auto"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Register provider — NO PHI, NO ZIP */}
          <div className="bg-white rounded-2xl shadow-card border border-border p-6">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-5 h-5 text-cplus-teal" />
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
              <p className="text-xs text-muted-foreground">
                ⚠ No ZIP code, no PHI stored.
              </p>
              <Button
                type="submit"
                disabled={registerProvider.isPending}
                className="w-full min-h-[44px] bg-cplus-teal hover:bg-cplus-teal/90 text-white"
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
            <div className="px-5 py-4 border-b border-border">
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
      </div>
    </main>
  );
}
