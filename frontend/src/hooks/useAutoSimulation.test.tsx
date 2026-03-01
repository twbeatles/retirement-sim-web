import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAutoSimulation } from './useAutoSimulation';
import { INITIAL_INPUT } from '../logic/constants';
import type { SimulationInput } from '../logic/types';

function createInput(): SimulationInput {
    return structuredClone(INITIAL_INPUT);
}

describe('useAutoSimulation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('does not run simulation when hasBlockingValidationError is true', () => {
        const runSimulation = vi.fn().mockResolvedValue(undefined);

        renderHook(() =>
            useAutoSimulation({
                input: createInput(),
                viewMode: 'simple',
                runSimulation,
                hasBlockingValidationError: true
            })
        );

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(runSimulation).not.toHaveBeenCalled();
    });

    it('resumes simulation when hasBlockingValidationError changes from true to false', () => {
        const runSimulation = vi.fn().mockResolvedValue(undefined);
        const stableInput = createInput();

        const { rerender } = renderHook(
            ({ blocked }) =>
                useAutoSimulation({
                    input: stableInput,
                    viewMode: 'simple',
                    runSimulation,
                    hasBlockingValidationError: blocked
                }),
            {
                initialProps: { blocked: true }
            }
        );

        act(() => {
            vi.advanceTimersByTime(1200);
        });
        expect(runSimulation).not.toHaveBeenCalled();

        rerender({ blocked: false });

        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(runSimulation).toHaveBeenCalledTimes(1);

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(runSimulation).toHaveBeenCalledTimes(2);
    });
});
