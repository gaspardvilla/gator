"use client";

import { useEffect, useRef, useState } from "react";
import { streamUrl } from "@/lib/backend";

export type StreamStatus = "idle" | "running" | "done" | "error";

export type OutputType = "video" | "image";

export type DetectStreamState = {
  checkpoints: string[];
  status: StreamStatus;
  outputDir?: string;
  outputType?: OutputType;
  errorMessage?: string;
  isConnected: boolean;
};

function parseSSEEvent(line: string): Record<string, unknown> | null {
  if (line.startsWith("data: ")) {
    try {
      return JSON.parse(line.slice(6)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

export function useDetectStream(jobId: string | null): DetectStreamState {
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [outputDir, setOutputDir] = useState<string | undefined>();
  const [outputType, setOutputType] = useState<OutputType | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [isConnected, setIsConnected] = useState(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (!jobId) {
      setCheckpoints([]);
      setStatus("idle");
      setOutputDir(undefined);
      setOutputType(undefined);
      setErrorMessage(undefined);
      setIsConnected(false);
      return;
    }

    setStatus("running");
    setCheckpoints([]);
    setOutputDir(undefined);
    setOutputType(undefined);
    setErrorMessage(undefined);

    const url = streamUrl(jobId);
    const eventSource = new EventSource(url);

    eventSource.onopen = () => setIsConnected(true);

    eventSource.onmessage = (event) => {
      const data = parseSSEEvent(`data: ${event.data}`);
      if (!data) return;

      const checkpoint = data.checkpoint as string | undefined;
      if (checkpoint === "ping") return;

      if (checkpoint) {
        setCheckpoints((prev) => [...prev, checkpoint]);
      }

      if (checkpoint === "done") {
        setStatus("done");
        if (typeof data.output_dir === "string") setOutputDir(data.output_dir);
        if (data.output_type === "video" || data.output_type === "image") setOutputType(data.output_type);
        eventSource.close();
        setIsConnected(false);
      } else if (checkpoint === "error") {
        setStatus("error");
        if (typeof data.message === "string") setErrorMessage(data.message);
        eventSource.close();
        setIsConnected(false);
      }
    };

    eventSource.onerror = () => {
      if (statusRef.current === "running") {
        setStatus("error");
        setErrorMessage("Stream connection lost");
      }
      eventSource.close();
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [jobId]);

  return { checkpoints, status, outputDir, outputType, errorMessage, isConnected };
}
