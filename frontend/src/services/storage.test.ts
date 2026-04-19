import { afterEach, describe, expect, it, vi } from "vitest";

type MockOpenRequest = {
    result: IDBDatabase;
    error: DOMException | null;
    onerror: (() => void) | null;
    onsuccess: (() => void) | null;
    onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null;
};

function createIndexedDbMock(oldVersion: number, hasExistingStore: boolean) {
    const createIndex = vi.fn();
    const fakeStore = {
        createIndex,
    } as unknown as IDBObjectStore;

    const fakeDb = {
        objectStoreNames: {
            contains: vi.fn().mockReturnValue(hasExistingStore),
        },
        deleteObjectStore: vi.fn(),
        createObjectStore: vi.fn().mockReturnValue(fakeStore),
    } as unknown as IDBDatabase;

    const request: MockOpenRequest = {
        result: fakeDb,
        error: null,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
    };

    const indexedDBMock = {
        open: vi.fn(() => {
            queueMicrotask(() => {
                request.onupgradeneeded?.({
                    oldVersion,
                    target: request,
                } as unknown as IDBVersionChangeEvent);
                request.onsuccess?.();
            });
            return request as unknown as IDBOpenDBRequest;
        }),
    };

    return {
        indexedDBMock,
        fakeDb,
        createIndex,
    };
}

afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
});

describe("scenarioStorage", () => {
    it("records a reset notice when an existing IndexedDB store is replaced", async () => {
        vi.resetModules();
        const { indexedDBMock } = createIndexedDbMock(3, true);
        vi.stubGlobal("indexedDB", indexedDBMock);

        const { scenarioStorage } = await import("./storage");
        await scenarioStorage.init();

        const notice = scenarioStorage.consumeResetNotice();
        expect(notice?.previousVersion).toBe(3);
        expect(notice?.currentVersion).toBe(4);
        expect(notice?.message).toContain("SimulationPlanV3");
        expect(scenarioStorage.consumeResetNotice()).toBeNull();
    });

    it("does not record a reset notice for a fresh database", async () => {
        vi.resetModules();
        const { indexedDBMock } = createIndexedDbMock(0, false);
        vi.stubGlobal("indexedDB", indexedDBMock);

        const { scenarioStorage } = await import("./storage");
        await scenarioStorage.init();

        expect(scenarioStorage.consumeResetNotice()).toBeNull();
    });
});
