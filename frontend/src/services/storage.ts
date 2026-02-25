import { SimulationInput } from "../logic/types";
import { migrateSimulationInput } from "../logic/migration";

export interface ScenarioData {
    name: string;
    createdAt: number;
    updatedAt: number;
    input: SimulationInput;
}

export interface SavedScenario extends ScenarioData {
    id: number;
}

const DB_NAME = "RetirementSimDB";
const STORE_NAME = "scenarios";
const DB_VERSION = 1;

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
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                    store.createIndex("updatedAt", "updatedAt", { unique: false });
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
            const data: ScenarioData = {
                name,
                input,
                createdAt: Date.now(),
                updatedAt: Date.now()
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
            // First get existing
            const getReq = store.get(id);
            getReq.onsuccess = () => {
                const existing = getReq.result as SavedScenario;
                if (!existing) {
                    reject(new Error("Scenario not found"));
                    return;
                }

                const updated: SavedScenario = {
                    ...existing,
                    name,
                    input,
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
                const results = request.result as SavedScenario[];
                // Sort by updatedAt desc
                results.sort((a, b) => b.updatedAt - a.updatedAt);

                // Migration: Merge with defaults to handle missing fields from older versions
                const migratedResults = results.map((scenario) => ({
                    ...scenario,
                    input: migrateSimulationInput(scenario.input)
                }));

                resolve(migratedResults);
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
