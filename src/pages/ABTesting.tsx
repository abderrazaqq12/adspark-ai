import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  FlaskConical, 
  Plus, 
  Play, 
  Pause, 
  BarChart3, 
  ThumbsUp, 
  ThumbsDown,
  Trophy,
  Eye,
  Clock,
  Loader2,
  Video
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ABTest {
  id: string;
  name: string;
  status: "draft" | "running" | "completed";
  variants: Variant[];
  created_at: string;
  total_views: number;
  winner_id?: string;
}

interface Variant {
  id: string;
  name: string;
  video_url?: string;
  views: number;
  likes: number;
  dislikes: number;
  engagement_rate: number;
}

// Mock data for demonstration
const MOCK_TESTS: ABTest[] = [
  {
    id: "1",
    name: "Summer Sale Video Test",
    status: "running",
    created_at: new Date().toISOString(),
    total_views: 1250,
    variants: [
      { id: "v1", name: "Variant A - Fast Paced", views: 650, likes: 89, dislikes: 12, engagement_rate: 15.5 },
      { id: "v2", name: "Variant B - Slow Build", views: 600, likes: 72, dislikes: 8, engagement_rate: 13.3 },
    ],
  },
  {
    id: "2",
    name: "Product Launch Hook Test",
    status: "completed",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    total_views: 5420,
    winner_id: "v1",
    variants: [
      { id: "v1", name: "Hook: Question", views: 2800, likes: 420, dislikes: 35, engagement_rate: 16.3 },
      { id: "v2", name: "Hook: Statement", views: 2620, likes: 310, dislikes: 45, engagement_rate: 13.5 },
    ],
  },
];

export default function ABTesting() {
  const { user } = useAuth();
  const [tests, setTests] = useState<ABTest[]>(MOCK_TESTS);
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    
    if (data) setProjects(data);
  };

  const createTest = async () => {
    if (!newTestName.trim()) {
      toast.error("Please enter a test name");
      return;
    }

    const newTest: ABTest = {
      id: Date.now().toString(),
      name: newTestName,
      status: "draft",
      created_at: new Date().toISOString(),
      total_views: 0,
      variants: [
        { id: `v${Date.now()}-a`, name: "Variant A", views: 0, likes: 0, dislikes: 0, engagement_rate: 0 },
        { id: `v${Date.now()}-b`, name: "Variant B", views: 0, likes: 0, dislikes: 0, engagement_rate: 0 },
      ],
    };

    setTests([newTest, ...tests]);
    setCreateDialogOpen(false);
    setNewTestName("");
    toast.success("A/B test created!");
  };

  const startTest = (testId: string) => {
    setTests(tests.map(t => 
      t.id === testId ? { ...t, status: "running" as const } : t
    ));
    toast.success("Test started!");
  };

  const pauseTest = (testId: string) => {
    setTests(tests.map(t => 
      t.id === testId ? { ...t, status: "draft" as const } : t
    ));
    toast.info("Test paused");
  };

  const recordFeedback = (testId: string, variantId: string, type: "like" | "dislike") => {
    setTests(tests.map(test => {
      if (test.id !== testId) return test;
      return {
        ...test,
        total_views: test.total_views + 1,
        variants: test.variants.map(v => {
          if (v.id !== variantId) return v;
          const newLikes = type === "like" ? v.likes + 1 : v.likes;
          const newDislikes = type === "dislike" ? v.dislikes + 1 : v.dislikes;
          const newViews = v.views + 1;
          return {
            ...v,
            views: newViews,
            likes: newLikes,
            dislikes: newDislikes,
            engagement_rate: ((newLikes - newDislikes) / newViews * 100),
          };
        }),
      };
    }));
    toast.success("Feedback recorded!");
  };

  const getWinningVariant = (test: ABTest) => {
    return test.variants.reduce((prev, curr) => 
      curr.engagement_rate > prev.engagement_rate ? curr : prev
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-green-500/20 text-green-500";
      case "completed": return "bg-primary/20 text-primary";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">A/B Testing</h1>
          <p className="text-muted-foreground">
            Compare video variations and track which performs best
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
              <Plus className="w-4 h-4 mr-2" />
              New Test
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Test Name</Label>
                <Input
                  placeholder="e.g., Summer Campaign Hook Test"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Project (Optional)</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createTest} className="w-full bg-gradient-primary">
                Create Test
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Active Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {tests.filter(t => t.status === "running").length}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {tests.reduce((sum, t) => sum + t.total_views, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Completed Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {tests.filter(t => t.status === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests List */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all">All Tests</TabsTrigger>
          <TabsTrigger value="running">Running</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        {["all", "running", "completed"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {tests
              .filter(t => tab === "all" || t.status === tab)
              .map((test) => {
                const winner = getWinningVariant(test);
                return (
                  <Card key={test.id} className="bg-gradient-card border-border shadow-card">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-foreground flex items-center gap-2">
                            <FlaskConical className="w-5 h-5 text-primary" />
                            {test.name}
                          </CardTitle>
                          <CardDescription className="text-muted-foreground flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3" />
                            Created {new Date(test.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(test.status)}>
                            {test.status}
                          </Badge>
                          {test.status === "draft" && (
                            <Button size="sm" onClick={() => startTest(test.id)} className="bg-green-600 hover:bg-green-700">
                              <Play className="w-4 h-4 mr-1" />
                              Start
                            </Button>
                          )}
                          {test.status === "running" && (
                            <Button size="sm" variant="outline" onClick={() => pauseTest(test.id)}>
                              <Pause className="w-4 h-4 mr-1" />
                              Pause
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {test.variants.map((variant, idx) => {
                          const isWinning = variant.id === winner.id && test.total_views > 100;
                          return (
                            <div 
                              key={variant.id}
                              className={`p-4 rounded-lg border transition-colors ${
                                isWinning 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border bg-muted/30'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  {isWinning && <Trophy className="w-4 h-4 text-yellow-500" />}
                                  <span className="font-medium text-foreground">{variant.name}</span>
                                </div>
                                <Badge variant="outline">{variant.views} views</Badge>
                              </div>

                              {/* Mock video preview */}
                              <div className="aspect-video bg-muted/50 rounded-lg mb-3 flex items-center justify-center">
                                <Video className="w-8 h-8 text-muted-foreground" />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">Engagement Rate</span>
                                  <span className="font-medium text-foreground">
                                    {variant.engagement_rate.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress value={Math.min(variant.engagement_rate * 5, 100)} className="h-2" />
                              </div>

                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="flex items-center gap-1 text-green-500">
                                    <ThumbsUp className="w-4 h-4" />
                                    {variant.likes}
                                  </span>
                                  <span className="flex items-center gap-1 text-red-500">
                                    <ThumbsDown className="w-4 h-4" />
                                    {variant.dislikes}
                                  </span>
                                </div>
                                {test.status === "running" && (
                                  <div className="flex gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                      onClick={() => recordFeedback(test.id, variant.id, "like")}
                                    >
                                      <ThumbsUp className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                      onClick={() => recordFeedback(test.id, variant.id, "dislike")}
                                    >
                                      <ThumbsDown className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {test.status === "completed" && (
                        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2 text-primary">
                            <Trophy className="w-5 h-5" />
                            <span className="font-medium">Winner: {winner.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            With {winner.engagement_rate.toFixed(1)}% engagement rate and {winner.likes} likes
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </TabsContent>
        ))}
      </Tabs>

      {tests.length === 0 && (
        <div className="text-center py-12">
          <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No A/B tests yet. Create your first test!</p>
        </div>
      )}
    </div>
  );
}
