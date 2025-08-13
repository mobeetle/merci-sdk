// merci.2.11.0.d.ts
// TypeScript Declaration File for the Merci SDK v2.11.0

// Imports from Node.js built-in modules, which the SDK uses.
import { EventEmitter } from 'node:events';
import { Buffer } from 'node:buffer';

// --- TYPE DEFINITIONS ---

/** Represents a single tool that the AI model can decide to call. */
export interface ToolDefinition {
    /** The unique name of the tool. */
    name: string;
    /** A clear description of what the tool does, used by the model to decide when to call it. */
    description: string;
    /** A JSON Schema object describing the parameters the tool accepts. */
    parameters: object;
    /** The function to execute when the tool is called. It receives the arguments parsed from the model's request. */
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
    data: string; // Base64 encoded string of the media data
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

// --- STREAM EVENT TYPES ---

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

/** A union of all possible events yielded by the response stream. */
export type StreamEvent = TextStreamEvent | ToolCallsStreamEvent | QuotaStreamEvent;


// --- CLASSES ---

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
    /**
     * Equips the chat session with a set of tools the model can use.
     * @param tools An array of tool definitions.
     */
    withTools(tools: ToolDefinition[]): this;

    /**
     * Configures the session with a system message to guide the AI's behavior.
     * @param content The system prompt content.
     */
    withSystemMessage(content: string): this;

    /**
     * Configures advanced model parameters for the request using a fluent builder.
     * @param builderFn A function that receives a ParameterBuilder instance.
     */
    withParameters(builderFn: (builder: ParameterBuilder) => ParameterBuilder): this;

    /**
     * Executes the chat request and returns the response as a stream of events.
     * @param initialInput The user's prompt as a string or a full array of messages for multi-turn context.
     */
    stream(initialInput: string | ChatMessage[]): AsyncIterable<StreamEvent>;

    /**
     * Runs a full agentic loop, automatically handling tool calls and responses.
     * @param initialInput The user's initial prompt.
     * @returns A promise that resolves with the model's final text answer.
     */
    run(initialInput: string | ChatMessage[]): Promise<string>;
}

/**
 * The main client for interacting with the JetBrains AI Platform.
 */
export declare class MerciClient extends EventEmitter {
    constructor(options: { token: string });

    /**
     * Creates a new chat session for a specific model profile.
     * @param profile The identifier for the model to use (e.g., 'google-chat-gemini-flash-2.5').
     */
    chat(profile: string): ChatSession;

    // --- Typed Event Emitter Methods ---

    on(event: 'api_request', listener: (payload: { url: string; method?: string; body?: string }) => void): this;
    on(event: 'api_response', listener: (payload: { url: string; status: number; ok: boolean }) => void): this;

    /**
     * Listens for the start of a token refresh attempt, triggered by a 401 API response.
     */
    on(event: 'token_refresh_start', listener: () => void): this;

    /**
     * Listens for the successful completion of a token refresh.
     * @param event
     * @param listener A callback function that receives the new token string.
     */
    on(event: 'token_refresh_success', listener: (newToken: string) => void): this;

    on(event: 'error', listener: (error: APIError) => void): this;
    on(event: 'tool_start', listener: (payload: { calls: ToolCall[] }) => void): this;
    on(event: 'tool_finish', listener: (payload: { results: ToolExecutionResult[] }) => void): this;
    on(event: 'parameter_warning', listener: (warning: { parameter: string; profile: string; message: string }) => void): this;
}

/**
 * Custom error class for API-related issues.
 */
export declare class APIError extends Error {
    constructor(message: string, status?: number, details?: any);
    public readonly status?: number;
    public readonly details?: any;
}


// --- EXPORTED HELPER FUNCTIONS ---

export declare function createUserMessage(content: string): UserMessage;
export declare function createSystemMessage(content: string): SystemMessage;
export declare function createAssistantTextMessage(content: string): AssistantTextMessage;
export declare function createAssistantToolCallMessage(id: string, toolName: string, content: string): AssistantToolCallMessage;
export declare function createToolResultMessage(id: string, toolName: string, result: string): ToolResultMessage;

/**
 * Creates a media message from a file path or a Buffer.
 * @param source A file path (string) or a Buffer containing the media data.
 * @param explicitMimeType The MIME type of the media (e.g., 'image/png'). Required if source is a Buffer.
 */
export declare function createMediaMessage(source: string | Buffer, explicitMimeType?: string): Promise<MediaMessage>;

/**
 * A helper function to execute a batch of tool calls requested by the model.
 * @param toolCalls The array of tool calls from a 'tool_calls' stream event.
 * @param toolLibrary The library of available tool definitions to execute from.
 */
export declare function executeTools(toolCalls: ToolCall[], toolLibrary: ToolDefinition[]): Promise<ToolExecutionResult[]>;