export const MAX_FULL_MONTE_CARLO_PATHS = 10_000;
export const MAX_PLAN_IMPORT_BYTES = 1 * 1024 * 1024;
export const MAX_PLAN_COLLECTION_ITEMS = 500;

export function clampMonteCarloPaths(value: number): number {
    if (!Number.isFinite(value)) {
        return 1;
    }
    return Math.min(MAX_FULL_MONTE_CARLO_PATHS, Math.max(1, Math.floor(value)));
}

export function formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024) {
        return `${Math.round(bytes / 1024 / 1024)}MB`;
    }
    return `${Math.round(bytes / 1024)}KB`;
}
