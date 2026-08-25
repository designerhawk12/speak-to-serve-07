import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/cpgrams";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/cpgrams/session";

export const Route = createFileRoute("/citizen/profile")({
  head: () => ({
    meta: [
      { title: "My profile — CPGRAMS Resolution Workspace" },
      {
        name: "description",
        content: "Your contact details, so offices can reach you about your grievances.",
      },
      { property: "og:title", content: "My profile" },
      { property: "og:description", content: "Contact details used on your grievances." },
    ],
  }),
  component: CitizenProfile,
});

function CitizenProfile() {
  const { user } = useSession();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Offices use these details to contact you. Your grievance text is never edited when you update them."
      />

      <Card className="border-border">
        <CardContent className="grid gap-4 p-5 md:max-w-xl md:p-6">
          <div className="space-y-1.5">
            <label htmlFor="p-name" className="text-sm font-semibold">
              Full name
            </label>
            <Input id="p-name" defaultValue={user?.name ?? ""} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="p-email" className="text-sm font-semibold">
              Email
            </label>
            <Input id="p-email" type="email" placeholder="you@example.com" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="p-phone" className="text-sm font-semibold">
              Mobile number
            </label>
            <Input id="p-phone" type="tel" placeholder="+91" />
          </div>
          <div>
            <Button>Save details</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Placeholder only — profile changes will be stored in Supabase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
