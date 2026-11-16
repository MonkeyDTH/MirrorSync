import { useState } from "react";
import type { Update } from "@tauri-apps/plugin-updater";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

interface Props {
  update: Update | null;
  syncing: boolean;
  onClose: () => void;
}

// 下载进度：total 为 0 表示服务端未返回长度，此时只显示已下载字节
type Progress = { downloaded: number; total: number };

const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function UpdateDialog({ update, syncing, onClose }: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const downloading = progress !== null;

  const install = async () => {
    if (!update) return;
    setProgress({ downloaded: 0, total: 0 });
    try {
      // Windows 上安装步骤会强制退出应用，安装程序装完后自动重新打开，这里不会正常返回
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          setProgress({ downloaded: 0, total: event.data.contentLength ?? 0 });
        } else if (event.event === "Progress") {
          setProgress((p) => p && { ...p, downloaded: p.downloaded + event.data.chunkLength });
        }
      });
    } catch (e) {
      toast.error(`更新失败: ${e}`);
      setProgress(null);
    }
  };

  const percent = progress && progress.total > 0 ? Math.min(100, (progress.downloaded / progress.total) * 100) : 0;

  return (
    // 下载中不允许关闭，避免用户误以为已取消
    <Dialog open={update !== null} onOpenChange={(open) => !open && !downloading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>发现新版本 v{update?.version}</DialogTitle>
          <p className="mt-1 text-xs text-text-tertiary">当前版本 v{update?.currentVersion}</p>
        </DialogHeader>

        {update?.body && (
          <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-sm text-text-secondary">
            {update.body}
          </div>
        )}

        {progress && (
          <div className="mt-4 space-y-1.5">
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full rounded-full bg-accent transition-all duration-200" style={{ width: `${percent}%` }} />
            </div>
            <p className="font-mono text-xs text-text-tertiary">
              {formatMB(progress.downloaded)}
              {progress.total > 0 && ` / ${formatMB(progress.total)}`}
            </p>
          </div>
        )}

        <DialogFooter className="items-center">
          {syncing && !downloading && <span className="mr-auto text-xs text-text-tertiary">同步完成后再更新</span>}
          <Button variant="outline" size="sm" onClick={onClose} disabled={downloading}>
            稍后
          </Button>
          <Button size="sm" onClick={install} disabled={syncing || downloading}>
            {downloading ? "正在下载…" : "立即更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
