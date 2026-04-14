/**
 * Advanced Settings Component
 * Keeps orchestration local while delegating each settings domain to focused sections.
 */
import React, { useState } from "react";
import {
    type BucketSettings,
    type GuardrailsSettings,
    type HealthInsurance,
    type InflationScenario,
    type LongevityRisk,
    type RebalancingSettings,
    type ReverseAnnuity,
    type SeveranceSettings,
    type SimulationInput,
    type TaxCredit,
} from "../logic/types";
import { InflationSection } from "./advanced-settings/InflationSection";
import { InsuranceAndCreditSection } from "./advanced-settings/InsuranceAndCreditSection";
import { LongevitySection } from "./advanced-settings/LongevitySection";
import { RetirementIncomeSection } from "./advanced-settings/RetirementIncomeSection";
import { WithdrawalControlsSection } from "./advanced-settings/WithdrawalControlsSection";

interface Props {
    input: SimulationInput;
    onChange: (input: SimulationInput) => void;
}

export const AdvancedSettings = React.memo(function AdvancedSettings({ input, onChange }: Props) {
    const [expandedSections, setExpandedSections] = useState<string[]>(["inflation"]);

    const toggleSection = (section: string) => {
        setExpandedSections((prev) =>
            prev.includes(section)
                ? prev.filter((current) => current !== section)
                : [...prev, section]
        );
    };

    const isExpanded = (section: string) => expandedSections.includes(section);

    const updateInflation = (scenario: Partial<InflationScenario>) => {
        const nextInflation = { ...input.inflation_scenario, ...scenario } as InflationScenario;
        onChange({
            ...input,
            annual_inflation: nextInflation.baseRate ?? input.annual_inflation,
            inflation_scenario: nextInflation
        });
    };

    const updateTaxCredit = (taxCredit: Partial<TaxCredit>) => {
        onChange({
            ...input,
            tax_credit: {
                enabled: false,
                mode: "law_2026",
                lawYear: 2026,
                incomeBasis: "simulated_taxable_income",
                pensionSavingsContribution: 0,
                irpContribution: 0,
                creditRate: 0.15,
                ...input.tax_credit,
                ...taxCredit
            } as TaxCredit
        });
    };

    const updateHealthInsurance = (healthInsurance: Partial<HealthInsurance>) => {
        onChange({
            ...input,
            health_insurance: { ...input.health_insurance, ...healthInsurance } as HealthInsurance
        });
    };

    const updateSeverance = (severance: Partial<SeveranceSettings>) => {
        onChange({
            ...input,
            severance: { ...input.severance, ...severance } as SeveranceSettings
        });
    };

    const updateReverseAnnuity = (reverseAnnuity: Partial<ReverseAnnuity>) => {
        onChange({
            ...input,
            reverse_annuity: { ...input.reverse_annuity, ...reverseAnnuity } as ReverseAnnuity
        });
    };

    const updateGuardrails = (guardrails: Partial<GuardrailsSettings>) => {
        onChange({
            ...input,
            guardrails: { ...input.guardrails, ...guardrails } as GuardrailsSettings
        });
    };

    const updateBucket = (bucket: Partial<BucketSettings>) => {
        onChange({
            ...input,
            bucket: { ...input.bucket, ...bucket } as BucketSettings
        });
    };

    const updateLongevity = (longevityRisk: Partial<LongevityRisk>) => {
        onChange({
            ...input,
            longevity_risk: { ...input.longevity_risk, ...longevityRisk } as LongevityRisk
        });
    };

    const updateRebalancing = (rebalancing: Partial<RebalancingSettings>) => {
        onChange({
            ...input,
            rebalancing: { ...input.rebalancing, ...rebalancing } as RebalancingSettings
        });
    };

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 dark:border-zinc-800 transition-all">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0 mb-4 border-b border-transparent">⚙️ 고급 설정</h3>

            <InflationSection
                annualInflation={input.annual_inflation}
                scenario={input.inflation_scenario}
                isOpen={isExpanded("inflation")}
                onToggle={() => toggleSection("inflation")}
                onUpdate={updateInflation}
            />

            <InsuranceAndCreditSection
                healthInsurance={input.health_insurance}
                taxCredit={input.tax_credit}
                healthOpen={isExpanded("health")}
                taxOpen={isExpanded("tax_credit")}
                onToggleHealth={() => toggleSection("health")}
                onToggleTax={() => toggleSection("tax_credit")}
                onUpdateHealthInsurance={updateHealthInsurance}
                onUpdateTaxCredit={updateTaxCredit}
            />

            <RetirementIncomeSection
                severance={input.severance}
                reverseAnnuity={input.reverse_annuity}
                severanceOpen={isExpanded("severance")}
                reverseOpen={isExpanded("reverse")}
                onToggleSeverance={() => toggleSection("severance")}
                onToggleReverse={() => toggleSection("reverse")}
                onUpdateSeverance={updateSeverance}
                onUpdateReverseAnnuity={updateReverseAnnuity}
            />

            <WithdrawalControlsSection
                withdrawalStrategy={input.withdrawal.strategy}
                guardrails={input.guardrails}
                bucket={input.bucket}
                rebalancing={input.rebalancing}
                guardrailsOpen={isExpanded("guardrails")}
                bucketOpen={isExpanded("bucket")}
                rebalancingOpen={isExpanded("rebalancing")}
                onToggleGuardrails={() => toggleSection("guardrails")}
                onToggleBucket={() => toggleSection("bucket")}
                onToggleRebalancing={() => toggleSection("rebalancing")}
                onUpdateGuardrails={updateGuardrails}
                onUpdateBucket={updateBucket}
                onUpdateRebalancing={updateRebalancing}
            />

            <LongevitySection
                longevityRisk={input.longevity_risk}
                isOpen={isExpanded("longevity")}
                onToggle={() => toggleSection("longevity")}
                onUpdate={updateLongevity}
            />
        </div>
    );
});
