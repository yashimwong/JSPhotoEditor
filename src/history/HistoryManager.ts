export class HistoryManager<Value> {
    readonly #clone: (value: Value) => Value;
    readonly #limit: number;
    readonly #past: Value[] = [];
    readonly #future: Value[] = [];

    constructor(limit: number, clone: (value: Value) => Value) {
        if (!Number.isInteger(limit) || limit < 1) {
            throw new RangeError('historyLimit must be a positive integer');
        }

        this.#limit = limit;
        this.#clone = clone;
    }

    get canUndo(): boolean {
        return this.#past.length > 0;
    }

    get canRedo(): boolean {
        return this.#future.length > 0;
    }

    record(value: Value): void {
        this.#past.push(this.#clone(value));

        if (this.#past.length > this.#limit) {
            this.#past.shift();
        }

        this.#future.length = 0;
    }

    undo(current: Value): Value | undefined {
        const previous = this.#past.pop();

        if (!previous) {
            return undefined;
        }

        this.#future.push(this.#clone(current));
        return this.#clone(previous);
    }

    redo(current: Value): Value | undefined {
        const next = this.#future.pop();

        if (!next) {
            return undefined;
        }

        this.#past.push(this.#clone(current));
        return this.#clone(next);
    }

    clear(): void {
        this.#past.length = 0;
        this.#future.length = 0;
    }
}
