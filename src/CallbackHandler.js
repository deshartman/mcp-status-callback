"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CallbackHandler = void 0;
var express_1 = __importDefault(require("express"));
var events_1 = require("events");
var ngrok_1 = __importDefault(require("ngrok"));
/**
 * CallbackHandler class
 *
 * This utility establishes an Ngrok tunnel to a local Express server for API callbacks.
 * If you fire off an API request with a status callback URL, this utility can handle
 * the response to a localhost via an Ngrok tunnel and emit the result to a local listener.
 */
var CallbackHandler = /** @class */ (function (_super) {
    __extends(CallbackHandler, _super);
    /**
     * Creates a new CallbackHandler instance
     *
     * @param options Configuration options
     */
    function CallbackHandler(options) {
        var _this = _super.call(this) || this;
        _this.ngrokUrl = null;
        _this.ngrokAuthToken = options.ngrokAuthToken;
        _this.customDomain = options.customDomain;
        _this.app = (0, express_1.default)();
        // Configure Express
        _this.app.use(express_1.default.json());
        _this.app.use(express_1.default.urlencoded({ extended: true }));
        // Add health check route
        _this.app.get('/', function (_, res) {
            res.send('POST status callbacks to /callback');
        });
        // This is the main status callback endpoint. It will pass the request body to whoever is listening
        _this.app.post('/callback', function (req, res) {
            // Extract query parameters using req.query
            var queryParameters = req.query; // Use the object directly as parsed by Express
            // Process the body based on content type
            var body = req.body;
            // Check if the request is URL-encoded (Twilio's default format)
            var contentType = req.get('Content-Type') || '';
            if (contentType.includes('application/x-www-form-urlencoded')) {
                _this.emit('log', { level: 'info', message: "application/x-www-form-urlencoded received, so converting to JSON" });
                // Body is already parsed by express.urlencoded middleware
                // But we want to ensure it's treated as a proper JSON object
                body = __assign({}, body);
            }
            // If it's already JSON, express.json middleware has parsed it and we can use it as is
            // Emit an event with the query parameters object and the processed body
            _this.emit('callback', { level: 'info', queryParameters: queryParameters, body: body });
            // Send a success response
            res.status(200).send('Callback received');
        });
        return _this;
    }
    /**
     * Sets up an ngrok tunnel to expose the local server publicly
     *
     * @param port Port number to tunnel to
     * @returns Promise that resolves to the callback URL
         */
    CallbackHandler.prototype.setupNgrokTunnel = function (port) {
        return __awaiter(this, void 0, void 0, function () {
            var ngrokOptions, _a, callbackUrl, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 3, , 4]);
                        // Configure ngrok with auth token
                        return [4 /*yield*/, ngrok_1.default.authtoken(this.ngrokAuthToken)];
                    case 1:
                        // Configure ngrok with auth token
                        _b.sent();
                        ngrokOptions = {
                            addr: port,
                            authtoken: this.ngrokAuthToken
                        };
                        // Add custom domain if provided
                        if (this.customDomain) {
                            ngrokOptions.hostname = this.customDomain;
                            this.emit('log', { level: 'info', message: "Using custom domain: ".concat(this.customDomain) });
                        }
                        // Start ngrok tunnel with the configured options
                        _a = this;
                        return [4 /*yield*/, ngrok_1.default.connect(ngrokOptions)];
                    case 2:
                        // Start ngrok tunnel with the configured options
                        _a.ngrokUrl = _b.sent();
                        callbackUrl = "".concat(this.ngrokUrl, "/callback");
                        this.emit('tunnelStatus', { level: 'info', message: callbackUrl });
                        // Return the callback URL
                        return [2 /*return*/, callbackUrl];
                    case 3:
                        error_1 = _b.sent();
                        // Emit the error event instead of using console.error
                        this.emit('log', { level: 'error', message: "Failed to establish ngrok tunnel: ".concat(error_1) });
                        // If there was a failure in setting up the tunnel, emit the event with the error
                        this.emit('tunnelStatus', { level: 'error', message: error_1 instanceof Error ? error_1 : String(error_1) });
                        throw error_1; // Re-throw the error so the caller can handle it
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Starts the callback server.
     * Automatically finds an available port if the specified port is in use.
     *
     * @returns Promise that resolves to the callback URL
     */
    CallbackHandler.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        var startServer = function (portToTry) {
                            if (portToTry === void 0) { portToTry = 4000; }
                            var serverAttempt = _this.app.listen(portToTry);
                            serverAttempt.on('error', function (error) {
                                if (error.code === 'EADDRINUSE') {
                                    _this.emit('log', { level: 'warn', message: "Port ".concat(portToTry, " in use, trying port ").concat(portToTry + 1) });
                                    serverAttempt.close();
                                    startServer(portToTry + 1);
                                }
                                else {
                                    _this.emit('log', { level: 'error', message: "Start server Error: ".concat(error) });
                                    reject(error);
                                }
                            });
                            serverAttempt.on('listening', function () { return __awaiter(_this, void 0, void 0, function () {
                                var error, callbackUrl, error_2;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            this.server = serverAttempt; // Store the successful server instance
                                            this.emit('log', { level: 'info', message: "Callback server listening on port ".concat(portToTry) });
                                            // Set up ngrok tunnel after server starts successfully
                                            if (!this.ngrokAuthToken) {
                                                error = new Error('Ngrok auth token not provided');
                                                this.emit('log', { level: 'error', message: error });
                                                reject(error);
                                                return [2 /*return*/];
                                            }
                                            _a.label = 1;
                                        case 1:
                                            _a.trys.push([1, 3, , 4]);
                                            return [4 /*yield*/, this.setupNgrokTunnel(portToTry)];
                                        case 2:
                                            callbackUrl = _a.sent();
                                            resolve(callbackUrl);
                                            return [3 /*break*/, 4];
                                        case 3:
                                            error_2 = _a.sent();
                                            reject(error_2);
                                            return [3 /*break*/, 4];
                                        case 4: return [2 /*return*/];
                                    }
                                });
                            }); });
                        };
                        startServer();
                    })];
            });
        });
    };
    /**
     * Returns the public ngrok URL if available
     *
     * @returns The public ngrok URL or null if not available
     */
    CallbackHandler.prototype.getPublicUrl = function () {
        return this.ngrokUrl;
    };
    /**
     * Stops the callback server and closes the ngrok tunnel
     */
    CallbackHandler.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.ngrokUrl) return [3 /*break*/, 2];
                        return [4 /*yield*/, ngrok_1.default.disconnect(this.ngrokUrl)];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.emit('log', { level: 'info', message: 'Ngrok tunnel closed' });
                        // Close server if it exists
                        if (this.server) {
                            this.server.close();
                            this.emit('log', { level: 'info', message: 'Callback server stopped' });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Type-safe event emitter methods
     */
    CallbackHandler.prototype.on = function (event, listener) {
        return _super.prototype.on.call(this, event, listener);
    };
    CallbackHandler.prototype.once = function (event, listener) {
        return _super.prototype.once.call(this, event, listener);
    };
    CallbackHandler.prototype.emit = function (event) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        return _super.prototype.emit.apply(this, __spreadArray([event], args, false));
    };
    return CallbackHandler;
}(events_1.EventEmitter));
exports.CallbackHandler = CallbackHandler;
