import { useEffect, useState } from "react";
import { FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";
import { pickDirectory } from "../lib/api";
import type { SyncPair } from "../lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: SyncPair | null;
  onSubmit: (data: { name: string; source: string; target: string; recursive: boolean }) => void;
}

const fieldClass =
  "w-full border-b border-border-input bg-transparent px-0 py-1.5 text-sm text-text outline-none transition-colors placeholder:text-text-tertiary focus:border-accent";

export function PairDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [recursive, setRecursive] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setSource(initial?.source ?? "");
      setTarget(initial?.target ?? "");
      setRecursive(initial?.recursive ?? false);
    }
  }, [open, initial]);

  const chooseSource = async () => {
    const dir = await pickDirectory();
    if (dir) setSource(dir);
  };
  const chooseTarget = async () => {
    const dir = await pickDirectory();
    if (dir) setTarget(dir);
  };

  const canSubmit = source.trim() !== "" && target.trim() !== "" && source !== target;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "编辑目录对" : "添加目录对"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wide text-text-tertiary">
              备注名（可选）
            </label>
            <input
              className={fieldClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：项目A"
            />
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wide text-text-tertiary">
              输入目录
            </label>
            <div className="flex items-end gap-2">
              <input
                className={cn(fieldClass, "font-mono text-xs")}
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="选择输入目录"
              />
              <Button variant="outline" size="icon" onClick={chooseSource}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-mono text-xs uppercase tracking-wide text-text-tertiary">
              输出目录
            </label>
            <div className="flex items-end gap-2">
              <input
                className={cn(fieldClass, "font-mono text-xs")}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="选择输出目录"
              />
              <Button variant="outline" size="icon" onClick={chooseTarget}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {source && target && source === target && (
            <p className="-mt-3 text-xs text-danger-text">输入目录和输出目录不能相同</p>
          )}

          <div>
            <label className="mb-1.5 block font-mono text-xs uppercase tracking-wide text-text-tertiary">
              同步范围
            </label>
            <div className="inline-flex overflow-hidden rounded-md border border-border-input">
              <button
                type="button"
                onClick={() => setRecursive(false)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  !recursive
                    ? "bg-accent text-on-accent"
                    : "bg-surface text-text-secondary hover:bg-surface-hover",
                )}
              >
                仅当前层
              </button>
              <button
                type="button"
                onClick={() => setRecursive(true)}
                className={cn(
                  "border-l border-border-input px-3 py-1.5 text-xs font-medium transition-colors",
                  recursive
                    ? "bg-accent text-on-accent"
                    : "bg-surface text-text-secondary hover:bg-surface-hover",
                )}
              >
                含所有子目录
              </button>
            </div>
            <p className="mt-1.5 text-xs text-text-tertiary">
              {recursive ? "同步该目录及其所有层级子目录中的文件" : "仅同步该目录下第一层的文件"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={() => {
              onSubmit({ name, source, target, recursive });
              onOpenChange(false);
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
