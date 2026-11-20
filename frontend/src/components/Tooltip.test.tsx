import { render, screen } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

describe("Tooltip toggletip", () => {
    it("links the trigger and the hint popover with matching ids", () => {
        render(<Tooltip content="추가 설명입니다." />);

        const trigger = screen.getByRole("button", { name: "추가 설명 보기" });
        // Closed popovers are hidden from the accessibility tree query, so
        // locate the hint by its text and assert its wiring directly.
        const tip = screen.getByText("추가 설명입니다.");

        expect(tip.getAttribute("role")).toBe("tooltip");
        expect(tip.id).toMatch(/^toggletip-/);
        expect(trigger.getAttribute("interestfor")).toBe(tip.id);
        expect(trigger.getAttribute("popovertarget")).toBe(tip.id);
        expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
});
