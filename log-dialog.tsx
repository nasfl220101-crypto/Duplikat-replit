import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertCircle, Info, AlertTriangle } from "lucide-react";
import type { VerificationLog } from "@shared/schema";

function levelIcon(level: string) {
  switch (level) {
    case "error":
      return <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
    case "warning":
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    default:
      return <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
  }
}

export default function LogDialog({
  verificationId,
  onClose,
}: {
  verificationId: string;
  onClose: () => void;
}) {
  const { data: logs = [], isLoading } = useQuery<VerificationLog[]>({
    queryKey: [`/api/verifications/${verificationId}/logs`],
    refetchInterval: 2000,
  });

  const sortedLogs = [...logs].reverse();

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Verification Logs</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : sortedLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No logs yet
          </p>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-3">
              {sortedLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-2 text-sm"
                  data-testid={`log-entry-${log.id}`}
                >
                  {levelIcon(log.level)}
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{log.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
