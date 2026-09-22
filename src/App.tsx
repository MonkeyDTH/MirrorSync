import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, FolderSync } from "lucide-react";
import { Toaster, toast } from "sonner";
import { Button } from "./components/ui/button";
import { Checkbox } from "./components/ui/checkbox";
import { PairCard } from "./components/PairCard";
import { PairDialog } from "./components/PairDialog";
import { SyncLogPanel } from "./components/SyncLogPanel";
import {
  addPair,
  deletePair,
  listPairs,
  onSyncProgress,
  syncPairs,
  updatePair,
} from "./lib/api";
import type { SyncPair, SyncProgress, SyncResult } from "./lib/types";

function App() {
  const [pairs, setPairs] = useState<SyncPair[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPair, setEditingPair] = useState<SyncPair | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [progressByPair, setProgressByPair] = useState<Record<string, SyncProgress>>({});
  const [results, setResults] = useState<SyncResult[]>([]);

  useEffect(() => {
    listPairs()
      .then(setPairs)
      .catch((e) => toast.error(`加载配置失败: ${e}`));
  }, []);

  useEffect(() => {
    const unlisten = onSyncProgress((progress) => {
      setProgressByPair((prev) => ({ ...prev, [progress.pair_id]: progress }));
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  const pairsById = useMemo(
    () => Object.fromEntries(pairs.map((p) => [p.id, p])),
    [pairs],
  );
  const selectedCount = pairs.filter((p) => p.selected).length;
  const allSelected = pairs.length > 0 && selectedCount === pairs.length;

  const toggleAll = async (checked: boolean) => {
    const updated = pairs.map((p) => ({ ...p, selected: checked }));
    setPairs(updated);
    await Promise.all(updated.map((p) => updatePair(p)));
  };

  const togglePair = async (id: string, checked: boolean) => {
    const updated = pairs.map((p) => (p.id === id ? { ...p, selected: checked } : p));
    setPairs(updated);
    const target = updated.find((p) => p.id === id);
    if (target) await updatePair(target);
  };

  const handleSubmit = async (data: {
    name: string;
    source: string;
    target: string;
    recursive: boolean;
  }) => {
    try {
      if (editingPair) {
        const updated = { ...editingPair, ...data };
        await updatePair(updated);
        setPairs((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast.success("已保存修改");
      } else {
        const created = await addPair(data.name, data.source, data.target, data.recursive);
        setPairs((prev) => [...prev, created]);
        toast.success("已添加目录对");
      }
    } catch (e) {
      toast.error(`保存失败: ${e}`);
    } finally {
      setEditingPair(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deletePair(id);
      setPairs((prev) => prev.filter((p) => p.id !== id));
      toast.success("已删除");
    } catch (e) {
      toast.error(`删除失败: ${e}`);
    }
  };

  const handleSync = async () => {
    const ids = pairs.filter((p) => p.selected).map((p) => p.id);
    if (ids.length === 0) return;
    setSyncing(true);
    setProgressByPair({});
    setResults([]);
    try {
      const res = await syncPairs(ids);
      setResults(res);
      const hasError = res.some((r) => r.errors.length > 0);
      if (hasError) {
        toast.warning("同步完成，但部分目录对存在错误，请查看日志");
      } else {
        toast.success("同步完成");
      }
    } catch (e) {
      toast.error(`同步失败: ${e}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col bg-bg px-6 pb-8 pt-9">
      <Toaster position="top-center" richColors />

      <header className="flex items-end justify-between pb-5">
        <div>
          {/* 字体契约：--font-display 只用于 text-lg 及以上，这行是 text-xs，走正文字族 */}
          <p className="text-xs uppercase tracking-widest text-text-brand">
            本地 · 单向镜像
          </p>
          <h1 className="mt-1 font-display text-3xl font-normal tracking-tight text-text">
            MirrorSync
</h1>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingPair(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          新建目录对
        </Button>
      </header>

      <div className="border-t border-border-subtle" />

      {pairs.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="rounded-lg border border-dashed border-border-input px-8 py-10">
            <p className="text-sm text-text-secondary">还没有目录对</p>
            <p className="mt-1 text-xs text-text-tertiary">
              添加一组输入 / 输出目录，开始单向镜像同步
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => {
                setEditingPair(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              添加第一个目录对
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border-subtle py-3">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(v === true)} />
              全选
              <span className="font-mono text-xs tabular-nums text-text-tertiary">
                {selectedCount}/{pairs.length}
              </span>
            </label>
            <Button onClick={handleSync} disabled={selectedCount === 0 || syncing} size="sm">
              {syncing ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FolderSync className="h-3.5 w-3.5" />
              )}
              {syncing ? "同步中…" : "开始同步"}
            </Button>
          </div>

          <div>
            {pairs.map((pair) => (
              <PairCard
                key={pair.id}
                pair={pair}
                onToggle={(checked) => togglePair(pair.id, checked)}
                onEdit={() => {
                  setEditingPair(pair);
                  setDialogOpen(true);
                }}
                onDelete={() => handleDelete(pair.id)}
              />
            ))}
          </div>

          <SyncLogPanel
            syncing={syncing}
            progressByPair={progressByPair}
            results={results}
            pairsById={pairsById}
          />
        </>
      )}

      <PairDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editingPair}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

export default App;
