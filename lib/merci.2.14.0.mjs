/**
 * @file The JavaScript SDK for the JetBrains AI Platform (Single-File Module).
 * @version 2.14.0 (Feature - Agentic Workflow Enhancements)
 * @author Lukáš Michna (Mobeetle)
 * @license Apache-2.0
 *
 * @description
 * This single .mjs file contains the complete, build-free SDK for interacting with the
 * JetBrains AI suite of Large Language Models (LLMs). It can be used directly in modern
 * Node.js environments.
 *
 * CHANGELOG:
 * - v2.14.0: Introduced a "glass-box" agentic workflow with a new `ChatSession.step()` async generator for fine-grained control over the tool-use loop. Refactored `run()` to use this new primitive and made `maxIterations` configurable.
 * - v2.13.0: Added the Task API for executing predefined, server-side tasks.
 * - v2.12.2: Patched a bug in the InternalHttpClient where the token refresh URL was being constructed incorrectly, causing a 404 error.
 * - v2.12.1: Major architectural refactor.
 * - v2.11.0: Implemented a robust parameter filtering system.
 */

// --- NODE.JS BUILT-IN IMPORTS ---
import { EventEmitter } from 'node:events';
import { TextDecoderStream } from 'node:stream/web';
import { promises as fs } from 'node:fs';
import { extname } from 'node:path';
import { Buffer } from 'node:buffer';


// ==================================================================================
// SECTION 1: CONSTANTS & PROFILES
// ==================================================================================

const AuthType = {
    USER: 'user',
    SERVICE: 'service',
    APPLICATION: 'application',
};

const GatewayEndpoint = {
    PRODUCTION: 'https://api.jetbrains.ai',
};

const LLMParameters = {
    TEMPERATURE: { fqdn: 'llm.parameters.temperature', type: 'double' },
    TOP_P: { fqdn: 'llm.parameters.top-p', type: 'double' },
    TOP_K: { fqdn: 'llm.parameters.top-k', type: 'int' },
    LENGTH: { fqdn: 'llm.parameters.length', type: 'int' },
    STOP_TOKEN: { fqdn: 'llm.parameters.stop-token', type: 'text' },
    SEED: { fqdn: 'llm.parameters.seed', type: 'int' },
    RESPONSE_FORMAT: { fqdn: 'llm.parameters.response-format', type: 'json' },
    TOOLS: { fqdn: 'llm.parameters.tools', type: 'json' },
    TOOL_CHOICE_AUTO: { fqdn: 'llm.parameters.tool-choice-auto', type: 'bool' },
    TOOL_CHOICE_REQUIRED: { fqdn: 'llm.parameters.tool-choice-required', type: 'bool' },
    TOOL_CHOICE_NONE: { fqdn: 'llm.parameters.tool-choice-none', type: 'bool' },
    TOOL_CHOICE_NAMED: { fqdn: 'llm.parameters.tool-choice-named', type: 'json' },
    PARALLEL_TOOL_CALLS: { fqdn: 'llm.parameters.parallel-tool-calls', type: 'bool' },
    REASONING_EFFORT: { fqdn: 'llm.parameters.reasoning-effort', type: 'text' },
    PREDICTED_OUTPUT: { fqdn: 'llm.parameters.predicted-output', type: 'json' },
    CACHE_POINTS: { fqdn: 'llm.parameters.cache-points', type: 'json' },
    THINKING_BUDGET: { fqdn: 'llm.parameters.thinking-budget', type: 'int' },
    NUMBER_OF_CHOICES: { fqdn: 'llm.parameters.number-of-choices', type: 'int' },
    VERBOSITY: { fqdn: 'llm.parameters.verbosity', type: 'text' }
};

const paramGroups = {
    COMMON_TOOLS: ['TOOLS', 'TOOL_CHOICE_NAMED', 'TOOL_CHOICE_AUTO', 'TOOL_CHOICE_REQUIRED', 'TOOL_CHOICE_NONE'].map(k => LLMParameters[k].fqdn),
    OPENAI_GPT3_4: ['TEMPERATURE', 'TOP_P', 'SEED', 'LENGTH', 'NUMBER_OF_CHOICES', 'PARALLEL_TOOL_CALLS'].map(k => LLMParameters[k].fqdn),
    OPENAI_O_SERIES: ['LENGTH', 'SEED', 'RESPONSE_FORMAT', 'REASONING_EFFORT', 'NUMBER_OF_CHOICES'].map(k => LLMParameters[k].fqdn),
    OPENAI_GPT4_1: ['TOP_P', 'LENGTH', 'SEED', 'TEMPERATURE', 'RESPONSE_FORMAT', 'NUMBER_OF_CHOICES', 'PREDICTED_OUTPUT', 'PARALLEL_TOOL_CALLS'].map(k => LLMParameters[k].fqdn),
    OPENAI_GPT5: ['LENGTH', 'RESPONSE_FORMAT', 'PARALLEL_TOOL_CALLS', 'REASONING_EFFORT', 'VERBOSITY'].map(k => LLMParameters[k].fqdn),
    ANTHROPIC_CLAUDE3: ['TEMPERATURE', 'TOP_K', 'TOP_P', 'STOP_TOKEN', 'LENGTH', 'TOOLS'].map(k => LLMParameters[k].fqdn),
    ANTHROPIC_CLAUDE_PLUS: ['TEMPERATURE', 'TOP_P', 'STOP_TOKEN', 'LENGTH', 'CACHE_POINTS', 'PARALLEL_TOOL_CALLS'].map(k => LLMParameters[k].fqdn),
    GOOGLE_GEMINI_1_5_PRO: ['TEMPERATURE', 'TOP_P', 'TOP_K', 'RESPONSE_FORMAT', 'LENGTH'].map(k => LLMParameters[k].fqdn),
    GOOGLE_GEMINI_1_5_FLASH: ['TEMPERATURE', 'TOP_P', 'TOP_K', 'LENGTH'].map(k => LLMParameters[k].fqdn),
    GOOGLE_GEMINI_2_5_PRO: ['TEMPERATURE', 'TOP_P', 'TOP_K', 'RESPONSE_FORMAT', 'LENGTH', 'THINKING_BUDGET', 'TOOLS'].map(k => LLMParameters[k].fqdn),
    GOOGLE_GEMINI_2_5_FLASH: ['RESPONSE_FORMAT', 'TEMPERATURE', 'LENGTH', 'TOP_P', 'THINKING_BUDGET'].map(k => LLMParameters[k].fqdn),
};

const modelProfiles = {
    'openai-chat-gpt': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT3_4, ...paramGroups.COMMON_TOOLS]) },
    'openai-gpt-4': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT3_4, ...paramGroups.COMMON_TOOLS]) },
    'openai-gpt-4-turbo': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT3_4, ...paramGroups.COMMON_TOOLS, LLMParameters.RESPONSE_FORMAT.fqdn]) },
    'openai-gpt-4o': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT3_4, ...paramGroups.COMMON_TOOLS, LLMParameters.RESPONSE_FORMAT.fqdn, LLMParameters.PREDICTED_OUTPUT.fqdn]) },
    'openai-gpt-4o-mini': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT3_4, ...paramGroups.COMMON_TOOLS, LLMParameters.RESPONSE_FORMAT.fqdn, LLMParameters.PREDICTED_OUTPUT.fqdn]) },
    'openai-o1': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_O_SERIES, ...paramGroups.COMMON_TOOLS]) },
    'openai-o1-mini': { provider: 'OpenAI', params: new Set(['LENGTH', 'SEED', 'NUMBER_OF_CHOICES'].map(k => LLMParameters[k].fqdn)) },
    'openai-o3': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_O_SERIES, ...paramGroups.COMMON_TOOLS]) },
    'openai-o3-mini': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_O_SERIES, ...paramGroups.COMMON_TOOLS]) },
    'openai-o4-mini': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_O_SERIES, ...paramGroups.COMMON_TOOLS]) },
    'openai-gpt4.1': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT4_1, ...paramGroups.COMMON_TOOLS]) },
    'openai-gpt4.1-mini': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT4_1, ...paramGroups.COMMON_TOOLS]) },
    'openai-gpt4.1-nano': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT4_1, ...paramGroups.COMMON_TOOLS]) },
    'openai-gpt-5': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT5, ...paramGroups.COMMON_TOOLS]) },
    'openai-gpt-5-mini': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT5, ...paramGroups.COMMON_TOOLS]) },
    'openai-gpt-5-nano': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT5, ...paramGroups.COMMON_TOOLS]) },
    'Grazie_model_1': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT5, ...paramGroups.COMMON_TOOLS]) },
    'Grazie_model_2': { provider: 'OpenAI', params: new Set([...paramGroups.OPENAI_GPT5, ...paramGroups.COMMON_TOOLS]) },
    'openai-instruct-gpt': { provider: 'OpenAI', params: new Set([LLMParameters.TEMPERATURE.fqdn]) },
    'openai-embedding-ada': { provider: 'OpenAI', params: new Set() },
    'openai-embedding-small': { provider: 'OpenAI', params: new Set() },
    'openai-embedding-large': { provider: 'OpenAI', params: new Set() },
    'anthropic-claude-3-haiku': { provider: 'Anthropic', params: new Set(paramGroups.ANTHROPIC_CLAUDE3) },
    'anthropic-claude-3-opus': { provider: 'Anthropic', params: new Set(paramGroups.ANTHROPIC_CLAUDE3) },
    'anthropic-claude-3.5-haiku': { provider: 'Anthropic', params: new Set([...paramGroups.ANTHROPIC_CLAUDE_PLUS, ...paramGroups.COMMON_TOOLS]) },
    'anthropic-claude-3.5-sonnet': { provider: 'Anthropic', params: new Set(['TEMPERATURE', 'TOP_P', 'STOP_TOKEN', 'LENGTH', 'PARALLEL_TOOL_CALLS'].map(k => LLMParameters[k].fqdn).concat(paramGroups.COMMON_TOOLS)) },
    'anthropic-claude-3.7-sonnet': { provider: 'Anthropic', params: new Set([...paramGroups.ANTHROPIC_CLAUDE_PLUS, ...paramGroups.COMMON_TOOLS]) },
    'anthropic-claude-4-sonnet': { provider: 'Anthropic', params: new Set([...paramGroups.ANTHROPIC_CLAUDE_PLUS, ...paramGroups.COMMON_TOOLS]) },
    'anthropic-claude-4-opus': { provider: 'Anthropic', params: new Set([...paramGroups.ANTHROPIC_CLAUDE_PLUS, ...paramGroups.COMMON_TOOLS]) },
    'anthropic-claude-4.1-opus': { provider: 'Anthropic', params: new Set([...paramGroups.ANTHROPIC_CLAUDE_PLUS, ...paramGroups.COMMON_TOOLS]) },
    'google-chat-gemini-pro-1.5': { provider: 'Google', params: new Set([...paramGroups.GOOGLE_GEMINI_1_5_PRO, ...paramGroups.COMMON_TOOLS]) },
    'google-chat-gemini-flash-1.5': { provider: 'Google', params: new Set([...paramGroups.GOOGLE_GEMINI_1_5_FLASH, ...paramGroups.COMMON_TOOLS]) },
    'google-chat-gemini-flash-2.0': { provider: 'Google', params: new Set([...paramGroups.GOOGLE_GEMINI_1_5_PRO, ...paramGroups.COMMON_TOOLS]) },
    'google-chat-gemini-flash-lite-2.0': { provider: 'Google', params: new Set([...paramGroups.GOOGLE_GEMINI_1_5_PRO, ...paramGroups.COMMON_TOOLS]) },
    'google-chat-gemini-pro-2.5': { provider: 'Google', params: new Set(paramGroups.GOOGLE_GEMINI_2_5_PRO) },
    'google-chat-gemini-flash-2.5': { provider: 'Google', params: new Set([...paramGroups.GOOGLE_GEMINI_2_5_FLASH, ...paramGroups.COMMON_TOOLS]) },
    'google-chat-gemini-flash-lite-2.5': { provider: 'Google', params: new Set([...paramGroups.GOOGLE_GEMINI_2_5_FLASH, ...paramGroups.COMMON_TOOLS]) },
};


// ==================================================================================
// SECTION 2: CUSTOM ERROR CLASSES
// ==================================================================================

export class APIError extends Error {
    constructor(message, status, details) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
}
export class APIStatusError extends APIError {
    constructor(message, status, details) {
        super(message, status, details);
        this.name = 'APIStatusError';
    }
}
export class SSEError extends APIError {
    constructor(message) {
        super(message, undefined, undefined);
        this.name = 'SSEError';
    }
}


// ==================================================================================
// SECTION 3: HELPER FUNCTIONS & UTILITIES
// ==================================================================================

export function createUserMessage(content) { return { type: 'user_message', content }; }
export function createSystemMessage(content) { return { type: 'system_message', content }; }
export function createAssistantTextMessage(content) { return { type: 'assistant_message_text', content }; }
export function createAssistantToolCallMessage(id, toolName, content) { return { type: 'assistant_message_tool', id, toolName, content }; }
export function createToolResultMessage(id, toolName, result) { return { type: 'tool_message', id, toolName, result }; }

export async function createMediaMessage(source, explicitMimeType) {
    let data;
    let mediaType;
    if (typeof source === 'string') {
        data = await fs.readFile(source);
        if (explicitMimeType) {
            mediaType = explicitMimeType;
        } else {
            const ext = extname(source).toLowerCase();
            const fallbackTypes = {
                '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
            };
            mediaType = fallbackTypes[ext] || 'application/octet-stream';
        }
    } else if (Buffer.isBuffer(source)) {
        if (!explicitMimeType) throw new Error('explicitMimeType is required when creating a media message from a Buffer.');
        data = source;
        mediaType = explicitMimeType;
    } else {
        throw new Error('source must be a file path (string) or a Buffer.');
    }
    return { type: 'media_message', mediaType: mediaType, data: data.toString('base64') };
}

export async function executeTools(toolCalls, toolLibrary) {
    const toolMap = new Map(toolLibrary.map(t => [t.name, t]));
    const executionPromises = toolCalls.map(async (call) => {
        const tool = toolMap.get(call.name);
        if (!tool?.execute) {
            return { name: call.name, success: false, error: `Tool '${call.name}' not found.` };
        }
        try {
            const args = JSON.parse(call.arguments || '{}');
            const result = await tool.execute(args);
            return { name: call.name, success: true, result };
        } catch (e) {
            return { name: call.name, success: false, error: e.message };
        }
    });
    return Promise.all(executionPromises);
}


// ==================================================================================
// SECTION 4: INTERNAL SDK CLASSES
// ==================================================================================

class SSEParser {
    constructor() { this.finalizedToolCalls = []; this.toolCallsInProgress = new Map(); }
    parseLine(line) {
        if (!line.startsWith('data: ')) return null;
        const dataContent = line.substring(6);
        if (dataContent.trim() === 'end') return null;
        try {
            const parsed = JSON.parse(dataContent);
            switch (parsed.type) {
                case 'Content': return { type: 'text', content: parsed.content };
                case 'ToolCall':
                    const idx = parsed.parallelToolIndex ?? 0;
                    if (!this.toolCallsInProgress.has(idx)) this.toolCallsInProgress.set(idx, { id: null, name: null, arguments: '' });
                    const currentCall = this.toolCallsInProgress.get(idx);
                    if (parsed.id) currentCall.id = parsed.id;
                    if (parsed.name) currentCall.name = parsed.name;
                    if (parsed.content) currentCall.arguments += parsed.content;
                    return null;
                case 'FinishMetadata':
                    if (['tool_call', 'tool_calls', 'stop'].includes(parsed.reason)) {
                        const sortedCalls = Array.from(this.toolCallsInProgress.entries()).sort(([a], [b]) => a - b).map(([, call]) => call);
                        this.finalizedToolCalls.push(...sortedCalls);
                        this.toolCallsInProgress.clear();
                    }
                    return null;
                case 'QuotaMetadata': return { type: 'quota', data: parsed };
                default: return null;
            }
        } catch (e) { throw new SSEError(`Failed to parse SSE data chunk: ${e.message}`); }
    }
    getFinalResult() { return { toolCalls: this.finalizedToolCalls }; }
}

class TaskSSEParser {
    parseLine(line) {
        if (!line.startsWith('data: ')) return null;
        const dataContent = line.substring(6);
        if (dataContent.trim() === 'end') return null;
        try {
            const parsed = JSON.parse(dataContent);
            const type = parsed.type;
            if (!type) return null;

            // This structure mirrors the Python client's conversion logic
            switch (type) {
                case 'Content':
                    return { type, content: parsed.content };
                case 'QuotaMetadata':
                case 'ExecutionMetadata':
                case 'FinishMetadata':
                case 'UnknownMetadata':
                case 'FunctionCallMetadata':
                    return { type, data: parsed };
                default:
                    // In the future, we might want to emit a warning for unknown types.
                    return null;
            }
        } catch (e) {
            throw new SSEError(`Failed to parse Task SSE data chunk: ${e.message}`);
        }
    }
}

class InternalHttpClient {
    #token; #apiBaseUrl; #eventEmitter;
    constructor(options = {}, eventEmitter) {
        this.#eventEmitter = eventEmitter;
        const token = options.token ?? process.env.GRAZIE_JWT_TOKEN ?? process.env.GRAZIE_USER_JWT_TOKEN;
        if (!token) throw new Error('An authentication token is required. Provide it via the `token` option or the GRAZIE_JWT_TOKEN environment variable.');
        this.#token = token;
        const authType = options.authType ?? AuthType.USER;
        const endpoint = options.endpoint ?? GatewayEndpoint.PRODUCTION;
        this.#apiBaseUrl = `${endpoint}/${authType}/v5`;
    }
    getEventEmitter() { return this.#eventEmitter; }
    async _fetchWithRetry(path, options, isRetry = false) {
        const url = `${this.#apiBaseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            'Grazie-Agent': JSON.stringify({ name: "js-library-client", version: "2.14.0" }),
            'Grazie-Authenticate-JWT': this.#token,
            ...options.headers,
        };
        this.#eventEmitter.emit('api_request', { url, method: options.method, body: options.body });
        const response = await fetch(url, { ...options, headers });
        this.#eventEmitter.emit('api_response', { url, status: response.status, ok: response.ok });
        if (!response.ok) {
            if (response.status === 401 && !isRetry) {
                try {
                    this.#eventEmitter.emit('token_refresh_start');
                    const newToken = await this._refreshToken();
                    this.#token = newToken;
                    this.#eventEmitter.emit('token_refresh_success', newToken);
                    return this._fetchWithRetry(path, options, true);
                } catch (refreshError) {
                    this.#eventEmitter.emit('error', refreshError);
                    throw refreshError;
                }
            }
            let errorDetails;
            try { errorDetails = await response.json(); }
            catch (e) { errorDetails = { message: 'Failed to parse error response from API.', responseText: await response.text().catch(() => '') }; }
            const error = new APIStatusError(`API request failed with status ${response.status}`, response.status, errorDetails);
            this.#eventEmitter.emit('error', error);
            throw error;
        }
        if (!response.body) {
            const error = new APIError('API returned a successful status but with an empty response body.', response.status, null);
            this.#eventEmitter.emit('error', error);
            throw error;
        }
        return response;
    }
    async _refreshToken() {
        // *** THIS IS THE CORRECTED LOGIC ***
        // The refresh endpoint is relative to the base API URL.
        const refreshUrl = `${this.#apiBaseUrl}/auth/jwt/refresh/v3`;
        const headers = {
            'Content-Type': 'application/json',
            'Grazie-Authenticate-JWT': this.#token,
        };
        // Use a direct fetch call here to avoid a potential infinite retry loop.
        const response = await fetch(refreshUrl, { method: 'POST', body: JSON.stringify({}), headers });
        if (!response.ok) {
            throw new APIStatusError('Token refresh failed', response.status, await response.json().catch(() => ({})));
        }
        const data = await response.json();
        if (!data.token) throw new APIError('Token refresh response did not contain a new token.', response.status, data);
        return data.token;
    }
}


// ==================================================================================
// SECTION 5: PUBLIC API CLASSES
// ==================================================================================

export class ParameterBuilder {
    #params = {};
    temperature(value) { this.#params.TEMPERATURE = value; return this; }
    topP(value) { this.#params.TOP_P = value; return this; }
    topK(value) { this.#params.TOP_K = value; return this; }
    length(value) { this.#params.LENGTH = value; return this; }
    stopToken(value) { this.#params.STOP_TOKEN = value; return this; }
    seed(value) { this.#params.SEED = value; return this; }
    asJson() { this.#params.RESPONSE_FORMAT = { type: 'json' }; return this; }
    toolChoiceAuto(isEnabled = true) { this.#params.TOOL_CHOICE_AUTO = isEnabled; return this; }
    toolChoiceRequired(isEnabled = true) { this.#params.TOOL_CHOICE_REQUIRED = isEnabled; return this; }
    toolChoiceNone(isEnabled = true) { this.#params.TOOL_CHOICE_NONE = isEnabled; return this; }
    toolChoiceNamed(toolName) { this.#params.TOOL_CHOICE_NAMED = { type: 'function', function: { name: toolName } }; return this; }
    parallelToolCalls(isEnabled = true) { this.#params.PARALLEL_TOOL_CALLS = isEnabled; return this; }
    reasoningEffort(level) { this.#params.REASONING_EFFORT = level; return this; }
    predictedOutput(text) { this.#params.PREDICTED_OUTPUT = text; return this; }
    cachePoints(cacheObject) { this.#params.CACHE_POINTS = cacheObject; return this; }
    thinkingBudget(value) { this.#params.THINKING_BUDGET = value; return this; }
    numberOfChoices(value) { this.#params.NUMBER_OF_CHOICES = value; return this; }
    verbosity(level) { this.#params.VERBOSITY = level; return this; }
    _build() { return this.#params; }
}

export class ChatSession {
    #httpClient; #profile; #tools = []; #parameters = {}; #systemMessage = null;
    constructor(httpClient, profile) { this.#httpClient = httpClient; this.#profile = profile; }
    withTools(tools) { this.#tools = tools; return this; }
    withSystemMessage(content) { this.#systemMessage = content; return this; }
    withParameters(builderFn) { const builder = new ParameterBuilder(); this.#parameters = builderFn(builder)._build(); return this; }
    async* stream(initialInput) {
        const messages = Array.isArray(initialInput) ? initialInput : [createUserMessage(initialInput)];
        const requestBody = this.#buildRequestBody(messages);
        const response = await this.#httpClient._fetchWithRetry('/llm/chat/stream/v8', { method: 'POST', body: JSON.stringify(requestBody) });
        const parser = new SSEParser();
        const stream = response.body.pipeThrough(new TextDecoderStream());
        let buffer = '';
        for await (const chunk of stream) {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) { if (line.trim()) { const event = parser.parseLine(line); if (event) yield event; } }
        }
        if (buffer.trim()) { const event = parser.parseLine(buffer); if (event) yield event; }
        const finalResult = parser.getFinalResult();
        if (finalResult.toolCalls.length > 0) { yield { type: 'tool_calls', calls: finalResult.toolCalls }; }
    }

    /**
     * Executes a single turn of the agentic loop.
     * This async generator is the core of the "glass-box" agent. It yields control
     * back to the caller whenever the model requests to use tools, allowing for
     * inspection, confirmation, or modification before proceeding.
     *
     * @param {ChatMessage[]} messages - The current conversation history.
     * @param {{ forceTextResponse?: boolean }} [options={}] - Options for this step. If true, forces the model to generate a text response without calling tools.
     * @returns {AsyncGenerator<AgentToolRequest, AgentTextResponse, ToolExecutionResult[]>} An async generator that yields tool requests and returns a final text response.
     */
    async* step(messages, options = {}) {
        const eventEmitter = this.#httpClient.getEventEmitter();
        let sessionForStream = this;

        // If forced, create a temporary session configuration that prevents tool use.
        if (options.forceTextResponse) {
            sessionForStream = new ChatSession(this.#httpClient, this.#profile)
                .withTools(this.#tools)
                .withSystemMessage(this.#systemMessage)
                .withParameters(builder => {
                    // Apply original parameters, then override tool choice.
                    const originalParams = this.#parameters;
                    for (const [key, value] of Object.entries(originalParams)) {
                        const methodName = key.toLowerCase().replace(/_(\w)/g, (_, p1) => p1.toUpperCase());
                        if (typeof builder[methodName] === 'function') {
                            builder[methodName](value);
                        }
                    }
                    return builder.toolChoiceNone(true);
                });
        }

        const stream = sessionForStream.stream(messages);
        let toolCalls = [];
        let assistantResponse = '';
        let finalMessages = [...messages];

        for await (const event of stream) {
            if (event.type === 'text') {
                assistantResponse += event.content;
            } else if (event.type === 'tool_calls') {
                toolCalls = event.calls;
            }
        }

        if (toolCalls.length > 0) {
            eventEmitter.emit('tool_start', { calls: toolCalls });

            // Yield control to the user, passing the tool calls.
            // The user is now responsible for executing them and passing the results
            // back via the generator's .next(results) method.
            const toolExecutionResults = yield { type: 'tool_request', calls: toolCalls };

            eventEmitter.emit('tool_finish', { results: toolExecutionResults });

            // Append the model's tool request and the user-provided results to history.
            toolExecutionResults.forEach((result, index) => {
                const call = toolCalls[index];
                const resultValue = result.success ? result.result : { error: result.error || 'Unknown execution error' };
                finalMessages.push(createAssistantToolCallMessage(call.id, call.name, call.arguments));
                finalMessages.push(createToolResultMessage(call.id, call.name, JSON.stringify(resultValue)));
            });
        } else {
            // If there are no tool calls, the conversation is over.
            // Append the final assistant message to the history.
            finalMessages.push(createAssistantTextMessage(assistantResponse));
        }

        // Return the final state.
        return { type: 'text_response', content: assistantResponse, messages: finalMessages };
    }

    /**
     * Runs the agentic loop automatically until a final text response is generated.
     * This is the "black-box" method, providing maximum convenience. It is now a
     * wrapper around the more powerful `step()` generator.
     *
     * @param {string | ChatMessage[]} initialInput - The initial user prompt or message history.
     * @param {{ maxIterations?: number }} [options={}] - Configuration for the run.
     * @returns {Promise<string>} The final text response from the model.
     */
    async run(initialInput, options = {}) {
        const { maxIterations = 5 } = options;
        let messages = Array.isArray(initialInput) ? [...initialInput] : [createUserMessage(initialInput)];
        const eventEmitter = this.#httpClient.getEventEmitter();

        for (let i = 0; i < maxIterations; i++) {
            const isLastIteration = (i === maxIterations - 1);
            if (isLastIteration) {
                eventEmitter.emit('tool_warning', { message: `Maximum tool iteration limit (${maxIterations}) reached. Forcing model to generate final text response.` });
            }

            const stepIterator = this.step(messages, { forceTextResponse: isLastIteration });
            let currentStep = await stepIterator.next();

            if (currentStep.done) {
                // The model provided a text response on the first try.
                return currentStep.value.content;
            }

            // The model yielded a tool request.
            const { calls } = currentStep.value;
            const toolResults = await executeTools(calls, this.#tools);

            // Resume the generator, passing the tool results back in.
            currentStep = await stepIterator.next(toolResults);

            // After providing results, the generator will run to completion for this turn.
            // We update our message history from its final return value.
            messages = currentStep.value.messages;

            // If the final content is not empty, the model has finished its tool use.
            if (currentStep.value.content) {
                return currentStep.value.content;
            }
        }

        return "The model reached the maximum tool iteration limit and could not provide a final text response.";
    }

    #buildRequestBody(messages) {
        const allMessages = [...messages];
        if (this.#systemMessage && !messages.some(m => m.type === 'system_message')) allMessages.unshift(createSystemMessage(this.#systemMessage));
        const requestData = { profile: this.#profile, prompt: `js-sdk-prompt-${Date.now()}`, chat: { messages: allMessages } };
        const parametersData = buildParametersArray(this.#parameters, this.#tools, this.#profile, this.#httpClient.getEventEmitter());
        if (parametersData) requestData.parameters = parametersData;
        return requestData;
    }
}

export class ChatAPI {
    #httpClient;
    constructor(httpClient) { this.#httpClient = httpClient; }
    session(profile) {
        if (!profile || typeof profile !== 'string') throw new Error('A valid model profile string is required to start a chat session.');
        return new ChatSession(this.#httpClient, profile);
    }
}

export class TaskAPI {
    #httpClient;
    constructor(httpClient) { this.#httpClient = httpClient; }

    /**
     * Retrieves the list of available task IDs.
     * @returns {Promise<{ids: string[]}>} A promise that resolves to the task roster.
     */
    async roster() {
        const response = await this.#httpClient._fetchWithRetry('/task/roster', { method: 'GET' });
        return response.json();
    }

    /**
     * Executes a task in a streaming fashion.
     * @param {string} id - The ID of the task to execute, e.g., "code-generate:default".
     * @param {object} parameters - The parameters for the task.
     * @returns {AsyncGenerator<TaskStreamEvent>} An async iterator for the task stream events.
     */
    async* stream(id, parameters) {
        const { taskId, tag } = this.#splitId(id);
        const headers = {};
        if (tag) {
            headers['Grazie-Task-Tag'] = tag;
        }

        const requestBody = { parameters };
        const response = await this.#httpClient._fetchWithRetry(`/task/stream/v4/${taskId}`, {
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: headers
        });

        const parser = new TaskSSEParser();
        const stream = response.body.pipeThrough(new TextDecoderStream());
        let buffer = '';
        for await (const chunk of stream) {
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                if (line.trim()) {
                    const event = parser.parseLine(line);
                    if (event) yield event;
                }
            }
        }
        if (buffer.trim()) {
            const event = parser.parseLine(buffer);
            if (event) yield event;
        }
    }

    /**
     * Executes a task and waits for the complete result.
     * @param {string} id - The ID of the task to execute.
     * @param {object} parameters - The parameters for the task.
     * @returns {Promise<TaskResult>} A promise that resolves to the aggregated result of the task.
     */
    async execute(id, parameters) {
        const stream = this.stream(id, parameters);
        let content = '';
        const executionMetadata = [];
        let quotaMetadata = null;
        let finishMetadata = null;
        let unknownMetadata = null;
        let functionCallMetadata = null;

        for await (const event of stream) {
            switch (event.type) {
                case 'Content':
                    content += event.content;
                    break;
                case 'QuotaMetadata':
                    quotaMetadata = event.data;
                    break;
                case 'ExecutionMetadata':
                    executionMetadata.push(event.data);
                    break;
                case 'FinishMetadata':
                    finishMetadata = event.data;
                    break;
                case 'UnknownMetadata':
                    unknownMetadata = event.data;
                    break;
                case 'FunctionCallMetadata':
                    functionCallMetadata = event.data;
                    break;
            }
        }

        return {
            content,
            quotaMetadata,
            executionMetadata,
            finishMetadata,
            unknownMetadata,
            functionCallMetadata,
        };
    }

    #splitId(id) {
        const parts = id.split(':', 2);
        return { taskId: parts[0], tag: parts[1] || null };
    }
}

function buildParametersArray(params, tools = [], profile = '', eventEmitter = null) {
    const data = [];
    const modelProfile = modelProfiles[profile];
    if (tools.length > 0) {
        if (!modelProfile || modelProfile.params.has(LLMParameters.TOOLS.fqdn)) {
            data.push({ type: LLMParameters.TOOLS.type, fqdn: LLMParameters.TOOLS.fqdn });
            const serializableTools = tools.map(({ execute, ...rest }) => rest);
            data.push({ type: "json", value: JSON.stringify(serializableTools) });
        }
    }
    for (const [key, value] of Object.entries(params)) {
        const paramDef = LLMParameters[key];
        if (!paramDef) continue;
        if (modelProfile && !modelProfile.params.has(paramDef.fqdn)) {
            if (eventEmitter) eventEmitter.emit('parameter_warning', { parameter: key, profile: profile, message: `Parameter '${key}' is not supported by model profile '${profile}' and will be ignored.` });
            continue;
        }
        data.push({ type: paramDef.type, fqdn: paramDef.fqdn });
        const valueObj = { type: paramDef.type };
        switch (paramDef.type) {
            case 'double': case 'int': valueObj.value = Number(value); break;
            case 'bool': valueObj.value = Boolean(value); break;
            case 'json': valueObj.value = JSON.stringify(value); break;
            case 'text': default: valueObj.value = String(value); break;
        }
        data.push(valueObj);
    }
    return data.length > 0 ? { data } : null;
}


// ==================================================================================
// SECTION 6: MAIN CLIENT FACADE
// ==================================================================================

export class MerciClient extends EventEmitter {
    chat;
    tasks;
    constructor(options = {}) {
        super();
        const internalClient = new InternalHttpClient(options, this);
        this.chat = new ChatAPI(internalClient);
        this.tasks = new TaskAPI(internalClient);
    }
}


// ==================================================================================
// SECTION 7: JSDOC TYPE DEFINITIONS
// ==================================================================================

/** @typedef {{ name: string; description: string; parameters: object; execute: (args: any) => any | Promise<any>; }} ToolDefinition */
/** @typedef {{ type: 'user_message'; content: string; }} UserMessage */
/** @typedef {{ type: 'system_message'; content: string; }} SystemMessage */
/** @typedef {{ type: 'assistant_message_text'; content: string; }} AssistantTextMessage */
/** @typedef {{ type: 'assistant_message_tool'; id: string; toolName: string; content: string; }} AssistantToolCallMessage */
/** @typedef {{ type: 'tool_message'; id: string; toolName: string; result: string; }} ToolResultMessage */
/** @typedef {{ type: 'media_message'; mediaType: string; data: string; }} MediaMessage */
/** @typedef {UserMessage | SystemMessage | AssistantTextMessage | AssistantToolCallMessage | ToolResultMessage | MediaMessage} ChatMessage */
/** @typedef {{id: string, name: string, arguments: string}} ToolCall */
/** @typedef {{name: string, success: boolean, result?: any, error?: string}} ToolExecutionResult */
/** @typedef {{type: 'text', content: string} | {type: 'tool_calls', calls: Array<ToolCall>} | {type: 'quota', data: object}} StreamEvent */
/** @typedef {{type: 'Content', content: string} | {type: 'QuotaMetadata', data: object} | {type: 'ExecutionMetadata', data: object} | {type: 'FinishMetadata', data: object} | {type: 'UnknownMetadata', data: object} | {type: 'FunctionCallMetadata', data: object}} TaskStreamEvent */
/** @typedef {{content: string, quotaMetadata: object, executionMetadata: object[], finishMetadata: object, unknownMetadata: object, functionCallMetadata: object}} TaskResult */
/** @typedef {{ type: 'tool_request', calls: ToolCall[] }} AgentToolRequest */
/** @typedef {{ type: 'text_response', content: string, messages: ChatMessage[] }} AgentTextResponse */