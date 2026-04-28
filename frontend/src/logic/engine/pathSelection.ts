export type DistributionPathSnapshot = {
    index: number;
    finalTotalAssetsReal: number;
    retirementTotalAssetsReal: number;
    depletionAge: number;
};
export function selectRepresentativePathIndex(
    paths: DistributionPathSnapshot[],
    targetFinalP50: number,
    targetRetirementP50: number,
    targetMedianDepletionAge: number | null
): number {
    if (paths.length === 0) {
        return -1;
    }

    const sorted = [...paths].sort((left, right) => {
        const finalDistance = Math.abs(left.finalTotalAssetsReal - targetFinalP50) - Math.abs(right.finalTotalAssetsReal - targetFinalP50);
        if (Math.abs(finalDistance) > 1e-9) {
            return finalDistance;
        }

        const retirementDistance =
            Math.abs(left.retirementTotalAssetsReal - targetRetirementP50) -
            Math.abs(right.retirementTotalAssetsReal - targetRetirementP50);
        if (Math.abs(retirementDistance) > 1e-9) {
            return retirementDistance;
        }

        const targetAge = targetMedianDepletionAge ?? Number.POSITIVE_INFINITY;
        const leftAgeDistance = left.depletionAge >= 0 ? Math.abs(left.depletionAge - targetAge) : Number.POSITIVE_INFINITY;
        const rightAgeDistance = right.depletionAge >= 0 ? Math.abs(right.depletionAge - targetAge) : Number.POSITIVE_INFINITY;
        if (Math.abs(leftAgeDistance - rightAgeDistance) > 1e-9) {
            return leftAgeDistance - rightAgeDistance;
        }

        return left.index - right.index;
    });

    return sorted[0].index;
}

function selectPathIndexClosestToTarget(
    paths: DistributionPathSnapshot[],
    targetFinalValue: number,
    excludedIndices: Set<number>
): number | null {
    const candidate = [...paths]
        .filter((path) => !excludedIndices.has(path.index))
        .sort((left, right) => {
            const distance = Math.abs(left.finalTotalAssetsReal - targetFinalValue) - Math.abs(right.finalTotalAssetsReal - targetFinalValue);
            if (Math.abs(distance) > 1e-9) {
                return distance;
            }
            return left.index - right.index;
        })[0];

    return candidate?.index ?? null;
}

export function selectSamplePathIndices(
    paths: DistributionPathSnapshot[],
    terminalStats: { p10: number; p50: number; p90: number },
    representativeIndex: number
): Array<{ label: string; index: number }> {
    const excluded = new Set<number>(representativeIndex >= 0 ? [representativeIndex] : []);
    const targets: Array<{ label: string; value: number }> = [
        { label: "하방 샘플", value: terminalStats.p10 },
        { label: "중위 샘플", value: terminalStats.p50 },
        { label: "상방 샘플", value: terminalStats.p90 }
    ];
    const selected: Array<{ label: string; index: number }> = [];

    for (const target of targets) {
        const index = selectPathIndexClosestToTarget(paths, target.value, excluded);
        if (index === null) {
            continue;
        }
        excluded.add(index);
        selected.push({ label: target.label, index });
    }

    if (selected.length >= 3) {
        return selected;
    }

    for (const path of [...paths].sort((left, right) => left.index - right.index)) {
        if (excluded.has(path.index)) {
            continue;
        }
        excluded.add(path.index);
        selected.push({
            label: `샘플 경로 ${selected.length + 1}`,
            index: path.index
        });
        if (selected.length >= 3) {
            break;
        }
    }

    return selected;
}

