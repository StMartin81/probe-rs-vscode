export class EventEmitter {
    #listener;

    event = (listener) => {
        this.#listener = listener;
    };

    fire(message) {
        this.#listener?.(message);
    }

    dispose() {
        this.#listener = undefined;
    }
}
