import type { SimulationInput } from "../logic/types";
import { legacyInputToPlan, planToLegacyInput, type SimulationPlanV3 } from "../logic/plan";
import { validateSimulationPlan } from "../logic/validation";

interface StoredScenarioData {
    name: string;
    createdAt: number;
    updatedAt: number;
    schemaVersion: 3;
    plan: SimulationPlanV3;
}

export interface SavedScenario extends StoredScenarioData {
    id: number;
    input: SimulationInput;
}

export interface StorageResetNotice {
    previousVersion: number;
    currentVersion: number;
    resetAt: number;
    message: string;
}

const DB_NAME = "RetirementSimDB";
const STORE_NAME = "scenarios";
const DB_VERSION = 4;
const RESET_NOTICE_KEY = "retirement-sim-storage-reset-notice";

function writeResetNotice(notice: StorageResetNotice): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(RESET_NOTICE_KEY, JSON.stringify(notice));
    } catch (error) {
        console.warn("Failed to write storage reset notice", error);
    }
}

function readResetNotice(): StorageResetNotice | null {
    if (typeof window === "undefined") {
        return null;
    }

    let raw: string | null = null;
    try {
        raw = window.localStorage.getItem(RESET_NOTICE_KEY);
    } catch (error) {
        console.warn("Failed to read storage reset notice", error);
        return null;
    }
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as StorageResetNotice;
    } catch {
        try {
            window.localStorage.removeItem(RESET_NOTICE_KEY);
        } catch (error) {
            console.warn("Failed to clear invalid storage reset notice", error);
        }
        return null;
    }
}

function clearResetNotice(): void {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.removeItem(RESET_NOTICE_KEY);
    } catch (error) {
        console.warn("Failed to clear storage reset notice", error);
    }
}

function hydrateScenario(record: StoredScenarioData & { id: number }): SavedScenario {
    return {
        ...record,
        input: planToLegacyInput(record.plan)
    };
}

function isValidStoredScenario(record: unknown): record is StoredScenarioData & { id: number } {
    if (!record || typeof record !== "object") {
        return false;
    }
    const candidate = record as Partial<StoredScenarioData & { id: number }>;
    if (
        typeof candidate.id !== "number" ||
        typeof candidate.name !== "string" ||
        candidate.schemaVersion !== 3 ||
        candidate.plan?.planVersion !== "v3"
    ) {
        return false;
    }
    const errors = validateSimulationPlan(candidate.plan).filter((warning) => warning.severity === "error");
    return errors.length === 0;
}

class ScenarioStorage {
    private db: IDBDatabase | null = null;
    private lastCorruptRecordCount = 0;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another open tab"));
            request.onsuccess = () => {
                this.db = request.result;
                this.db.onversionchange = () => {
                    this.db?.close();
                    this.db = null;
                };
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                const oldVersion = event.oldVersion;
                const hadExistingStore = db.objectStoreNames.contains(STORE_NAME);

                if (hadExistingStore) {
                    db.deleteObjectStore(STORE_NAME);
                }
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                store.createIndex("updatedAt", "updatedAt", { unique: false });

                if (oldVersion > 0 && hadExistingStore) {
                    writeResetNotice({
                        previousVersion: oldVersion,
                        currentVersion: DB_VERSION,
                        resetAt: Date.now(),
                        message:
                            "플랜 저장소 업그레이드를 위해 로컬 시나리오가 초기화되었습니다. 이전 시나리오가 필요하면 JSON 백업을 다시 가져오세요."
                    });
                }
            };
        });
    }

    private getStore(mode: IDBTransactionMode): IDBObjectStore {
        if (!this.db) throw new Error("Database not initialized");
        const tx = this.db.transaction(STORE_NAME, mode);
        return tx.objectStore(STORE_NAME);
    }

    async saveScenario(name: string, input: SimulationInput): Promise<number> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const store = this.getStore("readwrite");
            const data: StoredScenarioData = {
                name,
                plan: legacyInputToPlan(input),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                schemaVersion: 3
            };
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result as number);
            request.onerror = () => reject(request.error);
        });
    }

    async updateScenario(id: number, name: string, input: SimulationInput): Promise<void> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const store = this.getStore("readwrite");
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const existing = getReq.result as (StoredScenarioData & { id: number }) | undefined;
                if (!existing) {
                    reject(new Error("Scenario not found"));
                    return;
                }

                const updated = {
                    ...existing,
                    name,
                    plan: legacyInputToPlan(input),
                    updatedAt: Date.now()
                };

                const putReq = store.put(updated);
                putReq.onsuccess = () => resolve();
                putReq.onerror = () => reject(putReq.error);
            };
            getReq.onerror = () => reject(getReq.error);
        });
    }

    async getAllScenarios(): Promise<SavedScenario[]> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const store = this.getStore("readonly");
            const request = store.getAll();
            request.onsuccess = () => {
                const rawRecords = request.result as unknown[];
                const records: SavedScenario[] = [];
                let corruptCount = 0;

                for (const record of rawRecords) {
                    if (!isValidStoredScenario(record)) {
                        corruptCount += 1;
                        continue;
                    }
                    try {
                        records.push(hydrateScenario(record));
                    } catch (error) {
                        corruptCount += 1;
                        console.warn("Skipped corrupt scenario record", error);
                    }
                }

                this.lastCorruptRecordCount = corruptCount;
                records.sort((a, b) => b.updatedAt - a.updatedAt);
                resolve(records);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async deleteScenario(id: number): Promise<void> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const store = this.getStore("readwrite");
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    consumeResetNotice(): StorageResetNotice | null {
        const notice = readResetNotice();
        if (!notice) {
            return null;
        }

        clearResetNotice();
        return notice;
    }

    getLastCorruptRecordCount(): number {
        return this.lastCorruptRecordCount;
    }
}

export const scenarioStorage = new ScenarioStorage();
