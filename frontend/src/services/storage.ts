import { INITIAL_INPUT } from "../logic/constants";
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
    private migrateInput(input?: Partial<SimulationInput>): SimulationInput {
        const source = input ?? {};
        const base = INITIAL_INPUT;

        return {
            ...base,
            ...source,
            general: { ...base.general, ...source.general },
            private_pension: { ...base.private_pension, ...source.private_pension },
            national_pension: { ...base.national_pension, ...source.national_pension },
            debt: { ...base.debt, ...source.debt },
            portfolio: {
                ...base.portfolio,
                ...source.portfolio,
                assetClasses: source.portfolio?.assetClasses ?? base.portfolio.assetClasses
            },
            withdrawal: { ...base.withdrawal, ...source.withdrawal },
            simulation_settings: { ...base.simulation_settings, ...source.simulation_settings },
            rebalancing: { ...base.rebalancing!, ...source.rebalancing },
            stress_test: { ...base.stress_test!, ...source.stress_test },
            labor_income: {
                ...base.labor_income!,
                ...source.labor_income,
                events: source.labor_income?.events ?? base.labor_income!.events
            },
            guardrails: { ...base.guardrails!, ...source.guardrails },
            bucket: { ...base.bucket!, ...source.bucket },
            health_insurance: { ...base.health_insurance!, ...source.health_insurance },
            severance: { ...base.severance!, ...source.severance },
            longevity_risk: { ...base.longevity_risk!, ...source.longevity_risk },
            medical_shocks: {
                ...base.medical_shocks!,
                ...source.medical_shocks,
                occurrences: source.medical_shocks?.occurrences ?? base.medical_shocks!.occurrences
            },
            reverse_annuity: { ...base.reverse_annuity!, ...source.reverse_annuity },
            inflation_scenario: { ...base.inflation_scenario!, ...source.inflation_scenario },
            tax_credit: {
                enabled: false,
                pensionSavingsContribution: 0,
                irpContribution: 0,
                creditRate: 0.15,
                ...source.tax_credit
            },
            realEstate: source.realEstate ?? base.realEstate,
            additionalPensions: source.additionalPensions ?? base.additionalPensions,
            businessIncome: source.businessIncome ?? base.businessIncome,
            events: source.events ?? base.events
        } as SimulationInput;
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
