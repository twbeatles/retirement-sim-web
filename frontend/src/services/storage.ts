import type { SimulationInput } from "../logic/types";
import { legacyInputToPlan, planToLegacyInput, type SimulationPlanV3 } from "../logic/plan";

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

    window.localStorage.setItem(RESET_NOTICE_KEY, JSON.stringify(notice));
}

function readResetNotice(): StorageResetNotice | null {
    if (typeof window === "undefined") {
        return null;
    }

    const raw = window.localStorage.getItem(RESET_NOTICE_KEY);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw) as StorageResetNotice;
    } catch {
        window.localStorage.removeItem(RESET_NOTICE_KEY);
        return null;
    }
}

function clearResetNotice(): void {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.removeItem(RESET_NOTICE_KEY);
}

function hydrateScenario(record: StoredScenarioData & { id: number }): SavedScenario {
    return {
        ...record,
        input: planToLegacyInput(record.plan)
    };
}

class ScenarioStorage {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
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
                            "Local IndexedDB scenarios were reset for the SimulationPlanV3 storage upgrade. Re-import a JSON backup if you need to restore older scenarios."
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
                const records = (request.result as Array<StoredScenarioData & { id: number }>)
                    .filter((scenario) => scenario.schemaVersion === 3 && scenario.plan?.planVersion === "v3")
                    .sort((a, b) => b.updatedAt - a.updatedAt)
                    .map(hydrateScenario);
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
}

export const scenarioStorage = new ScenarioStorage();
