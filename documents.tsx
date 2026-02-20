import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download, Save, Trash2, Loader2, CreditCard,
  RefreshCw, Shuffle, Eye, LayoutTemplate, CheckSquare, XSquare,
  GraduationCap, CalendarDays, Receipt, Power,
} from "lucide-react";
import type { Card as CardType } from "@shared/schema";

interface Template {
  id: string;
  index: number;
  name: string;
  category: string;
  enabled: boolean;
}

const DEPARTMENTS = [
  "Computer Science",
  "Engineering",
  "Business",
  "Arts & Design",
  "Medicine",
  "Information Technology",
];

const THEME_COLORS = [
  { label: "Navy", value: "#1e3a8a" },
  { label: "Dark Blue", value: "#003366" },
  { label: "Royal Blue", value: "#0066CC" },
  { label: "Midnight", value: "#1a1a2e" },
  { label: "Deep Navy", value: "#16213e" },
  { label: "Indigo", value: "#0f3460" },
  { label: "Forest Green", value: "#064e3b" },
  { label: "Burgundy", value: "#7f1d1d" },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Documents() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState("Student Name");
  const [studentId, setStudentId] = useState("20240001");
  const [department, setDepartment] = useState("Computer Science");
  const [collegeName, setCollegeName] = useState("Tech University");
  const [dateOfBirth, setDateOfBirth] = useState("2000-01-01");
  const [validUntil, setValidUntil] = useState(
    `${new Date().getFullYear() + 2}-12-31`
  );
  const [gender, setGender] = useState("male");
  const [primaryColor, setPrimaryColor] = useState("#1e3a8a");
  const [photoUrl, setPhotoUrl] = useState("");
  const [previewSvg, setPreviewSvg] = useState("");
  const [previewLoading, setPreviewLoading] = useState(true);
  const [loadingFace, setLoadingFace] = useState(false);
  const [activeCategory, setActiveCategory] = useState("id_card");

  const { data: allCards = [], isLoading: cardsLoading } = useQuery<CardType[]>({
    queryKey: ["/api/cards"],
  });

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await apiRequest("POST", "/api/cards/preview", {
        name, collegeName, dateOfBirth, department, studentId,
        validUntil, primaryColor, photoUrl: photoUrl || undefined,
        category: activeCategory,
      });
      const data = await res.json();
      setPreviewSvg(data.svg || "");
    } catch {
      setPreviewSvg("");
    }
    setPreviewLoading(false);
  }, [name, collegeName, dateOfBirth, department, studentId, validUntil, primaryColor, photoUrl, activeCategory]);

  useEffect(() => {
    const timeout = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timeout);
  }, [fetchPreview]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cards", {
        name, collegeName, dateOfBirth, department, studentId,
        validUntil, primaryColor, gender, photoUrl: photoUrl || null,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/cards"] });
      toast({ title: "Card Saved", description: "Student ID card saved to history" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/cards/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/cards"] });
    },
  });

  const getRandomFace = async () => {
    setLoadingFace(true);
    try {
      const genderParam = gender === "female" ? "female" : "male";
      const res = await fetch(`/api/random-face?gender=${genderParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.photoUrl) {
          setPhotoUrl(data.photoUrl);
          toast({ title: "Face Loaded", description: "Random face photo applied" });
        }
      } else {
        toast({ title: "Error", description: "Failed to fetch random face", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to fetch random face", variant: "destructive" });
    }
    setLoadingFace(false);
  };

  const downloadPng = () => {
    if (!previewSvg) return;
    const svgBlob = new Blob([previewSvg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 2100;
      canvas.height = 1300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            const prefix = activeCategory === "class_schedule" ? "schedule" : activeCategory === "tuition_receipt" ? "receipt" : "student_id";
            a.download = `${prefix}_${studentId}.png`;
            a.click();
          }
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const randomize = () => {
    const firsts = ["James", "John", "Emily", "Sarah", "Michael", "Jessica", "David", "Ashley"];
    const lasts = ["Smith", "Johnson", "Williams", "Brown", "Garcia", "Miller", "Davis"];
    const first = firsts[randomInt(0, firsts.length - 1)];
    const last = lasts[randomInt(0, lasts.length - 1)];
    setName(`${first} ${last}`);
    setStudentId(String(randomInt(100000000, 999999999)));
    setDepartment(DEPARTMENTS[randomInt(0, DEPARTMENTS.length - 1)]);
    const unis = [
      "Fort Belknap College", "Saginaw Chippewa Tribal College",
      "Fort Berthold Community College", "Rainy River Community College",
      "Sisseton Wahpeton College", "Keweenaw Bay Ojibwa Community College",
      "Chief Dull Knife College", "Leech Lake Tribal College",
      "College of the Muscogee Nation", "Stone Child College",
      "Sitting Bull College", "Little Big Horn College",
      "Turtle Mountain Community College", "Cankdeska Cikana Community College",
      "Nebraska Indian Community College", "Fond du Lac Tribal and Community College",
      "Bay Mills Community College", "Northwest Indian College", "Oglala Lakota College",
      "Blackfeet Community College", "Fort Peck Community College",
      "Aaniiih Nakoda College", "Little Priest Tribal College",
      "College of Menominee Nation", "Salish Kootenai College",
      "Dawson Community College", "Miles Community College",
      "Williston State College", "Dakota College at Bottineau",
      "Vermilion Community College", "Ilisagvik College",
      "Lac Courte Oreilles Ojibwa Community College",
      "Lamar Community College", "Otero College", "Trinidad State College",
    ];
    setCollegeName(unis[randomInt(0, unis.length - 1)]);
    const year = new Date().getFullYear();
    const bYear = year - 18 - randomInt(0, 6);
    setDateOfBirth(`${bYear}-${String(randomInt(1, 12)).padStart(2, "0")}-${String(randomInt(1, 28)).padStart(2, "0")}`);
    setValidUntil(`${year + randomInt(1, 3)}-12-31`);
    const g = Math.random() > 0.5 ? "female" : "male";
    setGender(g);
    setPrimaryColor(THEME_COLORS[randomInt(0, THEME_COLORS.length - 1)].value);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight gradient-text" data-testid="text-documents-title">
          Document Generator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create and manage student documents across 3 categories
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Card Details</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={randomize}
              data-testid="button-randomize"
            >
              <Shuffle className="w-4 h-4 mr-1.5" /> Randomize
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  data-testid="input-card-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  data-testid="input-card-studentid"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger data-testid="select-department">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="college">Institution</Label>
                <Input
                  id="college"
                  data-testid="input-card-college"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  data-testid="input-card-dob"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  data-testid="input-card-valid"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gender">Gender</Label>
                <Select value={gender} onValueChange={setGender}>
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="color">Theme Color</Label>
                <Select value={primaryColor} onValueChange={setPrimaryColor}>
                  <SelectTrigger data-testid="select-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_COLORS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.value }} />
                          {c.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Student Photo</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={getRandomFace}
                  disabled={loadingFace}
                  data-testid="button-random-face"
                >
                  {loadingFace ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Shuffle className="w-4 h-4 mr-1.5" />}
                  Get Random Face
                </Button>
              </div>
              <Input
                placeholder="or enter photo URL..."
                data-testid="input-card-photo"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                data-testid="button-save-card"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                Save to History
              </Button>
              <Button
                variant="outline"
                onClick={downloadPng}
                data-testid="button-download-png"
              >
                <Download className="w-4 h-4 mr-1.5" /> Download PNG
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4" /> Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading preview...
              </div>
            ) : previewSvg ? (
              <div
                className="w-full bg-white rounded-md border p-2"
                data-testid="card-preview"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No enabled templates for this category. Enable at least one template below.
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3 text-center">
              This is a live preview. Click "Download PNG" to save the high-resolution image.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <LayoutTemplate className="w-4 h-4" /> Document Templates
            <Badge variant="secondary">45 templates</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="id_card" onValueChange={(v) => setActiveCategory(v)}>
            <TabsList className="w-full grid grid-cols-3" data-testid="tabs-template-categories">
              <TabsTrigger value="id_card" data-testid="tab-id-cards" className="gap-1.5">
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Student ID Cards</span>
                <span className="sm:hidden">ID Cards</span>
              </TabsTrigger>
              <TabsTrigger value="class_schedule" data-testid="tab-class-schedules" className="gap-1.5">
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Class Schedules</span>
                <span className="sm:hidden">Schedules</span>
              </TabsTrigger>
              <TabsTrigger value="tuition_receipt" data-testid="tab-tuition-receipts" className="gap-1.5">
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Tuition Receipts</span>
                <span className="sm:hidden">Receipts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="id_card">
              <CategoryTemplateGrid category="id_card" />
            </TabsContent>
            <TabsContent value="class_schedule">
              <CategoryTemplateGrid category="class_schedule" />
            </TabsContent>
            <TabsContent value="tuition_receipt">
              <CategoryTemplateGrid category="tuition_receipt" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Card History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{allCards.length}</Badge>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => qc.invalidateQueries({ queryKey: ["/api/cards"] })}
              data-testid="button-refresh-cards"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cardsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : allCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No cards saved yet. Create one above and click "Save to History".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-md border overflow-hidden"
                  data-testid={`card-history-${card.id}`}
                >
                  {card.svgContent && (
                    <div
                      className="w-full bg-white p-2"
                      dangerouslySetInnerHTML={{ __html: card.svgContent }}
                    />
                  )}
                  <div className="p-2 border-t bg-muted/30 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{card.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{card.collegeName}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(card.id)}
                      data-testid={`button-delete-card-${card.id}`}
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
    </div>
  );
}

function CategoryTemplateGrid({ category }: { category: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates", category],
    queryFn: async () => {
      const res = await fetch(`/api/templates?category=${category}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const toggleTemplate = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await apiRequest("PATCH", `/api/templates/${id}`, { enabled });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/templates", category] });
    },
  });

  const categoryToggle = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/templates/category-toggle", { category, enabled });
    },
    onSuccess: (_data, enabled) => {
      qc.invalidateQueries({ queryKey: ["/api/templates", category] });
      toast({ title: enabled ? "Category enabled" : "Category disabled" });
    },
  });

  const bulkToggle = useMutation({
    mutationFn: async ({ ids, enabled }: { ids: string[]; enabled: boolean }) => {
      await apiRequest("POST", "/api/templates/bulk", { ids, enabled });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/templates", category] });
      toast({ title: "Templates updated" });
    },
  });

  const enabledCount = templates.filter(t => t.enabled).length;
  const categoryOn = enabledCount > 0;
  const allIds = templates.map(t => t.id);

  const categoryLabels: Record<string, string> = {
    id_card: "Student ID Cards",
    class_schedule: "Class Schedules",
    tuition_receipt: "Tuition Receipts",
  };

  const categoryIcons: Record<string, typeof GraduationCap> = {
    id_card: GraduationCap,
    class_schedule: CalendarDays,
    tuition_receipt: Receipt,
  };

  const Icon = categoryIcons[category] || GraduationCap;

  return (
    <div className="space-y-3 pt-3">
      <div className="flex items-center justify-between gap-3 p-3 rounded-md border">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{categoryLabels[category]}</p>
            <p className="text-xs text-muted-foreground">
              {categoryOn ? `${enabledCount}/${templates.length} templates active` : "Category disabled"}
            </p>
          </div>
        </div>
        <Switch
          data-testid={`switch-category-${category}`}
          checked={categoryOn}
          disabled={categoryToggle.isPending}
          onCheckedChange={(checked) => categoryToggle.mutate(checked)}
        />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          {enabledCount}/{templates.length} active
        </Badge>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            data-testid={`button-enable-all-${category}`}
            disabled={bulkToggle.isPending}
            onClick={() => bulkToggle.mutate({ ids: allIds, enabled: true })}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="ml-1.5">All On</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid={`button-disable-all-${category}`}
            disabled={bulkToggle.isPending}
            onClick={() => bulkToggle.mutate({ ids: allIds, enabled: false })}
          >
            <XSquare className="w-4 h-4" />
            <span className="ml-1.5">All Off</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {templates.map((tpl) => (
            <label
              key={tpl.id}
              className="flex items-center gap-3 px-3 py-2 rounded-md border cursor-pointer hover-elevate"
              data-testid={`row-template-${tpl.id}`}
            >
              <Checkbox
                data-testid={`checkbox-template-${tpl.id}`}
                checked={tpl.enabled}
                onCheckedChange={(checked) =>
                  toggleTemplate.mutate({ id: tpl.id, enabled: !!checked })
                }
              />
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${!tpl.enabled ? "text-muted-foreground line-through" : ""}`}>
                  {tpl.name}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                #{tpl.index}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
