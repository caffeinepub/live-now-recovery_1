import { AlertTriangle, Info } from "lucide-react";
import { ProviderStatus } from "../backend";
import { useEmergencyMode } from "../hooks/useEmergencyMode";
import { useAllProviders } from "../hooks/useQueries";
import { isProviderStale } from "../utils/providerUtils";

// Emergency banner logic:
// - The full red "After Hours" alert only shows when BOTH:
//   (a) it is after 5pm ET or a weekend, AND
//   (b) there are ZERO active/live providers right now (including 24/7 kiosks)
// - Naloxone Kiosks are always "available" (24/7) — they count toward liveCount.
//   If any kiosk exists, liveCount > 0, so the full alert almost never fires.
// - If after hours but kiosks ARE available, show a softer informational banner.
// Goal: route patients to live providers first; hotline is the last resort.
export function EmergencyBanner() {
  const isEmergencyMode = useEmergencyMode();
  const { data: providers = [] } = useAllProviders();

  // Naloxone Kiosks count as always available (24/7)
  const kioskCount = providers.filter(
    (p) => (p as { providerType?: string }).providerType === "Naloxone Kiosk",
  ).length;

  const liveCount =
    providers.filter(
      (p) =>
        p.status === ProviderStatus.Live && !isProviderStale(p.lastVerified),
    ).length + kioskCount;

  // Show the full emergency alert only when after-hours AND no providers at all
  const showFullAlert = isEmergencyMode && liveCount === 0;

  // Show a softer informational message if after-hours but kiosks are available
  const showSoftAlert = isEmergencyMode && liveCount === 0 && kioskCount > 0;

  if (!isEmergencyMode) return null;

  // Soft alert: after hours but kiosks provide 24/7 access
  if (showSoftAlert || (isEmergencyMode && kioskCount > 0 && liveCount > 0)) {
    return (
      <div
        className="w-full text-sm font-medium py-2.5 px-4"
        aria-live="polite"
        data-ocid="emergency.banner"
        style={{
          background: "oklch(0.18 0.04 240)",
          borderBottom: "1px solid oklch(0.28 0.06 240)",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap text-center">
          <Info
            className="w-4 h-4 shrink-0"
            style={{ color: "#6ee7d0" }}
            aria-hidden="true"
          />
          <span style={{ color: "#6ee7d0" }} className="font-semibold">
            After-hours access available
          </span>
          <span style={{ color: "oklch(0.72 0.04 220)" }}>
            — Naloxone kiosks and ER bridge clinics are open 24/7. See the map
            below.
          </span>
          <a
            href="tel:833-234-6343"
            className="font-bold underline underline-offset-2 hover:opacity-90 transition-opacity min-h-[44px] inline-flex items-center"
            style={{ color: "#6ee7d0" }}
            data-ocid="emergency.link"
          >
            833-234-6343
          </a>
        </div>
      </div>
    );
  }

  if (!showFullAlert) return null;

  return (
    <div
      className="w-full bg-destructive text-destructive-foreground text-sm font-medium py-2.5 px-4"
      role="alert"
      aria-live="polite"
      aria-label="Emergency crisis resources — after hours, no live providers"
      data-ocid="emergency.banner"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 flex-wrap text-center">
        <AlertTriangle
          className="w-4 h-4 shrink-0 pulse-slow"
          aria-hidden="true"
        />
        <span className="font-semibold">
          After Hours — No providers live now. Call Ohio MAR NOW:
        </span>
        <a
          href="tel:833-234-6343"
          className="font-bold underline underline-offset-2 hover:opacity-90 transition-opacity min-h-[44px] inline-flex items-center"
          data-ocid="emergency.link"
        >
          833-234-6343
        </a>
        <span className="opacity-90">
          | After Hours Crisis Support Available
        </span>
      </div>
    </div>
  );
}
