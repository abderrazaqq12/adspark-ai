import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Trash2, FileText, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PromptTemplate {
  id: string;
  name: string;
  template_text: string;
  variables: string[];
  language: string | null;
  category: string | null;
  is_default: boolean | null;
}

interface UserSettings {
  id: string;
  default_language: string | null;
  default_voice: string | null;
  use_free_tier_only: boolean | null;
}

export default function Settings() {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    template_text: "",
    language: "en",
    category: "script",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [templatesRes, settingsRes] = await Promise.all([
        supabase.from("prompt_templates").select("*").order("created_at", { ascending: false }),
        supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (templatesRes.error) throw templatesRes.error;
      
      const templatesWithVariables = (templatesRes.data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? (t.variables as string[]) : []
      }));
      setTemplates(templatesWithVariables as PromptTemplate[]);
      
      if (settingsRes.data) {
        setSettings(settingsRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, "")))];
  };

  const handleSaveTemplate = async () => {
    if (!formData.name || !formData.template_text) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const variables = extractVariables(formData.template_text);
      
      if (editingTemplate) {
        const { error } = await supabase
          .from("prompt_templates")
          .update({
            name: formData.name,
            template_text: formData.template_text,
            variables,
            language: formData.language,
            category: formData.category,
          })
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { error } = await supabase
          .from("prompt_templates")
          .insert({
            user_id: user.id,
            name: formData.name,
            template_text: formData.template_text,
            variables,
            language: formData.language,
            category: formData.category,
          });

        if (error) throw error;
        toast.success("Template created");
      }

      setDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ name: "", template_text: "", language: "en", category: "script" });
      fetchData();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase.from("prompt_templates").delete().eq("id", id);
      if (error) throw error;
      toast.success("Template deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      template_text: template.template_text,
      language: template.language || "en",
      category: template.category || "script",
    });
    setDialogOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_settings")
        .update({
          default_language: settings.default_language,
          use_free_tier_only: settings.use_free_tier_only,
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast.success("Settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage prompt templates and generation preferences
        </p>
      </div>

      {/* Prompt Templates */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Prompt Templates
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Create and manage script generation templates with variables
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                setEditingTemplate(null);
                setFormData({ name: "", template_text: "", language: "en", category: "script" });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Template Name</Label>
                      <Input
                        placeholder="e.g., UGC Product Ad"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="script">Script</SelectItem>
                          <SelectItem value="hook">Hook</SelectItem>
                          <SelectItem value="cta">Call to Action</SelectItem>
                          <SelectItem value="testimonial">Testimonial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={formData.language} onValueChange={(v) => setFormData({ ...formData, language: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Template Text</Label>
                    <Textarea
                      placeholder="Use {{variable_name}} for dynamic content..."
                      value={formData.template_text}
                      onChange={(e) => setFormData({ ...formData, template_text: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available variables: {"{{product_name}}, {{problem}}, {{benefits}}, {{cta}}, {{audience}}, {{brand_tone}}, {{hooks}}, {{offer}}"}
                    </p>
                  </div>
                  {formData.template_text && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Detected variables:</p>
                      <div className="flex flex-wrap gap-1">
                        {extractVariables(formData.template_text).map((v) => (
                          <Badge key={v} variant="secondary">{v}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <Button onClick={handleSaveTemplate} disabled={saving} className="w-full">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {editingTemplate ? "Update Template" : "Save Template"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No templates yet. Create your first one!</p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">{template.name}</h4>
                      {template.is_default && <Badge variant="outline">Default</Badge>}
                      <Badge variant="secondary">{template.language}</Badge>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {template.template_text}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="icon" variant="ghost" onClick={() => handleEditTemplate(template)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {!template.is_default && (
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteTemplate(template.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generation Preferences */}
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader>
          <CardTitle className="text-foreground">Generation Preferences</CardTitle>
          <CardDescription className="text-muted-foreground">
            Customize your default video generation settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Use Free Tier Only</Label>
              <p className="text-sm text-muted-foreground">Only use AI engines with free tier support</p>
            </div>
            <Switch
              checked={settings?.use_free_tier_only || false}
              onCheckedChange={(checked) => setSettings(s => s ? { ...s, use_free_tier_only: checked } : null)}
            />
          </div>

          <Separator className="bg-border" />

          <div className="space-y-2">
            <Label className="text-foreground">Default Language</Label>
            <Select 
              value={settings?.default_language || "en"} 
              onValueChange={(v) => setSettings(s => s ? { ...s, default_language: v } : null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic (Saudi)</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="bg-gradient-primary text-primary-foreground shadow-glow">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
