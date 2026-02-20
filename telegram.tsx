import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Bot, Plus, Trash2, Loader2, Save, Users, DollarSign,
  MessageSquare, Power, PowerOff, CircleDot, Settings2,
} from "lucide-react";
import type { TelegramBot } from "@shared/schema";

export default function TelegramPage() {
  const [newToken, setNewToken] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: bots = [], isLoading: botsLoading } = useQuery<TelegramBot[]>({
    queryKey: ["/api/telegram-bots"],
    refetchInterval: 5000,
  });

  const { data: settings = {}, isLoading: settingsLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/bot-settings"],
  });

  const addBot = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/telegram-bots", {
        token: newToken,
        label: newLabel || "Bot",
      });
    },
    onSuccess: () => {
      setNewToken("");
      setNewLabel("");
      qc.invalidateQueries({ queryKey: ["/api/telegram-bots"] });
      toast({ title: "Bot added" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const toggleBot = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/telegram-bots/${id}`, { isActive });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/telegram-bots"] });
    },
  });

  const deleteBot = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/telegram-bots/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/telegram-bots"] });
      toast({ title: "Bot removed" });
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text" data-testid="text-telegram-title">
          Telegram Bots
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage bots, admin access, pricing, and message templates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-4 h-4" /> Bot Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  data-testid="input-bot-token"
                  placeholder="Bot token from @BotFather"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  className="flex-1 font-mono text-xs"
                />
                <Input
                  data-testid="input-bot-label"
                  placeholder="Label"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full sm:w-32"
                />
                <Button
                  data-testid="button-add-bot"
                  onClick={() => addBot.mutate()}
                  disabled={!newToken.trim() || addBot.isPending}
                >
                  {addBot.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span className="ml-1.5">Add</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {bots.filter((b) => b.isActive).length} active / {bots.length} total
                </span>
              </div>

              {botsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : bots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No bots configured. Add a bot token from @BotFather to get started.
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {bots.map((bot) => (
                    <div
                      key={bot.id}
                      className="flex items-center gap-3 px-3 py-2.5"
                      data-testid={`row-bot-${bot.id}`}
                    >
                      <Switch
                        data-testid={`switch-bot-${bot.id}`}
                        checked={bot.isActive}
                        onCheckedChange={(checked) =>
                          toggleBot.mutate({ id: bot.id, isActive: checked })
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {bot.label || "Unnamed Bot"}
                          </span>
                          <StatusBadge status={bot.status} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                            {bot.token.substring(0, 10)}...{bot.token.substring(bot.token.length - 6)}
                          </span>
                          {bot.username && (
                            <Badge variant="outline" className="text-[10px]">
                              @{bot.username}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-delete-bot-${bot.id}`}
                        onClick={() => deleteBot.mutate(bot.id)}
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

        <div className="space-y-4">
          <BotSettingsPanel settings={settings} isLoading={settingsLoading} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "running":
      return (
        <Badge variant="default" className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 gap-1">
          <CircleDot className="w-2.5 h-2.5" /> Online
        </Badge>
      );
    case "stopped":
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
          <PowerOff className="w-2.5 h-2.5" /> Stopped
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
          Error
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {status}
        </Badge>
      );
  }
}

function BotSettingsPanel({
  settings,
  isLoading,
}: {
  settings: Record<string, string>;
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [adminIds, setAdminIds] = useState("");
  const [creditPrice, setCreditPrice] = useState("");
  const [welcomeMsg, setWelcomeMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [failMsg, setFailMsg] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (!isLoading && !initialized) {
    setAdminIds(settings.admin_ids || "");
    setCreditPrice(settings.credit_price || "5000");
    setWelcomeMsg(settings.welcome_message || "Welcome! Send /verify <url> to start a verification.\n\nCredits: {credits}\nPrice per verify: {price} IDR");
    setSuccessMsg(settings.success_message || "Verification successful!\n\nRedirect URL: {redirect_url}\nCollege: {college}\nStudent: {student_name}");
    setFailMsg(settings.fail_message || "Verification failed.\n\nError: {error}\nCollege: {college}");
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", "/api/bot-settings", {
        admin_ids: adminIds,
        credit_price: creditPrice,
        welcome_message: welcomeMsg,
        success_message: successMsg,
        fail_message: failMsg,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/bot-settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Bot Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            Admin Telegram IDs
          </label>
          <Input
            data-testid="input-admin-ids"
            placeholder="123456789, 987654321"
            value={adminIds}
            onChange={(e) => setAdminIds(e.target.value)}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Comma-separated Telegram user IDs with admin access
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            Credit Price (IDR)
          </label>
          <Input
            data-testid="input-credit-price"
            type="number"
            placeholder="5000"
            value={creditPrice}
            onChange={(e) => setCreditPrice(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Price per verification credit in IDR
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            Welcome Message
          </label>
          <Textarea
            data-testid="input-welcome-msg"
            value={welcomeMsg}
            onChange={(e) => setWelcomeMsg(e.target.value)}
            rows={3}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Variables: {"{credits}"}, {"{price}"}, {"{username}"}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Power className="w-3.5 h-3.5 text-emerald-500" />
            Success Message
          </label>
          <Textarea
            data-testid="input-success-msg"
            value={successMsg}
            onChange={(e) => setSuccessMsg(e.target.value)}
            rows={3}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Variables: {"{redirect_url}"}, {"{college}"}, {"{student_name}"}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <PowerOff className="w-3.5 h-3.5 text-red-500" />
            Failure Message
          </label>
          <Textarea
            data-testid="input-fail-msg"
            value={failMsg}
            onChange={(e) => setFailMsg(e.target.value)}
            rows={3}
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground">
            Variables: {"{error}"}, {"{college}"}, {"{student_name}"}
          </p>
        </div>

        <Button
          data-testid="button-save-settings"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full"
        >
          {saveMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="ml-1.5">Save Settings</span>
        </Button>
      </CardContent>
    </Card>
  );
}
