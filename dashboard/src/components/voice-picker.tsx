"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { Play, Pause, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiClient } from "@/lib/api-client";
import type { VoiceOption } from "@/lib/types";
import { cn } from "@/lib/utils";

// Voices come from the live voice-AI provider's API, proxied through our
// backend — we don't ship a hardcoded list, so this always reflects
// whatever's actually available to pick from. Errors here are shown as
// generic messages, never the raw backend/provider error text — that text
// can include vendor/internal details we don't surface in-product.
export function VoicePicker({ selectedVoiceId }: { selectedVoiceId: string | null }) {
  const [voices, setVoices] = useState<VoiceOption[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState(selectedVoiceId);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient<VoiceOption[]>("/organization/voice/options")
      .then((data) => {
        if (!cancelled) setVoices(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load voices — try again shortly.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function togglePreview(voice: VoiceOption) {
    if (!voice.previewUrl) return;
    if (playingId === voice.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(voice.previewUrl);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    void audio.play();
    setPlayingId(voice.id);
  }

  function choose(voice: VoiceOption) {
    startTransition(async () => {
      try {
        await apiClient("/organization/voice", {
          method: "PATCH",
          body: JSON.stringify({ voiceId: voice.id }),
        });
        setSelected(voice.id);
        toast.success(`Voice set to ${voice.name} — live on your agent now.`);
      } catch {
        toast.error("Couldn't set voice — try again.");
      }
    });
  }

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  if (voices === null) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (voices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No voices available to choose from for this provider yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {voices.map((voice) => {
        const isSelected = selected === voice.id;
        const isPlaying = playingId === voice.id;
        return (
          <div
            key={voice.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3",
              isSelected ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            {voice.previewUrl && (
              <Button
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                onClick={() => togglePreview(voice)}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{voice.name}</p>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {voice.gender && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {voice.gender}
                  </Badge>
                )}
                {voice.accent && (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {voice.accent}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant={isSelected ? "secondary" : "outline"}
              disabled={isPending || isSelected}
              onClick={() => choose(voice)}
              className="shrink-0 gap-1"
            >
              {isSelected && <Check className="h-3.5 w-3.5" />}
              {isSelected ? "Selected" : "Select"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
