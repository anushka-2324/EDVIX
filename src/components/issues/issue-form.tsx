"use client";

import { useState, useTransition } from "react";
import { ImagePlus, Send } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type IssueFormProps = {
  onCreated?: () => void;
};

export function IssueForm({ onCreated }: IssueFormProps) {
  const [category, setCategory] = useState("Infrastructure");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const submitIssue = () => {
    startTransition(async () => {
      try {
        let imageUrl: string | null = null;

        if (imageFile) {
          const supabase = createClient();
          const filePath = `${Date.now()}-${imageFile.name.replaceAll(" ", "-")}`;

          const { error: uploadError } = await supabase.storage
            .from("issue-images")
            .upload(filePath, imageFile, { upsert: true });

          if (uploadError) {
            throw uploadError;
          }

          const { data: publicPath } = supabase.storage.from("issue-images").getPublicUrl(filePath);
          imageUrl = publicPath.publicUrl;
        }

        const res = await fetch("/api/issues", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `[${category}] ${title}`,
            description,
            image_url: imageUrl,
          }),
        });

        const payload = await res.json();

        if (!res.ok) {
          throw new Error(payload.error ?? "Failed to submit issue");
        }

        toast.success("Issue submitted to admin desk");
        setCategory("Infrastructure");
        setTitle("");
        setDescription("");
        setImageFile(null);
        onCreated?.();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to report issue");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Campus Issue</CardTitle>
        <CardDescription>Submit category, description, and optional image evidence.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="issue-category">Category</Label>
          <Select
            id="issue-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            options={[
              { label: "Infrastructure", value: "Infrastructure" },
              { label: "Transport", value: "Transport" },
              { label: "Classroom", value: "Classroom" },
              { label: "Hostel", value: "Hostel" },
              { label: "Safety", value: "Safety" },
            ]}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue-title">Issue title</Label>
          <Input
            id="issue-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Broken projector in Hall C4"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue-description">Description</Label>
          <Textarea
            id="issue-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Include exact location and urgency"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="issue-image">Image (optional)</Label>
          <Input
            id="issue-image"
            type="file"
            accept="image/*"
            onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
          />
          {imageFile && (
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <ImagePlus className="size-3" />
              {imageFile.name}
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={submitIssue}
          disabled={isPending || !title.trim() || !description.trim()}
        >
          <Send className="mr-2 size-4" />
          Submit Issue
        </Button>
      </CardContent>
    </Card>
  );
}
