import { Outlet, createFileRoute } from "@tanstack/react-router";
import { StudioShell } from "@/components/castly/studio-shell";

export const Route = createFileRoute("/studio")({
  component: StudioLayout,
});

function StudioLayout() {
  return (
    <StudioShell>
      <Outlet />
    </StudioShell>
  );
}
