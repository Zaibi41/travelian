import { Briefcase } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/public/PageHeader";
import { SEO } from "@/components/SEO";

export default function CareersPage() {
  return (
    <div>
      <SEO title="Careers at Travelian" description="Careers at Travelian in Lahore. Open positions are published on this page when they become available." breadcrumbs={[{ name: "Careers", path: "/careers" }]} />
      <PageHeader title="Careers" tagline="Join the Travelian team and shape the future of travel" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <EmptyState
          icon={Briefcase}
          title="No open positions right now"
          description="New opportunities will be published here when they become available."
        />
      </div>
    </div>
  );
}
