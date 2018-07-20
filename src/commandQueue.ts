
export interface Command {
    readonly ID: string;
    run(): void | Promise<void>;
    errorHandler?(e: Error): void;
}

export class CommandQueue {
    private syncCommandPromise: Promise<void> = Promise.resolve();
    private queue: Command[] = [];
    private failFast: boolean;

    constructor(failFast: boolean = false) {
        this.failFast = failFast;
    }

    /**
     * Push a command into the command queue, which will be executed
     * after all commands dispatched before are finished.
     */
    public dispatch(command: Command) {
        this.queue.push(command);
        this.runNext();
    }

    /**
     * Remove all commands matching the given command ID.
     */
    public remove(commandID: string) {
        this.queue = this.queue.filter(command => command.ID !== commandID);
    }

    /**
     * Return a boolean that tells whether this command queue
     * is initialized with fail fast enabled.
     */
    public failFastEnabled(): boolean {
        return this.failFast;
    }

    /**
     * Remove all commands from the command queue waiting to be executed.
     * This will not stop any commands that have been popped out of the queue
     * from being executed.
     */
    public clear() {
        this.queue = [];
    }

    /**
     * Return a promise which is resolved when all commands
     * dispatched before calling wait() are finished.
     */
    public async finish() {
        await this.syncCommandPromise;
    }

    private runNext() {
        let errorHandler: undefined | ((e: Error) => void);
        this.syncCommandPromise = this.syncCommandPromise.then(() => {
            const command: Command | void = this.queue.shift();
            if (!command) {
                return;
            }

            errorHandler = command.errorHandler;
            return command.run();
        }).catch((e: Error) => {
            if (errorHandler) {
                errorHandler(e);
            } else {
                console.error(e);
            }

            if (this.failFast) {
                this.clear();
            }
        });
    }
}
