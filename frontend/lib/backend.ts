const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type HealthResponse = { status: string; gatector?: string };

export async function healthCheck(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(res.status === 503 ? "Backend not ready" : `Health check failed: ${res.status}`);
  }
  return res.json() as Promise<HealthResponse>;
}

export type StartDetectResponse = { job_id: string };

export async function startDetect(): Promise<StartDetectResponse> {
  const res = await fetch(`${API_BASE}/detect`, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Detect failed: ${res.status}`);
  }
  return res.json() as Promise<StartDetectResponse>;
}

export function streamUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/stream`;
}

export type LoadModelsResponse = { job_id: string };

export type LoadModelsBody = { device: string; gaze_training_mode: string };

export async function loadModels(body: LoadModelsBody): Promise<LoadModelsResponse> {
  const res = await fetch(`${API_BASE}/load_models`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { message?: string }).message ?? `Load models failed: ${res.status}`);
  }
  return res.json() as Promise<LoadModelsResponse>;
}
