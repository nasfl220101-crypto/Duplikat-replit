import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Globe, Loader2, Upload, CheckSquare, XSquare,
} from "lucide-react";
import type { Proxy } from "@shared/schema";

export default function ProxiesPage() {
  const [proxyUrl, setProxyUrl] = useState("");
  const [proxyLabel, setProxyLabel] = useState("");
  const [proxyRole, setProxyRole] = useState<"warmup" | "submit">("submit");
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: proxyList = [], isLoading } = useQuery<Proxy[]>({
    queryKey: ["/api/proxies"],
  });

  const addProxy = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/proxies", {
        url: proxyUrl,
        label: proxyLabel || null,
        role: proxyRole,
      });
    },
    onSuccess: () => {
      setProxyUrl("");
      setProxyLabel("");
      qc.invalidateQueries({ queryKey: ["/api/proxies"] });
      toast({ title: "Proxy added" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const toggleProxy = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await apiRequest("PATCH", `/api/proxies/${id}`, { isActive: active });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/proxies"] });
    },
  });

  const deleteProxy = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/proxies/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/proxies"] });
    },
  });

  const bulkImport = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/proxies/bulk", { proxies: bulkText });
      return res.json();
    },
    onSuccess: (data: any) => {
      setBulkText("");
      setShowBulk(false);
      qc.invalidateQueries({ queryKey: ["/api/proxies"] });
      toast({ title: `Imported ${data.added} proxies` });
    },
    onError: (e: Error) => {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    },
  });

  const updateProxyRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await apiRequest("PATCH", `/api/proxies/${id}`, { role });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/proxies"] });
    },
  });

  const toggleAllProxies = useMutation({
    mutationFn: async ({ active }: { active: boolean }) => {
      await apiRequest("POST", "/api/proxies/toggle-all", { isActive: active });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/proxies"] });
      toast({ title: "All proxies updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteAllProxies = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/proxies");
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["/api/proxies"] });
      toast({ title: "All proxies deleted" });
    },
  });

  const deleteSelected = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/proxies/delete-selected", { ids: Array.from(selectedIds) });
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["/api/proxies"] });
      toast({ title: `Deleted ${selectedIds.size} proxies` });
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === proxyList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(proxyList.map(p => p.id)));
    }
  };

  const activeCount = proxyList.filter((p) => p.isActive).length;
  const warmupCount = proxyList.filter((p) => p.role === "warmup").length;
  const submitCount = proxyList.filter((p) => p.role === "submit").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text" data-testid="text-proxies-title">
            Proxies
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage proxy rotation for verification requests
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="tabular-nums">
            {activeCount} active
          </Badge>
          <Badge variant="outline" className="tabular-nums">
            {warmupCount} warmup
          </Badge>
          <Badge variant="outline" className="tabular-nums">
            {submitCount} submit
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" /> Add Proxy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              data-testid="input-proxy-url"
              placeholder="socks5://user:pass@host:port"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
              className="flex-1"
            />
            <Input
              data-testid="input-proxy-label"
              placeholder="Label (optional)"
              value={proxyLabel}
              onChange={(e) => setProxyLabel(e.target.value)}
              className="w-full sm:w-40"
            />
            <select
              data-testid="select-proxy-role"
              className="flex h-9 w-full sm:w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={proxyRole}
              onChange={(e) => setProxyRole(e.target.value as any)}
            >
              <option value="warmup">Warmup</option>
              <option value="submit">Submit</option>
            </select>
            <Button
              data-testid="button-add-proxy"
              onClick={() => addProxy.mutate()}
              disabled={!proxyUrl || addProxy.isPending}
            >
              {addProxy.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span className="ml-1.5">Add</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <Globe className="w-4 h-4" /> Proxy List
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                data-testid="button-toggle-bulk"
                onClick={() => setShowBulk(!showBulk)}
              >
                <Upload className="w-4 h-4" />
                <span className="ml-1.5">Bulk Import</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-proxy-all-on"
                disabled={toggleAllProxies.isPending}
                onClick={() => toggleAllProxies.mutate({ active: true })}
              >
                <CheckSquare className="w-4 h-4" />
                <span className="ml-1.5">All On</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-proxy-all-off"
                disabled={toggleAllProxies.isPending}
                onClick={() => toggleAllProxies.mutate({ active: false })}
              >
                <XSquare className="w-4 h-4" />
                <span className="ml-1.5">All Off</span>
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  data-testid="button-delete-selected-proxies"
                  disabled={deleteSelected.isPending}
                  onClick={() => deleteSelected.mutate()}
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="ml-1.5">Delete ({selectedIds.size})</span>
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                data-testid="button-delete-all-proxies"
                disabled={deleteAllProxies.isPending || proxyList.length === 0}
                onClick={() => deleteAllProxies.mutate()}
              >
                <Trash2 className="w-4 h-4" />
                <span className="ml-1.5">Delete All</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showBulk && (
            <div className="space-y-2">
              <Textarea
                data-testid="input-bulk-proxies"
                placeholder={"Paste proxies, one per line:\nsocks5://user:pass@host:port\nhttp://user:pass@host:port\nhost:port:user:pass"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={6}
                className="font-mono text-xs"
              />
              <Button
                data-testid="button-import-proxies"
                onClick={() => bulkImport.mutate()}
                disabled={!bulkText.trim() || bulkImport.isPending}
              >
                {bulkImport.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span className="ml-1.5">Import</span>
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : proxyList.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No proxies configured. Add one above to use with verifications.
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              <div className="flex items-center gap-3 px-3 py-2 bg-muted/30">
                <Checkbox
                  data-testid="checkbox-select-all-proxies"
                  checked={selectedIds.size === proxyList.length && proxyList.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-xs text-muted-foreground font-medium">Select All</span>
              </div>
              {proxyList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                  data-testid={`row-proxy-${p.id}`}
                >
                  <Checkbox
                    data-testid={`checkbox-proxy-${p.id}`}
                    checked={selectedIds.has(p.id)}
                    onCheckedChange={() => toggleSelect(p.id)}
                  />
                  <Switch
                    data-testid={`switch-proxy-${p.id}`}
                    checked={p.isActive}
                    onCheckedChange={(checked) =>
                      toggleProxy.mutate({ id: p.id, active: checked })
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-mono">{p.url}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.label && (
                        <Badge variant="outline" className="text-xs">
                          {p.label}
                        </Badge>
                      )}
                      <select
                        className="h-6 text-[10px] rounded border bg-transparent px-1"
                        value={p.role}
                        onChange={(e) => updateProxyRole.mutate({ id: p.id, role: e.target.value })}
                      >
                        <option value="warmup">Warmup</option>
                        <option value="submit">Submit</option>
                      </select>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-delete-proxy-${p.id}`}
                    onClick={() => deleteProxy.mutate(p.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
