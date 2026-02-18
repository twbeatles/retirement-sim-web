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

        return {
            ...INITIAL_INPUT,
            ...source,
            general: { ...INITIAL_INPUT.general, ...source.general },
            private_pension: { ...INITIAL_INPUT.private_pension, ...source.private_pension },
            national_pension: { ...INITIAL_INPUT.national_pension, ...source.national_pension },
            debt: { ...INITIAL_INPUT.debt, ...source.debt },
            portfolio: {
                ...INITIAL_INPUT.portfolio,
                ...source.portfolio,
                assetClasses: source.portfolio?.assetClasses ?? INITIAL_INPUT.portfolio.assetClasses
            },
            withdrawal: { ...INITIAL_INPUT.withdrawal, ...source.withdrawal },
            simulation_settings: { ...INITIAL_INPUT.simulation_settings, ...source.simulation_settings },
            rebalancing: { ...INITIAL_INPUT.rebalancing, ...source.rebalancing },
            stress_test: { ...INITIAL_INPUT.stress_test, ...source.stress_test },
            labor_income: {
                ...INITIAL_INPUT.labor_income,
                ...source.labor_income,
                events: source.labor_income?.events ?? INITIAL_INPUT.labor_income.events
            },
            guardrails: { ...INITIAL_INPUT.guardrails, ...source.guardrails },
            bucket: { ...INITIAL_INPUT.bucket, ...source.bucket },
            health_insurance: { ...INITIAL_INPUT.health_insurance, ...source.health_insurance },
            severance: { ...INITIAL_INPUT.severance, ...source.severance },
            longevity_risk: { ...INITIAL_INPUT.longevity_risk, ...source.longevity_risk },
            medical_shocks: {
                ...INITIAL_INPUT.medical_shocks,
                ...source.medical_shocks,
                occurrences: source.medical_shocks?.occurrences ?? INITIAL_INPUT.medical_shocks.occurrences
            },
            reverse_annuity: { ...INITIAL_INPUT.reverse_annuity, ...source.reverse_annuity },
            inflation_scenario: { ...INITIAL_INPUT.inflation_scenario, ...source.inflation_scenario },
            tax_credit: {
                enabled: false,
                pensionSavingsContribution: 0,
                irpContribution: 0,
                creditRate: 0.15,
                ...source.tax_credit
            },
            realEstate: source.realEstate ?? INITIAL_INPUT.realEstate,
            additionalPensions: source.additionalPensions ?? INITIAL_INPUT.additionalPensions,
            businessIncome: source.businessIncome ?? INITIAL_INPUT.businessIncome,
            events: source.events ?? INITIAL_INPUT.events
        };
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
