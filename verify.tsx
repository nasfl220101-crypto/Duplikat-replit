import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Search, Trash2, ExternalLink, RefreshCw,
  CheckCircle, XCircle, Clock, Loader2, FileText, CreditCard,
  Copy, Link2, AlertTriangle,
} from "lucide-react";
import type { Verification } from "@shared/schema";
import LogDialog from "@/components/log-dialog";
import { usePromoMode } from "@/lib/promo-mode";

interface RecentDoc {
  id: string;
  studentName: string | null;
  collegeName: string | null;
  status: string;
  documentSvg: string;
  createdAt: string;
}

function statusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge variant="default" className="bg-emerald-600 text-white"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>;
    case "failed":
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case "running":
      return <Badge variant="secondary" className="bg-blue-600 text-white"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
    case "review":
      return <Badge variant="secondary" className="bg-amber-600 text-white"><Clock className="w-3 h-3 mr-1" />Review</Badge>;
    default:
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  }
}

function statusColor(status: string) {
  switch (status) {
    case "success": return "border-l-emerald-500";
    case "failed": return "border-l-red-500";
    case "running": return "border-l-blue-500";
    case "review": return "border-l-amber-500";
    default: return "border-l-muted";
  }
}

export default function Verify() {
  const [url, setUrl] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<null | { valid: boolean; step?: string; error?: string }>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const isPromo = usePromoMode();
  const realParam = isPromo ? "" : "?real=1";

  const { data: verifications = [], isLoading } = useQuery<Verification[]>({
    queryKey: ["/api/verifications", isPromo],
    queryFn: () => fetch(`/api/verifications${realParam}`).then((r) => r.json()),
    refetchInterval: 3000,
  });

  const { data: recentDocs = [] } = useQuery<RecentDoc[]>({
    queryKey: ["/api/documents/recent"],
    refetchInterval: 5000,
  });

  const isValidUrl = url.includes("sheerid.com") && url.includes("verificationId=");

  const checkMutation = useMutation({
    mutationFn: async (checkUrl: string) => {
      const res = await apiRequest("POST", "/api/verifications/check", { url: checkUrl });
      return res.json();
    },
    onSuccess: (data) => {
      setLinkStatus(data);
      if (data.valid) {
        toast({ title: "Link Valid", description: `Ready to verify (step: ${data.step})` });
      } else {
        toast({ title: "Link Invalid", description: data.error, variant: "destructive" });
      }
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (submitUrl: string) => {
      const res = await apiRequest("POST", "/api/verifications", { url: submitUrl });
      return res.json();
    },
    onSuccess: () => {
      setUrl("");
      setLinkStatus(null);
      qc.invalidateQueries({ queryKey: ["/api/verifications"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Verification Started", description: "Processing in background..." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/verifications/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/verifications"] });
      qc.invalidateQueries({ queryKey: ["/api/stats"] });
    },
  });

  const runningCount = verifications.filter(v => v.status === "running" || v.status === "review").length;
  const successCount = verifications.filter(v => v.status === "success").length;
  const failedCount = verifications.filter(v => v.status === "failed").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text" data-testid="text-verify-title">
            Verify
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Submit SheerID verification links for automated processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {runningCount > 0 && (
            <Badge variant="secondary" className="bg-blue-600 text-white gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> {runningCount} active
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500" /> {successCount}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <XCircle className="w-3 h-3 text-red-500" /> {failedCount}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Submit Verification Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                data-testid="input-verification-url"
                placeholder="https://services.sheerid.com/verify/...?verificationId=..."
                value={url}
                onChange={(e) => { setUrl(e.target.value); setLinkStatus(null); }}
                className="pr-8"
              />
              {url && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => { setUrl(""); setLinkStatus(null); }}
                  data-testid="button-clear-url"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                data-testid="button-check-link"
                variant="outline"
                onClick={() => checkMutation.mutate(url)}
                disabled={!isValidUrl || checkMutation.isPending}
              >
                {checkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="ml-1.5">Check</span>
              </Button>
              <Button
                data-testid="button-submit-verify"
                onClick={() => submitMutation.mutate(url)}
                disabled={!isValidUrl || submitMutation.isPending}
              >
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="ml-1.5">Verify</span>
              </Button>
            </div>
          </div>

          {linkStatus && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
              linkStatus.valid
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            }`}>
              {linkStatus.valid
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <AlertTriangle className="w-4 h-4 shrink-0" />
              }
              <span>{linkStatus.valid ? `Valid — ready at step: ${linkStatus.step}` : linkStatus.error}</span>
            </div>
          )}

          {url && !isValidUrl && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Enter a valid SheerID URL with verificationId parameter
            </p>
          )}
        </CardContent>
      </Card>

      {recentDocs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Recent Documents
            </CardTitle>
            <Badge variant="outline">{recentDocs.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-md border overflow-hidden"
                  data-testid={`card-doc-preview-${doc.id}`}
                >
                  <div
                    className="w-full bg-white p-2 [&_svg]:w-full [&_svg]:h-auto [&_svg]:block"
                    dangerouslySetInnerHTML={{ __html: doc.documentSvg }}
                  />
                  <div className="p-2 border-t bg-muted/30 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate">{doc.studentName}</span>
                      {statusBadge(doc.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{doc.collegeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Verification History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{verifications.length} total</Badge>
            <Button
              data-testid="button-refresh"
              size="icon"
              variant="ghost"
              onClick={() => qc.invalidateQueries({ queryKey: ["/api/verifications"] })}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No verifications yet. Paste a URL above to start.
            </div>
          ) : (
            <div className="divide-y">
              {verifications.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 hover-elevate"
                  data-testid={`row-verification-${v.id}`}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(v.status)}
                      {v.collegeName && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {v.collegeName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {v.studentName && <span className="font-medium">{v.studentName}</span>}
                      {v.studentEmail && <span className="hidden sm:inline">{v.studentEmail}</span>}
                      <span>{new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    {v.errorMessage && (
                      <p className="text-xs text-red-500 dark:text-red-400 truncate max-w-lg flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {v.errorMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {v.redirectUrl && (
                      <Button size="icon" variant="ghost" asChild>
                        <a href={v.redirectUrl} target="_blank" rel="noreferrer" data-testid={`link-redirect-${v.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    {v.redirectUrl && (
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-copy-${v.id}`}
                        onClick={() => {
                          navigator.clipboard.writeText(v.redirectUrl || "");
                          toast({ title: "Copied", description: "Redirect URL copied to clipboard" });
                        }}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-logs-${v.id}`}
                      onClick={() => setSelectedId(v.id)}
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      data-testid={`button-delete-${v.id}`}
                      onClick={() => deleteMutation.mutate(v.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <LogDialog
          verificationId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
