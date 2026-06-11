import { formatBytes, MAX_PLAN_IMPORT_BYTES } from "../../logic/runtimeLimits";

type ScenarioFileControlsProps = {
    onImport: (file: File) => void;
    onExport: () => void;
};

export function ScenarioFileControls({ onImport, onExport }: ScenarioFileControlsProps) {
    return (
        <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-zinc-700">
                    플랜 JSON 가져오기
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                                onImport(file);
                            }
                            event.target.value = "";
                        }}
                    />
                </label>
                <button
                    onClick={onExport}
                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-200 active:scale-95 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700"
                >
                    현재 플랜 내보내기
                </button>
            </div>
            <div className="mb-4 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                JSON 가져오기는 UTF-8로 저장된 v2/v3 플랜 파일만 지원하며 최대 {formatBytes(MAX_PLAN_IMPORT_BYTES)}까지 허용됩니다.
            </div>
        </>
    );
}
