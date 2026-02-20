import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          System configuration overview
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" /> Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Program ID</p>
              <p className="font-mono text-xs mt-0.5" data-testid="text-program-id">67c8c14f5f17a83b745e3f82</p>
            </div>
            <div>
              <p className="text-muted-foreground">API Endpoint</p>
              <p className="font-mono text-xs mt-0.5">services.sheerid.com</p>
            </div>
            <div>
              <p className="text-muted-foreground">Step Delays</p>
              <p className="font-mono text-xs mt-0.5">1.5s - 6s (human-like)</p>
            </div>
            <div>
              <p className="text-muted-foreground">TLS Fingerprint</p>
              <p className="font-mono text-xs mt-0.5">Chrome (impit)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Target Colleges</p>
              <p className="font-mono text-xs mt-0.5" data-testid="text-target-colleges">56 tribal colleges</p>
            </div>
            <div>
              <p className="text-muted-foreground">Document Format</p>
              <p className="font-mono text-xs mt-0.5">JPEG w/ photo artifacts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
