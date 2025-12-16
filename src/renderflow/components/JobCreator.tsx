import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RenderFlowApi } from "../api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const JobCreator = ({ onJobCreated }: { onJobCreated: () => void }) => {
    const [url, setUrl] = useState("https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    const [variations, setVariations] = useState(1);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return toast.error("Source URL required");

        setSubmitting(true);
        try {
            await RenderFlowApi.submitJob(`proj_${Date.now()}`, url, variations);
            toast.success("Job Submitted Successfully");
            onJobCreated();
        } catch (err: any) {
            toast.error(err.message || "Failed to submit job");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">New Render Job</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Source Video URL</Label>
                        <Input
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            placeholder="https://..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Variations (Copies)</Label>
                        <Input
                            type="number"
                            min={1}
                            max={50}
                            value={variations}
                            onChange={e => setVariations(parseInt(e.target.value))}
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Submit Job"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};
