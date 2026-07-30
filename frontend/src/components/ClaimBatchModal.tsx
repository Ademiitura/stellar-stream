import { useFocusTrap } from "../hooks/useFocusTrap";
import type { BatchClaimState } from "../hooks/useClaimBatch";

interface ClaimBatchModalProps {
  state: BatchClaimState;
  streamCount: number;
  onConfirm: () => void;
  onClose: () => void;
}

export function ClaimBatchModal({
  state,
  streamCount,
  onConfirm,
  onClose,
}: ClaimBatchModalProps) {
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const isClaiming = state.phase === "claiming";
  const isComplete = state.phase === "complete";

  const summaryLabel = `Claim ${state.totalClaimable.toFixed(4)} ${state.assetLabel} across ${streamCount} stream${streamCount !== 1 ? "s" : ""}`;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isClaiming) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="claim-batch-title"
      >
        <h2 id="claim-batch-title">Batch claim</h2>

        {state.phase === "fetching" && (
          <p className="muted" role="status">
            Loading claimable amounts…
          </p>
        )}

        {(state.phase === "ready" || isClaiming || isComplete) && (
          <>
            <p>{summaryLabel}</p>

            {isClaiming && (
              <p className="muted" role="status" aria-live="polite">
                Claiming {state.progress.current} of {state.progress.total}
              </p>
            )}

            {isComplete && (
              <div role="status" aria-live="polite">
                <p>
                  {state.successCount} of {state.progress.total} claim
                  {state.progress.total !== 1 ? "s" : ""} succeeded.
                </p>
                {state.failures.length > 0 && (
                  <ul className="claim-batch-failures">
                    {state.failures.map((f) => (
                      <li key={f.streamId}>
                        Stream {f.streamId}: {f.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {state.error && (
              <p className="field-error" role="alert">
                {state.error}
              </p>
            )}
          </>
        )}

        <div className="modal-actions">
          {state.phase === "ready" && (
            <>
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={onConfirm}>
                Confirm claim
              </button>
            </>
          )}
          {isClaiming && (
            <button type="button" className="btn-primary" disabled aria-busy="true">
              Claiming…
            </button>
          )}
          {isComplete && (
            <button type="button" className="btn-primary" onClick={onClose}>
              Close
            </button>
          )}
          {state.phase === "fetching" && (
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
