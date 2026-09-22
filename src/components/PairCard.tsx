import { ArrowRight, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "./ui/checkbox";
import { Button } from "./ui/button";
import type { SyncPair } from "../lib/types";

interface Props {
  pair: SyncPair;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PairCard({ pair, onToggle, onEdit, onDelete }: Props) {
  return (
    <div className="group flex items-center gap-3 border-b border-border-subtle py-3 last:border-none">
      <Checkbox checked={pair.selected} onCheckedChange={(v) => onToggle(v === true)} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text">
            {pair.name || "未命名目录对"}
          </span>
          <span className="shrink-0 rounded-full bg-surface-sunken px-1.5 py-0.5 font-mono text-xs leading-none text-text-tertiary">
            {pair.recursive ? "含子目录" : "仅当前层"}
          </span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-1.5 font-mono text-xs text-text-tertiary">
          <span className="truncate">{pair.source}</span>
          <ArrowRight className="h-3 w-3 shrink-0 text-text-tertiary" />
          <span className="truncate">{pair.target}</span>
        </div>
      </div>

      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="编辑">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="删除">
          <Trash2 className="h-3.5 w-3.5 text-danger" />
        </Button>
      </div>
    </div>
  );
}
