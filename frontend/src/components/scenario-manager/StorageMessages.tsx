import type { StorageResetNotice } from "../../services/storage";

type StorageMessagesProps = {
    resetNotice: StorageResetNotice | null;
    storageError: string | null;
    corruptRecordCount: number;
    onDismissResetNotice: () => void;
};

export function StorageMessages({
    resetNotice,
    storageError,
    corruptRecordCount,
    onDismissResetNotice,
}: StorageMessagesProps) {
    return (
        <>
            {resetNotice && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                    <div className="font-semibold">플랜 저장소 업그레이드 안내</div>
                    <div className="mt-1 leading-relaxed">{resetNotice.message}</div>
                    <button
                        type="button"
                        className="mt-3 rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900/20"
                        onClick={onDismissResetNotice}
                    >
                        닫기
                    </button>
                </div>
            )}

            {storageError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
                    <div className="font-semibold">시나리오 저장소 사용 불가</div>
                    <div className="mt-1 leading-relaxed">{storageError}</div>
                </div>
            )}

            {corruptRecordCount > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                    <div className="font-semibold">손상된 저장 시나리오 제외</div>
                    <div className="mt-1 leading-relaxed">
                        유효하지 않은 로컬 저장 시나리오 {corruptRecordCount}개를 건너뛰었습니다. 정상 시나리오는 계속 사용할 수 있습니다.
                    </div>
                </div>
            )}
        </>
    );
}
