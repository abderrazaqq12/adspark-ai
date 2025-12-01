import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Sparkles, Clock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 md:p-12">
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
            Create AI Video Ads in Minutes
          </h1>
          <p className="text-lg text-primary-foreground/90 mb-6 max-w-2xl">
            Transform your scripts into stunning video advertisements using cutting-edge AI models. 
            No video editing skills required.
          </p>
          <Button 
            size="lg" 
            onClick={() => navigate("/create")}
            className="bg-background text-foreground hover:bg-background/90 shadow-lg"
          >
            <Video className="w-5 h-5 mr-2" />
            Create Your First Video
          </Button>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Videos Generated
            </CardTitle>
            <Video className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              Start creating your first video
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Credits
            </CardTitle>
            <Sparkles className="w-4 h-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">100</div>
            <p className="text-xs text-muted-foreground mt-1">
              Available for generation
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-border shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Processing Time
            </CardTitle>
            <Clock className="w-4 h-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              No videos yet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Start Guide</CardTitle>
          <CardDescription className="text-muted-foreground">
            Get started with your first AI video ad in 3 simple steps
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Input Your Script</h3>
              <p className="text-sm text-muted-foreground">
                Paste your voice-over script or upload an audio file
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">AI Scene Breakdown</h3>
              <p className="text-sm text-muted-foreground">
                Our AI automatically analyzes and creates scenes from your content
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Generate & Export</h3>
              <p className="text-sm text-muted-foreground">
                Watch as AI creates your video and export in multiple formats
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Projects Placeholder */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground">Recent Projects</CardTitle>
          <CardDescription className="text-muted-foreground">
            Your recently created video ads will appear here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No projects yet. Create your first video to get started!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
