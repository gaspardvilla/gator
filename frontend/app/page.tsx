"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { healthCheck, startDetect } from "@/lib/backend";
import { useDetectStream } from "@/hooks/useDetectStream";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

const CHECKPOINT_LABELS: Record<string, string> = {
  input_loaded: "Input loaded",
  heads_detected: "Heads detected & tracked",
  gaze_predicted: "Gaze predicted",
  drawing: "Drawing gaze on output",
};

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);

  const { isSuccess: isHealthy, isLoading: healthLoading } = useQuery({
    queryKey: ["health"],
    queryFn: healthCheck,
    refetchInterval: 10_000,
    retry: 2,
  });

  const detectMutation = useMutation({
    mutationFn: startDetect,
    onSuccess: (data) => {
      setJobId(data.job_id);
      toast.success("Detection started");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to start detection");
    },
  });

  const stream = useDetectStream(jobId);

  const isRunning =
    stream.status === "running" || (detectMutation.isPending && !stream.errorMessage);
  const canRun = isHealthy && !isRunning;

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <main className="w-full max-w-lg space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Gatector</CardTitle>
            <CardDescription>3D gaze extraction from video</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  isHealthy ? "bg-green-500" : healthLoading ? "bg-amber-500 animate-pulse" : "bg-red-500"
                }`}
                aria-hidden
              />
              <span className="text-sm text-muted-foreground">
                {healthLoading
                  ? "Checking backend…"
                  : isHealthy
                    ? "Backend ready"
                    : "Backend unavailable"}
              </span>
            </div>

            <Button
              onClick={() => detectMutation.mutate()}
              disabled={!canRun}
              className="w-full"
            >
              {isRunning ? "Running…" : "Run detection"}
            </Button>

            {stream.checkpoints.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Progress</p>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {stream.checkpoints.map((cp, i) => (
                    <li key={`${cp}-${i}`}>
                      {CHECKPOINT_LABELS[cp] ?? cp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {stream.status === "done" && stream.outputDir && (
              <Alert>
                <AlertTitle>Done</AlertTitle>
                <AlertDescription>
                  Output saved to {stream.outputDir}
                </AlertDescription>
              </Alert>
            )}

            {stream.status === "error" && stream.errorMessage && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{stream.errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
