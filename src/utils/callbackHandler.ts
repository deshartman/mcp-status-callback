import express from 'express';
import { EventEmitter } from 'events';

/**
 * Callback handler for Twilio payment callbacks
 * Extends EventEmitter to emit events that can be consumed by the main application
 */
class CallbackHandler extends EventEmitter {
    private app: express.Application;
    private port: number;
    private server: any;

    constructor(port: number = 4000) {
        super();
        this.port = port;
        this.app = express();

        // Configure Express
        this.app.use(express.json());

        // Add health check route
        this.app.get('/health', (_, res) => {
            res.send('good');
        });
    }

    /**
     * Starts the callback server
     * Automatically finds an available port if the specified port is in use
     */
    start(): void {
        const startServer = (portToTry: number = this.port) => {
            const serverAttempt = this.app.listen(portToTry);

            serverAttempt.on('error', (error: NodeJS.ErrnoException) => {
                if (error.code === 'EADDRINUSE') {
                    this.emit('log', { level: 'warn', message: `Port ${portToTry} in use, trying port ${portToTry + 1}` });
                    serverAttempt.close();
                    startServer(portToTry + 1);
                } else {
                    this.emit('error', error);
                    throw error;
                }
            });

            serverAttempt.on('listening', () => {
                this.port = portToTry; // Update the port to the one that worked
                this.server = serverAttempt; // Store the successful server instance
                this.emit('log', { level: 'info', message: `Callback server listening on port ${this.port}` });
            });
        };

        startServer();
    }


    /**
     * Stops the callback server
     */
    stop(): void {
        if (this.server) {
            this.server.close();
            this.emit('log', { level: 'info', message: 'Callback server stopped' });
        }
    }

}

// Export a singleton instance
export const callbackHandler = new CallbackHandler();
