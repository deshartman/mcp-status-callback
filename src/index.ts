/**
 * MCP Status Callback Handler
 *
 * A utility for handling API callbacks via Ngrok tunnels
 */

export { CallbackHandler, CallbackHandlerEventNames } from './CallbackHandler.js';
export type {
    CallbackHandlerOptions,
    LogEventData,
    CallbackEventData,
    TunnelStatusEventData,
    CallbackHandlerEvents,
} from './CallbackHandler.js';

// For backward compatibility
export { CallbackHandler as default } from './CallbackHandler.js';
