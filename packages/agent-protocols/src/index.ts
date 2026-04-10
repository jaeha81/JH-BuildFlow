// Agent state types
export type AgentName =
  | "SCANNER"
  | "CLASSIFIER"
  | "PACKAGER"
  | "ESTIMATOR"
  | "VALIDATOR"
  | "REPORTER";

export type AgentStatus = "idle" | "running" | "done" | "error";

export type AgentState = {
  name: AgentName;
  status: AgentStatus;
  lastRunAt: string | null;
  errorMessage: string | null;
  processedCount: number;
};

// Agent message protocol
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
  projectId: string | null;
  confidence: number;
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

// IPC channel names
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

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
