// merci.2.14.0.d.ts
// TypeScript Declaration File for the Merci SDK v2.14.0

import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';

// --- GENERIC & CHAT-RELATED TYPES ---

/** Represents a single tool that the AI model can decide to call. */
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: object; // JSON Schema object
    execute: (args: any) => any | Promise<any>;
}

/** A structured message representing the user's input. */
export interface UserMessage {
    type: 'user_message';
    content: string;
}

/** A structured message to set the AI's persona or rules. */
export interface SystemMessage {
    type: 'system_message';
    content: string;
}

/** A structured message representing the AI's text response. */
export interface AssistantTextMessage {
    type: 'assistant_message_text';
    content: string;
}

/** A structured message representing the AI's decision to call a tool. */
export interface AssistantToolCallMessage {
    type: 'assistant_message_tool';
    id: string;
    toolName: string;
    content: string; // JSON string of arguments
}

/** A structured message providing the result of a tool's execution back to the AI. */
export interface ToolResultMessage {
    type: 'tool_message';
    id: string;
    toolName: string;
    result: string; // JSON string of the tool's output
}

/** A structured message containing media data, like an image. */
export interface MediaMessage {
    type: 'media_message';
    mediaType: string;
    data: string; // Base64 encoded string
}

/** A union of all possible message types that can be part of a chat history. */
export type ChatMessage = UserMessage | SystemMessage | AssistantTextMessage | AssistantToolCallMessage | ToolResultMessage | MediaMessage;

/** Represents a tool call requested by the model during a stream. */
export interface ToolCall {
    id: string;
    name: string;
    arguments: string; // JSON string of arguments
}

/** Represents the successful or failed result of executing a single tool. */
export interface ToolExecutionResult {
    name: string;
    success: boolean;
    result?: any;
    error?: string;
}

// --- AGENTIC WORKFLOW TYPES (v2.14.0) ---

/** Represents the object yielded by the step() generator when the model requests to call tools. */
export interface AgentToolRequest {
    type: 'tool_request';
    calls: ToolCall[];
}

/** Represents the final object returned by the step() generator. */
export interface AgentTextResponse {
    type: 'text_response';
    content: string;
    messages: ChatMessage[];
}


// --- CHAT STREAM EVENT TYPES ---

export interface TextStreamEvent {
    type: 'text';
    content: string;
}

export interface ToolCallsStreamEvent {
    type: 'tool_calls';
    calls: ToolCall[];
}

export interface QuotaStreamEvent {
    type: 'quota';
    data: object;
}

/** A union of all possible events yielded by the chat response stream. */
export type StreamEvent = TextStreamEvent | ToolCallsStreamEvent | QuotaStreamEvent;


// --- TASK API TYPES ---

/** Represents the successful result of a roster call. */
export interface TaskRosterResult {
    ids: string[];
}

/** A content event from a task stream. */
export interface TaskContentEvent {
    type: 'Content';
    content: string;
}

/** A metadata event from a task stream. */
export interface TaskMetadataEvent {
    type: 'QuotaMetadata' | 'ExecutionMetadata' | 'FinishMetadata' | 'UnknownMetadata' | 'FunctionCallMetadata';
    data: object;
}

/** A union of all possible events yielded by the task response stream. */
export type TaskStreamEvent = TaskContentEvent | TaskMetadataEvent;

/** The aggregated result of a task execution. */
export interface TaskResult {
    content: string;
    quotaMetadata: object | null;
    executionMetadata: object[];
    finishMetadata: object | null;
    unknownMetadata: object | null;
    functionCallMetadata: object | null;
}


// --- API CLASSES ---

/**
 * A fluent interface for building model-specific parameters for a request.
 */
export declare class ParameterBuilder {
    temperature(value: number): this;
    topP(value: number): this;
    topK(value: number): this;
    length(value: number): this;
    stopToken(value: string): this;
    seed(value: number): this;
    asJson(): this;
    toolChoiceAuto(isEnabled?: boolean): this;
    toolChoiceRequired(isEnabled?: boolean): this;
    toolChoiceNone(isEnabled?: boolean): this;
    toolChoiceNamed(toolName: string): this;
    parallelToolCalls(isEnabled?: boolean): this;
    reasoningEffort(level: 'low' | 'medium' | 'high'): this;
    predictedOutput(text: string): this;
    cachePoints(cacheObject: object): this;
    thinkingBudget(value: number): this;
    numberOfChoices(value: number): this;
    verbosity(level: string): this;
}

/**
 * Represents a configured chat session for a specific model profile.
 */
export declare class ChatSession {
    withTools(tools: ToolDefinition[]): this;
    withSystemMessage(content: string): this;
    withParameters(builderFn: (builder: ParameterBuilder) => ParameterBuilder): this;
    stream(initialInput: string | ChatMessage[]): AsyncIterable<StreamEvent>;

    /**
     * Executes a single turn of the agentic loop, yielding control when tools are requested.
     * @param messages The current conversation history.
     * @param options Options for this step, like forcing a text response.
     * @returns An async generator that yields tool requests and returns a final text response.
     */
    step(
        messages: ChatMessage[],
        options?: { forceTextResponse?: boolean }
    ): AsyncGenerator<AgentToolRequest, AgentTextResponse, ToolExecutionResult[]>;

    /**
     * Runs the agentic loop automatically until a final text response is generated.
     * @param initialInput The initial user prompt or message history.
     * @param options Configuration for the run, such as `maxIterations`.
     */
    run(
        initialInput: string | ChatMessage[],
        options?: { maxIterations?: number }
    ): Promise<string>;
}

/**
 * Provides access to server-side task execution.
 */
export declare class TaskAPI {
    /** Retrieves the list of available task IDs. */
    roster(): Promise<TaskRosterResult>;

    /**
     * Executes a task and returns the response as a stream of events.
     * @param id The ID of the task to execute (e.g., 'code-generate:default').
     * @param parameters An object containing the parameters for the task.
     */
    stream(id: string, parameters: object): AsyncIterable<TaskStreamEvent>;

    /**
     * Executes a task and returns the aggregated result once complete.
     * @param id The ID of the task to execute.
     * @param parameters An object containing the parameters for the task.
     */
    execute(id: string, parameters: object): Promise<TaskResult>;
}

/**
 * The main client for interacting with the JetBrains AI Platform.
 */
export declare class MerciClient extends EventEmitter {
    constructor(options: {
        token: string;
        authType?: 'user' | 'service' | 'application';
        endpoint?: string;
    });

    /** Access the Chat API. */
    chat: ChatAPI;

    /** Access the Task API. */
    tasks: TaskAPI;

    // --- Event Emitter Overloads ---
    on(event: 'api_request', listener: (payload: { url: string; method?: string; body?: string }) => void): this;
    on(event: 'api_response', listener: (payload: { url: string; status: number; ok: boolean }) => void): this;
    on(event: 'token_refresh_start', listener: () => void): this;
    on(event: 'token_refresh_success', listener: (newToken: string) => void): this;
    on(event: 'error', listener: (error: APIError) => void): this;
    on(event: 'tool_start', listener: (payload: { calls: ToolCall[] }) => void): this;
    on(event: 'tool_finish', listener: (payload: { results: ToolExecutionResult[] }) => void): this;
    on(event: 'tool_warning', listener: (payload: { message: string }) => void): this;
    on(event: 'parameter_warning', listener: (warning: { parameter: string; profile: string; message: string }) => void): this;
}

/**
 * Provides access to the chat functionalities.
 */
export declare class ChatAPI {
    /**
     * Creates a new chat session for a specific model profile.
     * @param profile The identifier for the model to use (e.g., 'google-chat-gemini-flash-2.5').
     */
    session(profile: string): ChatSession;
}


// --- ERRORS ---

/** Custom error class for API-related issues. */
export declare class APIError extends Error {
    constructor(message: string, status?: number, details?: any);
    public readonly status?: number;
    public readonly details?: any;
}

/** Custom error for non-2xx API responses. */
export declare class APIStatusError extends APIError {}

/** Custom error for Server-Sent Events (SSE) stream parsing issues. */
export declare class SSEError extends APIError {}


// --- HELPER FUNCTIONS ---

export declare function createUserMessage(content: string): UserMessage;
export declare function createSystemMessage(content: string): SystemMessage;
export declare function createAssistantTextMessage(content: string): AssistantTextMessage;
export declare function createAssistantToolCallMessage(id: string, toolName: string, content: string): AssistantToolCallMessage;
export declare function createToolResultMessage(id: string, toolName: string, result: string): ToolResultMessage;
export declare function createMediaMessage(source: string | Buffer, explicitMimeType?: string): Promise<MediaMessage>;
export declare function executeTools(toolCalls: ToolCall[], toolLibrary: ToolDefinition[]): Promise<ToolExecutionResult[]>;