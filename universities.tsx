import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap, Loader2, CheckSquare, XSquare, Search,
} from "lucide-react";

interface University {
  id: number;
  name: string;
  weight: number;
  enabled: boolean;
}

export default function UniversitiesPage() {
  const [searchFilter, setSearchFilter] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: universities = [], isLoading } = useQuery<University[]>({
    queryKey: ["/api/universities"],
  });

  const toggleUni = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/universities/${id}`, { enabled });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/universities"] });
    },
  });

  const bulkToggle = useMutation({
    mutationFn: async ({ ids, enabled }: { ids: number[]; enabled: boolean }) => {
      await apiRequest("POST", "/api/universities/bulk", { ids, enabled });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/universities"] });
      toast({ title: "Universities updated" });
    },
  });

  const filtered = universities.filter((u) =>
    u.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const enabledCount = universities.filter((u) => u.enabled).length;
  const allFilteredIds = filtered.map((u) => u.id);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight gradient-text" data-testid="text-universities-title">
            Universities
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage which institutions are used for verification
          </p>
        </div>
        <Badge variant="outline" className="tabular-nums">
          {enabledCount}/{universities.length} active
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
            <span className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Institution List
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                data-testid="button-enable-all"
                disabled={bulkToggle.isPending}
                onClick={() => bulkToggle.mutate({ ids: allFilteredIds, enabled: true })}
              >
                <CheckSquare className="w-4 h-4" />
                <span className="ml-1.5">All On</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                data-testid="button-disable-all"
                disabled={bulkToggle.isPending}
                onClick={() => bulkToggle.mutate({ ids: allFilteredIds, enabled: false })}
              >
                <XSquare className="w-4 h-4" />
                <span className="ml-1.5">All Off</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-testid="input-university-search"
              placeholder="Search universities..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y rounded-md border max-h-[600px] overflow-y-auto">
              {filtered.map((uni) => (
                <label
                  key={uni.id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover-elevate"
                  data-testid={`row-university-${uni.id}`}
                >
                  <Checkbox
                    data-testid={`checkbox-university-${uni.id}`}
                    checked={uni.enabled}
                    onCheckedChange={(checked) =>
                      toggleUni.mutate({ id: uni.id, enabled: !!checked })
                    }
                  />
                  <span className={`text-sm flex-1 ${!uni.enabled ? "text-muted-foreground line-through" : ""}`}>
                    {uni.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] tabular-nums">
                    ID: {uni.id}
                  </Badge>
                </label>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No universities match your search.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {universities.length} universities
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
