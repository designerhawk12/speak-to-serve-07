import { createFileRoute, Outlet } from "@tanstack/react-router";
import { CitizenShell } from "@/components/cpgrams";

export const Route = createFileRoute("/citizen")({
  component: CitizenLayout,
});

function CitizenLayout() {
  return (
    <CitizenShell>
      {/* Required: nested citizen routes render here. */}
      <Outlet />
    </CitizenShell>
  );
}
