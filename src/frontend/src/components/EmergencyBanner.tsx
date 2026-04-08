import { AlertTriangle } from "lucide-react";
import { ProviderStatus } from "../backend";
import { useEmergencyMode } from "../hooks/useEmergencyMode";
import { useAllProviders } from "../hooks/useQueries";
import { isProviderStale } from "../utils/providerUtils";

// Emergency banner logic:
// - Always shows the crisis hotline (persistent resource bar)
// - The full red "After Hours" alert only shows when BOTH:
//   (a) it is after 5pm ET or a weekend, AND
//   (b) there are ZERO active/live providers right now
// Goal: route patients to live providers first; hotline is the last resort.
export function EmergencyBanner() {
  const isEmergencyMode = useEmergencyMode();
  const { data: providers = [] } = useAllProviders();

  const liveCount = providers.filter(
    (p) => p.status === ProviderStatus.Live && !isProviderStale(p.lastVerified),
  ).length;

  // Show the full emergency alert only when after-hours AND no providers are live
  const showFullAlert = isEmergencyMode && liveCount === 0;

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
