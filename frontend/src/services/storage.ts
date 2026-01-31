import { SimulationInput } from "../logic/types";

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
                const migratedResults = results.map(scenario => ({
                    ...scenario,
                    input: this.migrateInput(scenario.input)
                }));

                resolve(migratedResults);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Migrate old scenario input by filling in missing fields with defaults
     */
    private migrateInput(input: any): any {
        // Dynamic import would be ideal, but for simplicity we inline essential defaults
        const defaults = {
            guardrails: { baseRate: 0.04, upperThreshold: 0.05, lowerThreshold: 0.03, adjustmentRate: 0.10 },
            bucket: { shortTermYears: 2, midTermYears: 5, shortTermReturn: 0.02, midTermReturn: 0.04, rebalanceFrequency: 'annual' },
            health_insurance: { enabled: false, monthlyPremium: 200000, inflationLinked: true },
            severance: { enabled: false, estimatedAmount: 50000000, payoutType: 'lump_sum', annuityYears: 10 },
            realEstate: [],
            additionalPensions: [],
            businessIncome: [],
            labor_income: { enabled: false, currentNetMonthlyIncome: 3000000, currentSavingsRate: 0.5, events: [] },
            // NEW: Phase 3 Risk Features
            longevity_risk: { useDistribution: false, averageLifeExpectancy: 85, stdDevYears: 5 },
            medical_shocks: { enabled: false, occurrences: [] },
            // NEW: Phase 1 Additional Features
            reverse_annuity: { enabled: false, houseValue: 0, startAge: 70, monthlyPayment: 0 },
            inflation_scenario: { type: 'normal', baseRate: 0.02 },
            tax_credit: { enabled: false, pensionSavingsContribution: 0, irpContribution: 0, creditRate: 0.15 }
        };

        return { ...defaults, ...input };
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
