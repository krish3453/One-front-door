export type MessageRole =
  | "user"
  | "assistant"
  | "system";

export type AgentType =
  | "academic"
  | "campus"
  | "general"
  | "multi";

export type StepStage =
  | "cache_check"
  | "analyzing"
  | "routing"
  | "action_tool"
  | "retrieval"
  | "synthesizing"
  | "complete";

export interface AgentExecutionStep {
  id: string;
  stage: StepStage;
  title: string;
  description: string;
  agent?: AgentType;
  status: "running" | "completed" | "cached" | "skipped";
  durationMs?: number;
  details?: Record<string, unknown>;
}

export interface AttendanceCalculationResult {
  conducted: number;
  attended: number;
  currentPercentage: number;
  targetPercentage: number;
  status: "safe" | "warning" | "danger" | "debarred";
  bunksAvailable: number;
  classesNeededToRecover: number;
  subjectName?: string;
  summary: string;
}

export interface AcademicPetitionResult {
  petitionType: string;
  recipient: string;
  subject: string;
  body: string;
  relevantRulesCited: string[];
  enclosures: string[];
}

export interface ActionPayload {
  type: "attendance_calculator" | "academic_petition" | "general_action";
  attendance?: AttendanceCalculationResult;
  petition?: AcademicPetitionResult;
  title?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  agent?: AgentType;
  createdAt: string;
  steps?: AgentExecutionStep[];
  actionData?: ActionPayload;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatSource {
  source: string;
  page?: number;
  documentType: string;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
  sources?: ChatSource[];
  steps?: AgentExecutionStep[];
  cached?: boolean;
  latencyMs?: number;
}

export type StreamEvent =
  | { type: "step"; step: AgentExecutionStep }
  | { type: "token"; delta: string }
  | { type: "action"; actionData: ActionPayload }
  | { type: "sources"; sources: ChatSource[] }
  | { type: "done"; response: ChatResponse }
  | { type: "error"; error: string };