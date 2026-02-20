import { useLocation, Link } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { LayoutDashboard, ShieldCheck, CreditCard, Settings, Zap, Bot, Activity, Globe, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { usePromoMode } from "@/lib/promo-mode";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Verify", url: "/verify", icon: ShieldCheck },
  { title: "Documents", url: "/documents", icon: CreditCard },
  { title: "Proxies", url: "/proxies", icon: Globe },
  { title: "Universities", url: "/universities", icon: GraduationCap },
  { title: "Telegram", url: "/telegram", icon: Bot },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const isPromo = usePromoMode();
  const realParam = isPromo ? "" : "?real=1";

  const { data: stats } = useQuery<{ total: number; success: number; running: number; rate: number }>({
    queryKey: ["/api/stats", isPromo],
    queryFn: () => fetch(`/api/stats${realParam}`).then((r) => r.json()),
    refetchInterval: 5000,
  });

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary rounded-md p-1.5 animate-pulse-glow">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm gradient-text" data-testid="text-app-name">SheerID Verifier</p>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Automation Suite</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item, i) => (
                <SidebarMenuItem key={item.title} className={`animate-slide-in stagger-${i + 1}`} style={{ opacity: 0 }}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {stats && (stats.total > 0 || stats.running > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Success Rate</span>
                  <Badge variant="outline" className="text-[10px] tabular-nums">
                    {stats.rate}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-xs font-medium tabular-nums">{stats.total}</span>
                </div>
                {stats.running > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Activity className="w-3 h-3 animate-pulse text-emerald-500" />
                      Running
                    </span>
                    <span className="text-xs font-medium tabular-nums text-emerald-500">{stats.running}</span>
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-[10px] text-muted-foreground">v2.0 — Premium Edition</p>
      </SidebarFooter>
    </Sidebar>
  );
}
