import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, 
  Loader2, 
  FileText, 
  Play, 
  Copy, 
  CheckCircle2,
  Sparkles,
  ShoppingCart,
  Megaphone,
  Users,
  Star,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  template_text: string;
  variables: string[];
  preview_url?: string;
  uses: number;
  rating: number;
}

const PRESET_TEMPLATES: Template[] = [
  {
    id: "ugc-product-review",
    name: "UGC Product Review",
    description: "Authentic user-generated style product review video script",
    category: "UGC",
    template_text: `Hook: "I finally tried {{product_name}} and here's my honest review..."

Scene 1 - Problem Setup:
"I've been struggling with {{problem}} for months. Nothing seemed to work until I found this."

Scene 2 - Discovery:
"A friend recommended {{product_name}} to me, and I was skeptical at first..."

Scene 3 - Experience:
"After using it for {{duration}}, I noticed {{benefits}}. The difference is incredible!"

Scene 4 - Social Proof:
"I'm not the only one - thousands of people are getting results with this."

Scene 5 - CTA:
"{{cta}} - Link in bio. You won't regret it!"`,
    variables: ["product_name", "problem", "duration", "benefits", "cta"],
    uses: 2453,
    rating: 4.8,
  },
  {
    id: "problem-solution-ad",
    name: "Problem-Solution Ad",
    description: "Classic marketing structure that highlights pain points and solutions",
    category: "Marketing",
    template_text: `Hook: "Stop making this mistake with {{topic}}!"

Scene 1 - Pain Point:
"{{problem}} is costing you time and money. Most people don't even realize it."

Scene 2 - Agitate:
"Every day you wait, {{negative_consequence}}. It doesn't have to be this way."

Scene 3 - Solution:
"{{product_name}} solves this by {{solution_method}}. It's designed for {{audience}}."

Scene 4 - Benefits:
"With {{product_name}}, you'll experience:
- {{benefit_1}}
- {{benefit_2}}  
- {{benefit_3}}"

Scene 5 - Urgency & CTA:
"{{offer}}. {{cta}} before {{deadline}}!"`,
    variables: ["topic", "problem", "negative_consequence", "product_name", "solution_method", "audience", "benefit_1", "benefit_2", "benefit_3", "offer", "cta", "deadline"],
    uses: 1876,
    rating: 4.7,
  },
  {
    id: "testimonial-story",
    name: "Customer Testimonial Story",
    description: "Emotional customer journey storytelling format",
    category: "Testimonial",
    template_text: `Hook: "This changed everything for me..."

Scene 1 - Before State:
"Before {{product_name}}, I was {{before_state}}. I tried everything but nothing worked."

Scene 2 - Discovery Moment:
"Then I discovered {{product_name}}. I was hesitant because {{objection}}, but I decided to try."

Scene 3 - Transformation:
"Within {{timeframe}}, I started seeing {{transformation}}. I couldn't believe it."

Scene 4 - Current State:
"Now I {{current_state}}. My {{life_aspect}} has completely changed."

Scene 5 - Recommendation:
"If you're dealing with {{problem}}, trust me - {{product_name}} is worth it. {{cta}}"`,
    variables: ["product_name", "before_state", "objection", "timeframe", "transformation", "current_state", "life_aspect", "problem", "cta"],
    uses: 1543,
    rating: 4.9,
  },
  {
    id: "feature-showcase",
    name: "Feature Showcase",
    description: "Highlight key product features with demonstrations",
    category: "Product",
    template_text: `Hook: "{{product_name}} has {{number}} features you NEED to know about"

Scene 1 - Feature 1:
"First, {{feature_1}}. This means you can {{benefit_1}} without any hassle."

Scene 2 - Feature 2:
"Second, {{feature_2}}. Perfect for {{use_case_2}}."

Scene 3 - Feature 3:
"Third, {{feature_3}}. No more {{pain_point}} ever again."

Scene 4 - Comparison:
"Unlike other {{product_category}}, {{product_name}} gives you {{unique_advantage}}."

Scene 5 - CTA:
"Get {{product_name}} now and experience the difference. {{cta}}"`,
    variables: ["product_name", "number", "feature_1", "benefit_1", "feature_2", "use_case_2", "feature_3", "pain_point", "product_category", "unique_advantage", "cta"],
    uses: 1234,
    rating: 4.6,
  },
  {
    id: "listicle-ad",
    name: "Listicle Video Ad",
    description: "Engaging list-format video perfect for social media",
    category: "Social",
    template_text: `Hook: "{{number}} reasons why {{audience}} love {{product_name}}"

Reason 1:
"Number {{number}}: {{reason_1}}. {{explanation_1}}"

Reason 2:
"Number {{number_2}}: {{reason_2}}. {{explanation_2}}"

Reason 3:
"Number {{number_3}}: {{reason_3}}. {{explanation_3}}"

Bonus:
"And here's a secret bonus - {{bonus_reason}}!"

CTA:
"Join {{social_proof_number}}+ {{audience}} who made the switch. {{cta}}"`,
    variables: ["number", "audience", "product_name", "reason_1", "explanation_1", "number_2", "reason_2", "explanation_2", "number_3", "reason_3", "explanation_3", "bonus_reason", "social_proof_number", "cta"],
    uses: 987,
    rating: 4.5,
  },
  {
    id: "flash-sale-promo",
    name: "Flash Sale Promo",
    description: "High-urgency promotional video for limited-time offers",
    category: "Promo",
    template_text: `Hook: "🚨 {{sale_name}} ENDS {{deadline}}! 🚨"

Scene 1 - Announcement:
"{{brand_name}} is having our biggest sale of the year. {{discount_percentage}}% OFF everything!"

Scene 2 - Featured Products:
"Our bestselling {{product_category}} including {{product_1}} and {{product_2}} are all included."

Scene 3 - Value Stack:
"That's {{original_value}} worth of products for just {{sale_price}}. You save {{savings}}!"

Scene 4 - Urgency:
"But hurry - this deal expires {{deadline}}. {{stock_urgency}}"

Scene 5 - CTA:
"{{cta}} | Code: {{promo_code}} | Link in bio!"`,
    variables: ["sale_name", "deadline", "brand_name", "discount_percentage", "product_category", "product_1", "product_2", "original_value", "sale_price", "savings", "stock_urgency", "cta", "promo_code"],
    uses: 2100,
    rating: 4.7,
  },
  {
    id: "how-to-tutorial",
    name: "How-To Tutorial",
    description: "Educational content showing product usage step by step",
    category: "Educational",
    template_text: `Hook: "How to {{desired_outcome}} in {{timeframe}} using {{product_name}}"

Step 1:
"First, {{step_1}}. This sets you up for success."

Step 2:
"Next, {{step_2}}. Make sure to {{tip_2}}."

Step 3:
"Then, {{step_3}}. This is where the magic happens."

Step 4:
"Finally, {{step_4}}. And that's it!"

Result:
"Now you have {{result}}! See how easy that was? Get {{product_name}} and try it yourself. {{cta}}"`,
    variables: ["desired_outcome", "timeframe", "product_name", "step_1", "step_2", "tip_2", "step_3", "step_4", "result", "cta"],
    uses: 876,
    rating: 4.8,
  },
  {
    id: "comparison-ad",
    name: "Comparison Ad",
    description: "Show why your product beats the competition",
    category: "Marketing",
    template_text: `Hook: "{{product_name}} vs {{competitor}} - Which one wins?"

Scene 1 - Setup:
"I tested both {{product_name}} and {{competitor}} for {{test_duration}}. Here's what I found."

Scene 2 - Comparison Point 1:
"{{comparison_1}}: {{product_name}} scored {{score_1_product}} while {{competitor}} only got {{score_1_competitor}}."

Scene 3 - Comparison Point 2:
"{{comparison_2}}: {{advantage_explanation}}"

Scene 4 - Comparison Point 3:
"{{comparison_3}}: The difference was {{difference_description}}"

Scene 5 - Verdict:
"The winner? {{product_name}} by a mile. {{cta}} and see for yourself!"`,
    variables: ["product_name", "competitor", "test_duration", "comparison_1", "score_1_product", "score_1_competitor", "comparison_2", "advantage_explanation", "comparison_3", "difference_description", "cta"],
    uses: 654,
    rating: 4.4,
  },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  UGC: <Users className="w-4 h-4" />,
  Marketing: <Megaphone className="w-4 h-4" />,
  Testimonial: <Star className="w-4 h-4" />,
  Product: <ShoppingCart className="w-4 h-4" />,
  Social: <Zap className="w-4 h-4" />,
  Promo: <Sparkles className="w-4 h-4" />,
  Educational: <FileText className="w-4 h-4" />,
};

export default function Templates() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [templates, setTemplates] = useState<Template[]>(PRESET_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = ["all", ...new Set(PRESET_TEMPLATES.map(t => t.category))];

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                         t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = async (template: Template) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to use templates");
        return;
      }

      // Check if template already exists for user
      const { data: existing } = await supabase
        .from("prompt_templates")
        .select("id")
        .eq("user_id", user.id)
        .eq("name", template.name)
        .maybeSingle();

      if (existing) {
        toast.info("Template already in your collection");
        return;
      }

      const { error } = await supabase.from("prompt_templates").insert({
        user_id: user.id,
        name: template.name,
        template_text: template.template_text,
        variables: template.variables,
        language: "en",
        category: template.category.toLowerCase(),
      });

      if (error) throw error;
      toast.success("Template added to your collection!");
    } catch (error: any) {
      toast.error(error.message || "Failed to add template");
    }
  };

  const copyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Template copied to clipboard");
  };

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Template Marketplace</h1>
        <p className="text-muted-foreground">
          Browse and use pre-made video templates for different ad types
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="bg-muted/50 flex-wrap h-auto">
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat} className="capitalize">
                {cat === "all" ? "All" : (
                  <span className="flex items-center gap-1">
                    {CATEGORY_ICONS[cat]}
                    {cat}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="bg-gradient-card border-border shadow-card hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-foreground text-lg">{template.name}</CardTitle>
                  <CardDescription className="text-muted-foreground mt-1">
                    {template.description}
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {CATEGORY_ICONS[template.category]}
                  <span className="ml-1">{template.category}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{template.uses.toLocaleString()} uses</span>
                </div>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{template.rating}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {template.variables.slice(0, 4).map((v) => (
                  <Badge key={v} variant="outline" className="text-xs">
                    {`{{${v}}}`}
                  </Badge>
                ))}
                {template.variables.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.variables.length - 4} more
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{template.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">{template.description}</p>
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
                          {template.template_text}
                        </pre>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-sm text-muted-foreground">Variables:</span>
                        {template.variables.map((v) => (
                          <Badge key={v} variant="secondary">{v}</Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => copyTemplate(template.template_text)} variant="outline">
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                        <Button onClick={() => handleUseTemplate(template)} className="bg-gradient-primary">
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Add to My Templates
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button 
                  onClick={() => handleUseTemplate(template)}
                  className="flex-1 bg-gradient-primary text-primary-foreground"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Use
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No templates found matching your criteria</p>
        </div>
      )}
    </div>
  );
}
