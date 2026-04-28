export function getGaugeColor(rate: number) {
    if (rate >= 0.9) return "var(--success)";
    if (rate >= 0.7) return "#22c55e";
    if (rate >= 0.5) return "var(--warning)";
    return "var(--danger)";
}

export function getFeedback(rate: number) {
    if (rate >= 0.9) return { emoji: "🎉", text: "아주 훌륭합니다! 은퇴 준비가 잘 되어 있어요." };
    if (rate >= 0.7) return { emoji: "😊", text: "양호합니다. 조금만 더 저축하면 완벽해요!" };
    if (rate >= 0.5) return { emoji: "🤔", text: "주의가 필요합니다. 저축액을 늘려보세요." };
    return { emoji: "⚠️", text: "대책이 필요합니다. 은퇴 계획을 점검하세요." };
}
