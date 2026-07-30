type Listener<Value> = (value: Value) => void;

export class EventEmitter<EventMap extends object> {
    readonly #listeners = new Map<keyof EventMap, Set<Listener<never>>>();

    on<Name extends keyof EventMap>(name: Name, listener: Listener<EventMap[Name]>): () => void {
        const listeners = this.#listeners.get(name) ?? new Set<Listener<never>>();
        listeners.add(listener as Listener<never>);
        this.#listeners.set(name, listeners);

        return () => this.off(name, listener);
    }

    off<Name extends keyof EventMap>(name: Name, listener: Listener<EventMap[Name]>): void {
        const listeners = this.#listeners.get(name);
        listeners?.delete(listener as Listener<never>);

        if (listeners?.size === 0) {
            this.#listeners.delete(name);
        }
    }

    emit<Name extends keyof EventMap>(name: Name, value: EventMap[Name]): void {
        const listeners = this.#listeners.get(name);

        if (!listeners) {
            return;
        }

        for (const listener of [...listeners]) {
            listener(value as never);
        }
    }

    clear(): void {
        this.#listeners.clear();
    }
}
