import { createFileRoute, Outlet } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/cpgrams";

export const Route = createFileRoute("/office")({
  component: OfficeLayout,
});

function OfficeLayout() {
  return (
    <WorkspaceShell>
      {/* Required: nested workspace routes render here. */}
      <Outlet />
    </WorkspaceShell>
  );
}
