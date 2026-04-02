import { Badge } from "@/components/ui/badge";
import { useParams } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar } from "lucide-react";
import { BLOG_POSTS } from "./BlogPage";

const FULL_CONTENT: Record<string, string[]> = {
  "mat-access-ohio": [
    "Northeast Ohio's Region 13 is home to more than 1.2 million people across seven counties, yet the number of buprenorphine-waivered providers has declined for three consecutive years. When a provider closes, patients have no real-time signal — they call numbers that go to voicemail, check websites last updated in 2022, and often give up before finding care.",
    "Live Now Recovery was built to solve the information problem. By giving providers a simple, privacy-preserving toggle to mark their availability, we create the real-time layer that has never existed before. The 4-hour decay law means stale data is never presented as active — if a provider hasn't confirmed their status in 4 hours, their pin turns yellow and their status reads Unknown.",
    "Our Proof of Presence system adds a community-powered layer. Peer specialists and volunteers on the ground can generate one-time QR codes tied to a ZIP code. When scanned at a verified provider location, the system anonymously increments the presence count for that ZIP — giving policymakers and advocates real data about where care is actually happening.",
    "The data is not a solution. It's infrastructure. The solution is more providers, better reimbursement, less stigma. But you can't fix what you can't see. Live Now Recovery makes the invisible visible — for patients, for advocates, and for anyone fighting to close the MAT access gap in Region 13.",
  ],
  "cost-plus-drugs-suboxone": [
    "Buprenorphine/naloxone 8mg/2mg film — the generic version of Suboxone — costs approximately $185 per month at most retail pharmacies. That price, for a medication that is the clinical standard of care for opioid use disorder, creates a $2,220 annual barrier to recovery. For someone rebuilding their life, that number can be the difference between staying in treatment and dropping out.",
    "Mark Cuban Cost Plus Drugs offers the same medication — 60 films of generic buprenorphine/naloxone 8mg/2mg, a 30-day supply — for $45.37 per month. The savings are $139.63 per month, or $1,675 per year. MCCPD's NCPDP ID is 5755167. Any prescriber can call that in, and any patient can transfer an existing prescription.",
    "The transfer process is straightforward. Call your prescriber and ask them to send the prescription to Mark Cuban Cost Plus Drugs, NCPDP 5755167. You can also use the Cost Plus Drugs website at costplusdrugs.com to initiate a transfer directly. Most transfers are processed within one to two business days.",
    "Live Now Recovery includes the Cost Plus price bridge on every provider page because it's a clinical obligation, not a feature. If a provider is sending patients to a pharmacy where they'll pay $185 instead of $45, and no one told them there was a cheaper option, that's a system failure. We're closing that gap one page view at a time.",
  ],
  "peer-recovery-proof-of-presence": [
    "Peer recovery specialists occupy a unique position in the MAT ecosystem — they have trust that clinicians sometimes don't, and presence in communities that clinical systems often miss. They meet people at emergency rooms, at sober houses, in parking lots outside treatment centers. They know who's available and who's closed before any database does.",
    "The Proof of Presence (PoP) system was designed specifically for this community. A peer specialist can open Live Now Recovery, enter the ZIP code of the location where they're helping someone access care, and generate a one-time QR code. The code is valid for 5 minutes — long enough for a quick scan, short enough to prevent replay abuse.",
    "When that QR code is scanned at the provider location, the system records a single anonymous presence count for that ZIP. No names. No clinic record numbers. No PHI. Just: someone was here, in this ZIP, at this time. Aggregated across hundreds of interactions, those counts tell a story about where care is actually happening.",
    "Five NE Ohio peer recovery organizations are currently piloting PoP in the field. Early data shows clusters of presence in Cuyahoga, Lorain, and Summit counties that match anecdotal reports from peer specialists about which providers are actively serving patients. The invisible is becoming visible — and that visibility is the first step toward changing it.",
  ],
};

export function BlogPostPage() {
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? "";
  const post = BLOG_POSTS.find((p) => p.slug === slug);
  const content = FULL_CONTENT[slug] ?? [];

  if (!post) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        data-ocid="blog_post.error_state"
      >
        <p className="text-navy font-semibold">Post not found</p>
        <Link to="/blog" className="text-action-blue hover:underline text-sm">
          ← Back to blog
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen py-16 px-4" data-ocid="blog_post.page">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy mb-8 transition-colors"
          data-ocid="blog_post.link"
        >
          <ArrowLeft className="w-4 h-4" /> Back to blog
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <Badge className="bg-cplus-teal/10 text-cplus-teal border-0 hover:bg-cplus-teal/10">
            {post.category}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {post.date}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-navy mb-8 leading-tight">
          {post.title}
        </h1>

        <div className="prose prose-slate max-w-none">
          {content.map((para) => (
            <p
              key={para.slice(0, 40)}
              className="text-muted-foreground leading-relaxed mb-5 text-base"
            >
              {para}
            </p>
          ))}
        </div>
      </div>
    </main>
  );
}
