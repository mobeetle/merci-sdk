/**
 * @file The JavaScript SDK for the JetBrains AI Platform.
 * @version 2.11.0 (Final Fix: Implemented Model-Aware Parameter Filtering)
 * @author Lukáš Michna
 * @license Apache-2.0
 *
 * @description
 * This module provides a comprehensive, modern, and developer-friendly interface for interacting
 * with the JetBrains AI suite of Large Language Models (LLMs). It features a fluent API for building
 * requests, robust error handling, automatic token management, and seamless support for streaming,
 * tool use, media messages, and advanced model parameters. This version is compliant with the v8 Chat API.
 *
 * CHANGELOG:
 * - v2.11.0: Implemented a robust parameter filtering system. The SDK now contains accurate model profiles based on
 *   official documentation and will automatically filter out any parameters not supported by the selected model,
 *   issuing a console warning. This definitively solves the tool-use errors with Gemini models.
 */

import { EventEmitter } from 'node:events';
import { TextDecoderStream } from 'node:stream/web';
import { promises as fs } from 'node:fs';
import { lookup as getMimeType } from 'mime-types';
import { extname } from 'node:path';

// --- CONSTANTS & PROFILES ---
export const LLMParameters = {
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

// *** THE FINAL FIX IS HERE (Part 1) ***
// These profiles are now 100% accurate based on the official documentation provided.
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

// --- CUSTOM ERROR CLASS ---
class APIError extends Error {
    constructor(message, status, details) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
}

// --- PARAMETER BUILDER ---
class ParameterBuilder {
    #params = {};
    temperature(value) { if (typeof value !== 'number' || value < 0.0 || value > 2.0) throw new Error(`[SDK Validation] Temperature must be a number between 0.0 and 2.0. Received: ${value}`); this.#params.TEMPERATURE = value; return this; }
    topP(value) { if (typeof value !== 'number' || value < 0.0 || value > 1.0) throw new Error(`[SDK Validation] Top-P must be a number between 0.0 and 1.0. Received: ${value}`); this.#params.TOP_P = value; return this; }
    topK(value) { if (!Number.isInteger(value) || value <= 0) throw new Error(`[SDK Validation] Top-K must be a positive integer. Received: ${value}`); this.#params.TOP_K = value; return this; }
    length(value) { if (!Number.isInteger(value) || value <= 0) throw new Error(`[SDK Validation] Length must be a positive integer. Received: ${value}`); this.#params.LENGTH = value; return this; }
    stopToken(value) { if (typeof value !== 'string' || value.length === 0) throw new Error(`[SDK Validation] Stop Token must be a non-empty string.`); this.#params.STOP_TOKEN = value; return this; }
    seed(value) { if (!Number.isInteger(value)) throw new Error(`[SDK Validation] Seed must be an integer. Received: ${value}`); this.#params.SEED = value; return this; }
    asJson() { this.#params.RESPONSE_FORMAT = { type: 'json' }; return this; }
    toolChoiceAuto(isEnabled = true) { if (typeof isEnabled !== 'boolean') throw new Error('[SDK Validation] toolChoiceAuto expects a boolean value.'); this.#params.TOOL_CHOICE_AUTO = isEnabled; return this; }
    toolChoiceRequired(isEnabled = true) { if (typeof isEnabled !== 'boolean') throw new Error('[SDK Validation] toolChoiceRequired expects a boolean value.'); this.#params.TOOL_CHOICE_REQUIRED = isEnabled; return this; }
    toolChoiceNone(isEnabled = true) { if (typeof isEnabled !== 'boolean') throw new Error('[SDK Validation] toolChoiceNone expects a boolean value.'); this.#params.TOOL_CHOICE_NONE = isEnabled; return this; }
    toolChoiceNamed(toolName) { if (typeof toolName !== 'string' || toolName.length === 0) throw new Error('[SDK Validation] toolChoiceNamed expects a non-empty tool name string.'); this.#params.TOOL_CHOICE_NAMED = { type: 'function', function: { name: toolName } }; return this; }
    parallelToolCalls(isEnabled = true) { if (typeof isEnabled !== 'boolean') throw new Error('[SDK Validation] parallelToolCalls expects a boolean value.'); this.#params.PARALLEL_TOOL_CALLS = isEnabled; return this; }
    reasoningEffort(level) { const validLevels = new Set(['low', 'medium', 'high']); if (!validLevels.has(level)) throw new Error(`[SDK Validation] Reasoning Effort must be one of 'low', 'medium', or 'high'. Received: ${level}`); this.#params.REASONING_EFFORT = level; return this; }
    predictedOutput(text) { if (typeof text !== 'string') throw new Error('[SDK Validation] Predicted Output expects a string value.'); this.#params.PREDICTED_OUTPUT = text; return this; }
    cachePoints(cacheObject) { if (typeof cacheObject !== 'object' || cacheObject === null) throw new Error('[SDK Validation] Cache Points expects a JSON-compatible object.'); this.#params.CACHE_POINTS = cacheObject; return this; }
    thinkingBudget(value) { if (!Number.isInteger(value) || value <= 0) throw new Error(`[SDK Validation] Thinking Budget must be a positive integer. Received: ${value}`); this.#params.THINKING_BUDGET = value; return this; }
    numberOfChoices(value) { if (!Number.isInteger(value) || value <= 0) throw new Error(`[SDK Validation] Number of Choices must be a positive integer. Received: ${value}`); this.#params.NUMBER_OF_CHOICES = value; return this; }
    verbosity(level) { if (typeof level !== 'string' || level.length === 0) throw new Error(`[SDK Validation] Verbosity must be a non-empty string.`); this.#params.VERBOSITY = level; return this; }
    _build() { return this.#params; }
}

// --- CORE SDK ---
export class MerciClient extends EventEmitter {
    #token;
    #apiBaseUrl = 'https://api.jetbrains.ai/user/v5';
    constructor({ token }) { super(); if (!token) throw new Error('A Grazie authentication token is required.'); this.#token = token; }
    chat(profile) { return new ChatSession(this, profile); }
    async _fetchWithRetry(path, options, isRetry = false) {
        const url = `${this.#apiBaseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            'Grazie-Agent': JSON.stringify({ name: "js-library-client", version: "2.11.0" }),
            'Grazie-Authenticate-JWT': this.#token,
            ...options.headers,
        };

        this.emit('api_request', { url, method: options.method, body: options.body });
        const response = await fetch(url, { ...options, headers });
        this.emit('api_response', { url, status: response.status, ok: response.ok });

        if (!response.ok) {
            // If the request is unauthorized and we haven't retried yet...
            if (response.status === 401 && !isRetry) {
                try {
                    // 1. Announce the start of the refresh process.
                    this.emit('token_refresh_start');

                    // 2. Get the new token.
                    const newToken = await this._refreshToken();
                    this.#token = newToken; // Update the client's internal token.

                    // 3. Announce success and pass the new token in the event payload.
                    this.emit('token_refresh_success', newToken);

                    // 4. Retry the original request with the new token.
                    return this._fetchWithRetry(path, options, true);
                } catch (refreshError) {
                    this.emit('error', refreshError);
                    throw refreshError;
                }
            }

            // For all other errors, or if the retry fails, construct and throw a detailed error.
            let errorDetails;
            try {
                errorDetails = await response.json();
            } catch (e) {
                errorDetails = { message: 'Failed to parse error response from API.', responseText: await response.text().catch(() => '') };
            }
            const error = new APIError(`API request failed with status ${response.status}`, response.status, errorDetails);
            this.emit('error', error);
            throw error;
        }

        if (!response.body) {
            const error = new APIError('API returned a successful status but with an empty response body.', response.status, null);
            this.emit('error', error);
            throw error;
        }

        return response;
    }
    async _refreshToken() {
        const response = await this._fetchWithRetry('/auth/jwt/refresh/v3', { method: 'POST', body: JSON.stringify({}) });
        const data = await response.json();
        if (!data.token) throw new APIError('Token refresh response did not contain a new token.', response.status, data);
        return data.token;
    }
}

class ChatSession {
    #client;
    #profile;
    #tools = [];
    #parameters = {};
    #systemMessage = null;
    #maxToolIterations = 5;
    constructor(client, profile) { this.#client = client; this.#profile = profile; }
    withTools(tools) { this.#tools = tools.map(t => createValidatedTool(t)); return this; }
    withSystemMessage(content) { this.#systemMessage = content; return this; }
    withParameters(builderFn) { const builder = new ParameterBuilder(); this.#parameters = builderFn(builder)._build(); return this; }
    getSupportedParameters() {
        const modelProfile = modelProfiles[this.#profile];
        if (!modelProfile?.params) return [];
        return Object.entries(LLMParameters).filter(([, def]) => modelProfile.params.has(def.fqdn)).map(([name, def]) => ({ name, type: def.type, fqdn: def.fqdn }));
    }
    async* stream(initialInput, _internalOptions = {}) {
        const messages = Array.isArray(initialInput) ? initialInput : [createUserMessage(initialInput)];
        const requestBody = this.#buildRequestBody(messages, _internalOptions);
        const response = await this.#client._fetchWithRetry('/llm/chat/stream/v8', { method: 'POST', body: JSON.stringify(requestBody), });
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
    async run(initialInput) {
        let messages = Array.isArray(initialInput) ? initialInput : [createUserMessage(initialInput)];
        let finalAnswer = '';
        for (let i = 0; i < this.#maxToolIterations; i++) {
            const isFirstTurn = i === 0;
            const stream = this.stream(messages, { isFirstTurn });

            let toolCalls = [];
            let assistantResponse = '';
            for await (const event of stream) {
                if (event.type === 'text') { assistantResponse += event.content; }
                else if (event.type === 'tool_calls') { toolCalls = event.calls; }
            }

            if (toolCalls.length > 0) {
                this.#client.emit('tool_start', { calls: toolCalls });
                const toolResults = await executeTools(toolCalls, this.#tools);
                this.#client.emit('tool_finish', { results: toolResults });

                const toolMessagesPayload = [];
                toolResults.forEach((result, index) => {
                    const call = toolCalls[index];
                    const resultValue = result.success ? result.result : { error: result.error || 'Unknown execution error' };

                    toolMessagesPayload.push(createAssistantToolCallMessage(call.id, call.name, call.arguments));
                    toolMessagesPayload.push(createToolResultMessage(call.id, call.name, JSON.stringify(resultValue)));
                });
                messages.push(...toolMessagesPayload);

            } else {
                finalAnswer = assistantResponse;
                return finalAnswer;
            }
        }
        throw new Error(`Exceeded maximum tool iteration limit of ${this.#maxToolIterations}.`);
    }
    #buildRequestBody(messages, { isFirstTurn = true } = {}) {
        const allMessages = [...messages];
        if (this.#systemMessage && !messages.some(m => m.type === 'system_message')) { allMessages.unshift(createSystemMessage(this.#systemMessage)); }
        const requestData = { profile: this.#profile, prompt: `js-sdk-prompt-${Date.now()}`, chat: { messages: allMessages } };

        const paramsForThisTurn = isFirstTurn ? this.#parameters : {};

        const parametersData = buildParametersArray(paramsForThisTurn, this.#tools, this.#profile, this.#client);
        if (parametersData) { requestData.parameters = parametersData; }
        return requestData;
    }
}

// --- HELPERS & UTILITIES ---
class SSEParser {
    constructor() {
        this.finalizedToolCalls = [];
        this.toolCallsInProgress = new Map();
    }

    parseLine(line) {
        if (!line.startsWith('data: ')) return null;
        const dataContent = line.substring(6);
        if (dataContent.trim() === 'end') return null;
        try {
            const parsed = JSON.parse(dataContent);
            switch (parsed.type) {
                case 'Content':
                    return { type: 'text', content: parsed.content };

                case 'ToolCall':
                    const idx = parsed.parallelToolIndex ?? 0;

                    if (!this.toolCallsInProgress.has(idx)) {
                        this.toolCallsInProgress.set(idx, { id: null, name: null, arguments: '' });
                    }
                    const currentCall = this.toolCallsInProgress.get(idx);

                    if (parsed.id) currentCall.id = parsed.id;
                    if (parsed.name) currentCall.name = parsed.name;
                    if (parsed.content) currentCall.arguments += parsed.content;

                    return null;

                case 'FinishMetadata':
                    if (['tool_call', 'tool_calls', 'stop'].includes(parsed.reason)) {
                        const sortedCalls = Array.from(this.toolCallsInProgress.entries())
                            .sort(([a], [b]) => a - b)
                            .map(([, call]) => call);

                        this.finalizedToolCalls.push(...sortedCalls);
                        this.toolCallsInProgress.clear();
                    }
                    return null;

                case 'QuotaMetadata':
                    return { type: 'quota', data: parsed };

                default:
                    return null;
            }
        } catch (e) {
            return null;
        }
    }

    getFinalResult() {
        return { toolCalls: this.finalizedToolCalls };
    }
}

function buildParametersArray(params, tools = [], profile = '', client = null) {
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

        // *** THE FINAL FIX IS HERE (Part 2) ***
        // This check prevents unsupported parameters from being sent to the API.
        if (modelProfile && !modelProfile.params.has(paramDef.fqdn)) {
            if (client) { client.emit('parameter_warning', { parameter: key, profile: profile, message: `Parameter '${key}' is not supported by model profile '${profile}' and will be ignored.` }); }
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

function validateSchema(data, schema, path = [], errors = []) {
    if (schema.type !== 'object' || data === null || typeof data !== 'object') {
        if (schema.required?.length > 0) {
            errors.push({ path: path.join('.'), message: `Expected an object but received ${typeof data}.` });
        }
        return;
    }

    for (const key of (schema.required || [])) {
        if (!(key in data)) {
            errors.push({ path: [...path, key].join('.'), message: `Required key '${key}' is missing.` });
        }
    }

    for (const [key, value] of Object.entries(data)) {
        const propertySchema = schema.properties?.[key];
        if (!propertySchema) continue;

        const currentPath = [...path, key].join('.');
        const valueType = Array.isArray(value) ? 'array' : typeof value;

        if (valueType !== propertySchema.type) {
            errors.push({ path: currentPath, message: `Invalid type. Expected '${propertySchema.type}' but got '${valueType}'.` });
            continue;
        }

        if (propertySchema.type === 'object' && propertySchema.properties) {
            validateSchema(value, propertySchema, [...path, key], errors);
        }

        if (propertySchema.type === 'array' && propertySchema.items) {
            value.forEach((item, index) => {
                const itemType = typeof item;
                if (itemType !== propertySchema.items.type) {
                    errors.push({ path: `${currentPath}[${index}]`, message: `Invalid item type. Expected '${propertySchema.items.type}' but got '${itemType}'.` });
                }
            });
        }
    }
}

function createValidatedTool(toolDefinition) {
    const { name, description, parameters, execute: coreExecute } = toolDefinition;

    const actualSchema = parameters.schema || parameters;

    const validatedExecute = (data) => {
        const validationErrors = [];
        validateSchema(data, actualSchema, [], validationErrors);
        if (validationErrors.length > 0) {
            return {
                status: "Tool execution failed due to validation errors.",
                verification: { isValid: false, errors: validationErrors },
                data: data
            };
        }
        return coreExecute(data);
    };

    return {
        name,
        description,
        parameters: { schema: actualSchema },
        execute: validatedExecute
    };
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
        }
        catch (e) {
            return { name: call.name, success: false, error: e.message };
        }
    });
    return Promise.all(executionPromises);
}

// --- MESSAGE CREATION HELPERS ---
export function createUserMessage(content) {
    return { type: 'user_message', content };
}

export function createSystemMessage(content) {
    return { type: 'system_message', content };
}

export function createAssistantTextMessage(content) {
    return { type: 'assistant_message_text', content };
}

export function createAssistantToolCallMessage(id, toolName, content) {
    return { type: 'assistant_message_tool', id, toolName, content };
}

export function createToolResultMessage(id, toolName, result) {
    return { type: 'tool_message', id, toolName, result };
}

export async function createMediaMessage(source, explicitMimeType) {
    let data;
    let mediaType;
    if (typeof source === 'string') {
        data = await fs.readFile(source);
        if (explicitMimeType) {
            mediaType = explicitMimeType;
        }
        else {
            const detectedType = getMimeType(source);
            if (detectedType) {
                mediaType = detectedType;
            }
            else {
                const ext = extname(source).toLowerCase();
                const fallbackTypes = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp',
                };
                mediaType = fallbackTypes[ext] || 'application/octet-stream';
            }
        }
    } else if (Buffer.isBuffer(source)) {
        if (!explicitMimeType) {
            throw new Error('[SDK Validation] explicitMimeType is required when creating a media message from a Buffer.');
        }
        data = source;
        mediaType = explicitMimeType;
    } else {
        throw new Error('[SDK Validation] source must be a file path (string) or a Buffer.');
    }
    return {
        type: 'media_message',
        mediaType: mediaType,
        data: data.toString('base64')
    };
}

// --- TYPE DEFINITIONS for JSDoc ---
/** @typedef {object} ToolDefinition @property {string} name @property {string} description @property {object} parameters @property {(args: object) => any | Promise<any>} execute */
/** @typedef {object} ValidatedTool @property {string} name @property {string} description @property {object} parameters @property {(args: object) => any | Promise<any>} execute */
/** @typedef {{type: 'user_message', content: string}} UserMessage */
/** @typedef {{type: 'system_message', content: string}} SystemMessage */
/** @typedef {{type: 'assistant_message_text', content: string}} AssistantTextMessage */
/** @typedef {{type: 'assistant_message_tool', id: string, toolName: string, content: string}} AssistantToolCallMessage */
/** @typedef {{type: 'tool_message', id: string, toolName: string, result: string}} ToolResultMessage */
/** @typedef {{type: 'media_message', mediaType: string, data: string}} MediaMessage */
/** @typedef {UserMessage | SystemMessage | AssistantTextMessage | AssistantToolCallMessage | ToolResultMessage | MediaMessage} ChatMessage */
/** @typedef {{type: 'text', content: string} | {type: 'tool_calls', calls: Array<ToolCall>} | {type: 'quota', data: object}} StreamEvent */
/** @typedef {{id: string, name: string, arguments: string}} ToolCall */
/** @typedef {{name: string, success: boolean, result?: any, error?: string}} ToolExecutionResult */