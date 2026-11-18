/**
 * use-video-editor.ts — React hook for video editing operations
 */
import { useState, useCallback } from "react";

const BACKEND = "";

export interface VideoOperation {
  type: "trim" | "split" | "merge" | "convert" | "resize" |
        "brightness" | "contrast" | "saturation" | "grayscale" |
        "vintage" | "blur" | "text" | "watermark" | "rotate" | "cut";
  path?: string;
  paths?: string[];
  start?: number;
  end?: number;
  splitPoints?: number[];
  width?: number;
  height?: number;
  factor?: number;
  format?: string;
  degrees?: number;
  text?: string;
  watermarkPath?: string;
  title?: string;
  resolution?: string;
}

export interface VideoResult {
  success: boolean;
  error?: string;
  input_path?: string;
  output_path?: string;
  operation?: string;
  parameters?: Record<string, any>;
  metadata?: any;
}

export function useVideoEditor() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<VideoResult | null>(null);

  const executeOperation = useCallback(async (operation: VideoOperation): Promise<VideoResult> => {
    setIsProcessing(true);
    setLastResult(null);

    try {
      // Determine endpoint based on operation type
      let endpoint: string;
      let body: Record<string, any>;

      if (operation.type === "trim" || operation.type === "cut") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: operation.type,
          start: operation.start,
          end: operation.end || operation.start
        };
      } else if (operation.type === "split") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "split",
          split_points: operation.splitPoints
        };
      } else if (operation.type === "merge") {
        endpoint = "/api/jarvis/video/merge";
        body = {
          paths: operation.paths,
          title: operation.title
        };
      } else if (operation.type === "convert") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "convert",
          format: operation.format || "mp4"
        };
      } else if (operation.type === "resize") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "resize",
          width: operation.width,
          height: operation.height
        };
      } else if (operation.type === "brightness") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "adjust brightness",
          factor: operation.factor
        };
      } else if (operation.type === "contrast") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "adjust contrast",
          factor: operation.factor
        };
      } else if (operation.type === "saturation") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "adjust saturation",
          factor: operation.factor
        };
      } else if (operation.type === "grayscale") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "apply filter:grayscale"
        };
      } else if (operation.type === "vintage") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "apply filter:vintage"
        };
      } else if (operation.type === "text") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "add text",
          text: operation.text,
          position: "bottom"
        };
      } else if (operation.type === "watermark") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "add watermark",
          watermark_path: operation.watermarkPath
        };
      } else if (operation.type === "rotate") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "rotate",
          degrees: operation.degrees || 90
        };
      } else if (operation.type === "blur") {
        endpoint = "/api/jarvis/video/edit";
        body = {
          path: operation.path,
          operation: "apply filter:blur"
        };
      } else if (operation.type === "export") {
        endpoint = "/api/jarvis/video/export";
        body = {
          path: operation.path,
          resolution: operation.resolution || "1080p",
          format: operation.format || "mp4"
        };
      } else {
        return { success: false, error: `Unknown operation: ${operation.type}` };
      }

      const response = await fetch(BACKEND + endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      setLastResult(result);
      return result;

    } catch (error) {
      const errorResult = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const analyzeVideo = useCallback(async (videoPath: string): Promise<VideoResult> => {
    setIsProcessing(true);
    setLastResult(null);

    try {
      const response = await fetch(BACKEND + "/api/jarvis/video/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: videoPath })
      });

      const result = await response.json();
      setLastResult({ success: true, metadata: result, input_path: videoPath });
      return { success: true, metadata: result, input_path: videoPath };

    } catch (error) {
      const errorResult = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    isProcessing,
    lastResult,
    executeOperation,
    analyzeVideo
  };
}