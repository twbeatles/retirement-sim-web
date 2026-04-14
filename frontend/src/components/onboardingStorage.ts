export const ONBOARDING_KEY = "retirement_sim_onboarding_v1";

export function resetOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY);
}
