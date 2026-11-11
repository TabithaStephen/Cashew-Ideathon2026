import { Button } from './Button';

// One sentence, one button. Manifest has no illustrations, so the blueprint's cashew drawing is left out.
export function EmptyState({ message, actionLabel, onAction }: { message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 border border-rule border-t-2 border-t-ink bg-sheet px-4 py-8">
      <p>{message}</p>
      {actionLabel && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
