export type Listener<T extends unknown[]> = (...data: T) => void;
export type Unsubscribe = () => void;
export declare class Topic<T extends unknown[]> {
    listeners: Set<(...data: T) => void>;
    add(handler: Listener<T>): Unsubscribe;
    remove(handler: Listener<T>): void;
    emit(...data: T): void;
    clear(): void;
}
