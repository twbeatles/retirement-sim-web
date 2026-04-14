import type { SimulationInput } from "../logic/types";
import { legacyInputToPlanV2, planV2ToLegacyInput, type SimulationPlanV2 } from "../logic/planV2";

interface StoredScenarioData {
    name: string;
    createdAt: number;
    updatedAt: number;
    schemaVersion: 2;
    plan: SimulationPlanV2;
}

export interface SavedScenario extends StoredScenarioData {
    id: number;
    input: SimulationInput;
}

const DB_NAME = "RetirementSimDB";
const STORE_NAME = "scenarios";
const DB_VERSION = 3;

function hydrateScenario(record: StoredScenarioData & { id: number }): SavedScenario {
    return {
        ...record,
        input: planV2ToLegacyInput(record.plan)
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
                if (db.objectStoreNames.contains(STORE_NAME)) {
                    db.deleteObjectStore(STORE_NAME);
                }
                const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                store.createIndex("updatedAt", "updatedAt", { unique: false });
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
                plan: legacyInputToPlanV2(input),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                schemaVersion: 2
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
                    plan: legacyInputToPlanV2(input),
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
                    .filter((scenario) => scenario.schemaVersion === 2 && scenario.plan?.planVersion === "v2")
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
}

export const scenarioStorage = new ScenarioStorage();
