import { randomUUID } from "crypto";

export type AgentName =
  | "SCANNER"
  | "CLASSIFIER"
  | "PACKAGER"
  | "ESTIMATOR"
  | "VALIDATOR"
  | "REPORTER";

export type AgentStatus = "idle" | "running" | "done" | "error";

export type AgentMessage<T = unknown> = {
  id: string;
  fromAgent: AgentName;
  toAgent: AgentName;
  timestamp: string;
  payload: T;
};

export type FileDetectedPayload = {
  filePath: string;
  fileName: string;
  fileHash: string;
  folderKey: string;
  detectedAt: string;
  sizeBytes: number;
};

export type ClassifiedPayload = {
  filePath: string;
  fileHash: string;
  tradeType: string | null;
  docType: string | null;
  projectHint: string | null;
  confidence: number;
};

export type PackagedPayload = {
  packageId: string;
  vendorId: string | null;
  tradeType: string | null;
  documentPaths: string[];
  createdAt: string;
};

export type ParseResultPayload = {
  filePath: string;
  fileHash: string;
  parsedTotal: number | null;
  lineItems: LineItem[];
  parseStatus: "success" | "failed";
  manualReviewRequired: boolean;
  errorDetail: string | null;
};

export type LineItem = {
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type ValidationResultPayload = {
  filePath: string;
  isValid: boolean;
  issues: string[];
  manualReviewRequired: boolean;
  correctedLineItems: LineItem[];
};

export type ReportPayload = {
  reportType: "quote_comparison" | "bid_status" | "settlement";
  reportPath: string;
  generatedAt: string;
  summary: Record<string, unknown>;
};

export function createMessage<T>(
  fromAgent: AgentName,
  toAgent: AgentName,
  payload: T
): AgentMessage<T> {
  return {
    id: randomUUID(),
    fromAgent,
    toAgent,
    timestamp: new Date().toISOString(),
    payload,
  };
}

// IPC channel constants
export const IPC_CHANNELS = {
  // main → renderer
  STATUS_UPDATE: "agent:status-update",
  FILE_DETECTED: "agent:file-detected",
  PARSE_COMPLETE: "agent:parse-complete",
  MANUAL_REVIEW: "agent:manual-review",
  // renderer → main
  START_WAVE: "agent:start-wave",
  GET_STATUS: "agent:get-status",
} as const;
