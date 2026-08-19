import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
  Contact,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ClinicSetup } from "@/components/clinic-setup";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useClinicContext } from "@/hooks/use-clinic-context";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS } from "@/lib/clinic-data";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/crm", label: "CRM", icon: Contact },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/atendimentos", label: "Atendimentos", icon: ClipboardList },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data, isPending, error } = useClinicContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (isPending) {
    return (
      <div className="min-h-screen space-y-4 p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-xl font-semibold">Não conseguimos carregar seus dados</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique sua conexão e tente novamente.
          </p>
        </div>
      </div>
    );
  }

  if (data && !data.profile) {
    return <ClinicSetup />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate({ to: "/auth" });
  };

  const nav = (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          activeProps={{
            className:
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
          }}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <Brand />
        <div className="mt-6 flex-1">{nav}</div>
        <UserBox
          name={data?.profile?.full_name || data?.email || ""}
          role={data?.roles.map((r) => ROLE_LABELS[r]).join(" · ") || "Sem papel"}
          onSignOut={handleSignOut}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{data?.clinic?.name}</p>
              <p className="text-xs text-muted-foreground">Estetic360º</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden lg:inline-flex">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </header>

        <div className={cn("border-b border-border bg-sidebar p-4 lg:hidden", !mobileOpen && "hidden")}>
          {nav}
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        E
      </div>
      <div>
        <p className="font-display text-lg leading-none font-semibold">Estetic360º</p>
        <p className="text-xs text-muted-foreground">Gestão da sua clínica</p>
      </div>
    </div>
  );
}

function UserBox({
  name,
  role,
  onSignOut,
}: {
  name: string;
  role: string;
  onSignOut: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-sidebar-border bg-card p-3">
      <p className="truncate text-sm font-medium">{name}</p>
      <p className="truncate text-xs text-muted-foreground">{role}</p>
      <Button variant="ghost" size="sm" className="mt-2 w-full justify-start px-0" onClick={onSignOut}>
        <LogOut className="mr-2 h-4 w-4" /> Sair
      </Button>
    </div>
  );
}
