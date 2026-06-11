import { afterEach, describe, expect, it, vi } from "vitest";
import { INITIAL_INPUT } from "../logic/constants";
import { legacyInputToPlan } from "../logic/plan";

type MockOpenRequest = {
    result: IDBDatabase;
    error: DOMException | null;
    onerror: (() => void) | null;
    onblocked: (() => void) | null;
    onsuccess: (() => void) | null;
    onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null;
};

function createIndexedDbMock(
    oldVersion: number,
    hasExistingStore: boolean,
    records: unknown[] = []
) {
    const createIndex = vi.fn();
    const fakeStore = {
        createIndex,
    } as unknown as IDBObjectStore;

    const getAllRequest = {
        result: records,
        error: null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
    };
    const readStore = {
        getAll: vi.fn(() => {
            queueMicrotask(() => getAllRequest.onsuccess?.());
            return getAllRequest;
        }),
    };
    const fakeDb = {
        close: vi.fn(),
        onversionchange: null,
        objectStoreNames: {
            contains: vi.fn().mockReturnValue(hasExistingStore),
        },
        deleteObjectStore: vi.fn(),
        createObjectStore: vi.fn().mockReturnValue(fakeStore),
        transaction: vi.fn().mockReturnValue({
            objectStore: vi.fn().mockReturnValue(readStore),
        }),
    } as unknown as IDBDatabase;

    const request: MockOpenRequest = {
        result: fakeDb,
        error: null,
        onerror: null,
        onblocked: null,
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
        request,
        readStore,
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
        expect(notice?.message).toContain("플랜 저장소 업그레이드");
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

    it("continues initialization when localStorage reset notice writes fail", async () => {
        vi.resetModules();
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("localStorage disabled");
        });
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const { indexedDBMock } = createIndexedDbMock(3, true);
        vi.stubGlobal("indexedDB", indexedDBMock);

        const { scenarioStorage } = await import("./storage");
        await expect(scenarioStorage.init()).resolves.toBeUndefined();
    });

    it("rejects initialization when an IndexedDB upgrade is blocked", async () => {
        vi.resetModules();
        const request: MockOpenRequest = {
            result: {} as IDBDatabase,
            error: null,
            onerror: null,
            onblocked: null,
            onsuccess: null,
            onupgradeneeded: null,
        };
        vi.stubGlobal("indexedDB", {
            open: vi.fn(() => {
                queueMicrotask(() => request.onblocked?.());
                return request as unknown as IDBOpenDBRequest;
            }),
        });

        const { scenarioStorage } = await import("./storage");
        await expect(scenarioStorage.init()).rejects.toThrow("blocked");
    });

    it("closes the database connection on versionchange", async () => {
        vi.resetModules();
        const { indexedDBMock, fakeDb } = createIndexedDbMock(0, false);
        vi.stubGlobal("indexedDB", indexedDBMock);

        const { scenarioStorage } = await import("./storage");
        await scenarioStorage.init();
        fakeDb.onversionchange?.({} as IDBVersionChangeEvent);

        expect(fakeDb.close).toHaveBeenCalled();
    });

    it("skips corrupt scenario records without hiding valid records", async () => {
        vi.resetModules();
        const validPlan = legacyInputToPlan(structuredClone(INITIAL_INPUT));
        const records = [
            {
                id: 1,
                name: "valid",
                createdAt: 1,
                updatedAt: 2,
                schemaVersion: 3,
                plan: validPlan,
            },
            {
                id: 2,
                name: "corrupt",
                createdAt: 1,
                updatedAt: 3,
                schemaVersion: 3,
                plan: { planVersion: "v3", accounts: "bad" },
            },
        ];
        const { indexedDBMock } = createIndexedDbMock(0, false, records);
        vi.stubGlobal("indexedDB", indexedDBMock);

        const { scenarioStorage } = await import("./storage");
        const scenarios = await scenarioStorage.getAllScenarios();

        expect(scenarios.map((scenario) => scenario.name)).toEqual(["valid"]);
        expect(scenarioStorage.getLastCorruptRecordCount()).toBe(1);
    });
});
