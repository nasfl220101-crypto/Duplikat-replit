import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Activity, CheckCircle, XCircle, Clock, TrendingUp,
  GraduationCap, Zap, ShieldCheck, AlertTriangle, Eye, EyeOff,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import type { Verification } from "@shared/schema";
import { usePromoMode, setPromoMode } from "@/lib/promo-mode";

interface Stats {
  total: number;
  success: number;
  failed: number;
  running: number;
  rate: number;
}

interface UniStat {
  id: number;
  name: string;
  attempts: number;
  successes: number;
  failures: number;
  fraudRejects: number;
  successRate: string;
  adjustedWeight: string;
}

export default function Dashboard() {
  const isPromo = usePromoMode();
  const [showToggle, setShowToggle] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleClick = useCallback(() => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (clickTimer) clearTimeout(clickTimer);
    if (newCount >= 3) {
      setShowToggle((prev) => !prev);
      setClickCount(0);
      return;
    }
    const t = setTimeout(() => setClickCount(0), 600);
    setClickTimer(t);
  }, [clickCount, clickTimer]);

  const handleToggle = (checked: boolean) => {
    setPromoMode(!checked);
  };

  const realParam = isPromo ? "" : "?real=1";

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats", isPromo],
    queryFn: () => fetch(`/api/stats${realParam}`).then((r) => r.json()),
    refetchInterval: 3000,
  });

  const { data: uniStats } = useQuery<UniStat[]>({
    queryKey: ["/api/stats/universities"],
    refetchInterval: 5000,
  });

  const { data: verifications = [] } = useQuery<Verification[]>({
    queryKey: ["/api/verifications", isPromo],
    queryFn: () => fetch(`/api/verifications${realParam}`).then((r) => r.json()),
    refetchInterval: 4000,
  });

  const recentVerifications = verifications.slice(0, 8);

  const pieData = [
    { name: "Success", value: stats?.success ?? 0, color: "hsl(var(--chart-2))" },
    { name: "Failed", value: stats?.failed ?? 0, color: "hsl(var(--chart-1))" },
    { name: "Running", value: stats?.running ?? 0, color: "hsl(var(--chart-4))" },
  ].filter(d => d.value > 0);

  const barData = (uniStats || []).map(u => ({
    name: u.name.length > 20 ? u.name.substring(0, 18) + "..." : u.name,
    fullName: u.name,
    success: u.successes,
    failed: u.failures,
    fraud: u.fraudRejects,
  }));

  const statCards = [
    {
      title: "Total Runs",
      value: stats?.total ?? 0,
      icon: Activity,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      title: "Success",
      value: stats?.success ?? 0,
      icon: CheckCircle,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Failed",
      value: stats?.failed ?? 0,
      icon: XCircle,
      color: "text-red-500 dark:text-red-400",
      bg: "bg-red-500/10",
    },
    {
      title: "In Progress",
      value: stats?.running ?? 0,
      icon: Clock,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      title: "Success Rate",
      value: `${stats?.rate ?? 0}%`,
      icon: TrendingUp,
      color: (stats?.rate ?? 0) >= 50
        ? "text-emerald-500 dark:text-emerald-400"
        : "text-orange-500 dark:text-orange-400",
      bg: (stats?.rate ?? 0) >= 50 ? "bg-emerald-500/10" : "bg-orange-500/10",
    },
  ];

  function getStatusIcon(status: string) {
    switch (status) {
      case "success": return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case "failed": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case "running": return <Zap className="w-3.5 h-3.5 text-blue-500 animate-pulse" />;
      case "review": return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "success": return <Badge variant="default" className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">Success</Badge>;
      case "failed": return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Failed</Badge>;
      case "running": return <Badge variant="secondary" className="bg-blue-600 text-white text-[10px] px-1.5 py-0">Running</Badge>;
      case "review": return <Badge variant="secondary" className="bg-amber-600 text-white text-[10px] px-1.5 py-0">Review</Badge>;
      default: return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pending</Badge>;
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight gradient-text select-none cursor-default"
            data-testid="text-dashboard-title"
            onClick={handleTitleClick}
          >
            Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground text-sm">
              Real-time verification activity overview
            </p>
            {showToggle && (
              <div className="flex items-center gap-1.5 ml-2">
                {!isPromo ? <Eye className="w-3 h-3 text-emerald-500" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                <Switch
                  checked={!isPromo}
                  onCheckedChange={handleToggle}
                  className="scale-75"
                  data-testid="toggle-real-dashboard"
                />
                <span className="text-[10px] text-muted-foreground">{isPromo ? "Promo" : "Real"}</span>
              </div>
            )}
          </div>
        </div>
        {(stats?.running ?? 0) > 0 && (
          <Badge variant="default" className="gap-1.5 animate-pulse-glow">
            <Zap className="w-3 h-3 animate-pulse" />
            {stats?.running} running
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((card, i) => (
          <Card key={card.title} className={`animate-fade-in stagger-${i + 1} transition-all duration-200`} style={{ opacity: 0 }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`${card.bg} rounded-md p-2`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                  <p
                    className="text-xl font-bold tabular-nums animate-count-up"
                    data-testid={`text-stat-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {isLoading ? "—" : card.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <div className="bg-violet-500/10 rounded-md p-2">
              <ShieldCheck className="h-4 w-4 text-violet-500 dark:text-violet-400" />
            </div>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentVerifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No verifications yet. Go to Verify to start.
              </div>
            ) : (
              <div className="space-y-1">
                {recentVerifications.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-md hover-elevate"
                    data-testid={`row-activity-${v.id}`}
                  >
                    {getStatusIcon(v.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{v.studentName || "Initializing..."}</span>
                        {getStatusBadge(v.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {v.collegeName && <span className="truncate max-w-[180px]">{v.collegeName}</span>}
                        <span className="shrink-0">{timeAgo(String(v.createdAt))}</span>
                      </div>
                    </div>
                    {v.errorMessage && (
                      <span className="text-[10px] text-red-500 dark:text-red-400 truncate max-w-[120px] hidden sm:block">
                        {v.errorMessage}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <div className="bg-emerald-500/10 rounded-md p-2">
              <TrendingUp className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-base">Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-muted-foreground">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {uniStats && uniStats.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <div className="bg-violet-500/10 rounded-md p-2">
                <GraduationCap className="h-4 w-4 text-violet-500 dark:text-violet-400" />
              </div>
              <CardTitle className="text-base">University Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-university-stats">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">University</th>
                      <th className="pb-2 font-medium text-muted-foreground text-center">Tries</th>
                      <th className="pb-2 font-medium text-muted-foreground text-center">
                        <CheckCircle className="w-3.5 h-3.5 inline text-emerald-500" />
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground text-center">
                        <XCircle className="w-3.5 h-3.5 inline text-red-500" />
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground text-center">
                        <AlertTriangle className="w-3.5 h-3.5 inline text-amber-500" />
                      </th>
                      <th className="pb-2 font-medium text-muted-foreground text-center">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uniStats.map((uni) => (
                      <tr key={uni.id} className="border-b last:border-0" data-testid={`row-uni-stat-${uni.id}`}>
                        <td className="py-2.5 pr-3 truncate max-w-[180px] text-sm">{uni.name}</td>
                        <td className="py-2.5 text-center tabular-nums font-medium">{uni.attempts}</td>
                        <td className="py-2.5 text-center tabular-nums text-emerald-600 dark:text-emerald-400">{uni.successes}</td>
                        <td className="py-2.5 text-center tabular-nums text-red-600 dark:text-red-400">{uni.failures}</td>
                        <td className="py-2.5 text-center tabular-nums text-amber-600 dark:text-amber-400">{uni.fraudRejects}</td>
                        <td className="py-2.5 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 ${
                              parseFloat(uni.successRate) >= 50
                                ? "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800"
                                : parseFloat(uni.successRate) > 0
                                ? "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-800"
                                : "text-red-600 border-red-200 dark:text-red-400 dark:border-red-800"
                            }`}
                          >
                            {uni.successRate}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <div className="bg-blue-500/10 rounded-md p-2">
                <Activity className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base">Results by University</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="success" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="failed" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="fraud" stackId="a" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
                  <span className="text-xs text-muted-foreground">Success</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
                  <span className="text-xs text-muted-foreground">Failed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-4))" }} />
                  <span className="text-xs text-muted-foreground">Fraud</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
