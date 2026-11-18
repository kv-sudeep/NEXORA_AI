import { VideoProject, RenderJob, MediaAsset } from "./types";

const BASE_URL = "";

export function getMediaStreamUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  return `${BASE_URL}/api/jarvis/video/stream?path=${encodeURIComponent(path)}`;
}

export async function fetchProjects(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/jarvis/video/projects`);
    const data = await res.json();
    return data.projects || [];
  } catch {
    return [];
  }
}

export async function fetchProject(id: string): Promise<VideoProject | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/jarvis/video/project/${id}`);
    const data = await res.json();
    return data.project || null;
  } catch {
    return null;
  }
}

export async function createProject(name: string, aspectRatio: string, fps: number): Promise<VideoProject | null> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/project/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, aspectRatio, fps }),
  });
  const data = await res.json();
  return data.project || null;
}

export async function saveProject(project: VideoProject): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/jarvis/video/project/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}

export async function inspectMedia(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/lossless/inspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return res.json();
}

export async function checkCompatibility(paths: string[]): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/lossless/compatibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });
  return res.json();
}

export async function losslessTrim(path: string, start: number, end: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/lossless/trim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, start, end }),
  });
  return res.json();
}

export async function losslessMerge(paths: string[]): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/lossless/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });
  return res.json();
}

export async function startRenderJob(project: VideoProject, settings: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/render/timeline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, settings }),
  });
  return res.json();
}

export async function fetchRenderJobs(): Promise<RenderJob[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/jarvis/video/render/jobs`);
    const data = await res.json();
    return data.jobs || [];
  } catch {
    return [];
  }
}

export async function cancelRenderJob(jobId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/render/cancel/${jobId}`, {
    method: "POST",
  });
  const data = await res.json();
  return !!data.success;
}

export async function fetchDrives(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/jarvis/video/drives`);
    const data = await res.json();
    return data.drives || [];
  } catch {
    return [];
  }
}

export async function scanDirectory(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/drives/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return res.json();
}

export async function generateAIPlan(instruction: string, projectId?: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/ai/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction, projectId }),
  });
  return res.json();
}

export async function detectScenes(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/ai/scenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return res.json();
}

export async function detectSilence(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/ai/silence`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return res.json();
}

export async function generateSubtitles(path: string, language: string = "en"): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/subtitles/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, language }),
  });
  return res.json();
}

export async function generateTTS(text: string, voice: string = "en-US"): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/audio/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice }),
  });
  return res.json();
}

export async function fetchTemplates(): Promise<any[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/jarvis/video/templates`);
    const data = await res.json();
    return data.templates || [];
  } catch {
    return [];
  }
}

export async function renderTemplate(templateId: string, params: any): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/jarvis/video/templates/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId, params }),
  });
  return res.json();
}

