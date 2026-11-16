use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

use crate::config::SyncPair;

/// 进度推送最小间隔（约 20 次/秒），足够流畅且不会刷爆前端
const PROGRESS_INTERVAL: Duration = Duration::from_millis(50);

#[derive(Debug, Clone, Serialize)]
pub struct SyncProgress {
    pub pair_id: String,
    pub current_file: String,
    pub done: usize,
    pub total: usize,
}

#[derive(Debug, Default, Serialize)]
pub struct SyncResult {
    pub pair_id: String,
    pub copied: u32,
    pub skipped: u32,
    pub errors: Vec<String>,
    pub duration_ms: u64,
}

/// 对单个目录对执行同步：仅将输入目录中新增/更新的文件复制到输出目录，不删除输出目录中多出的文件。
pub fn sync_pair(app: &AppHandle, pair: &SyncPair) -> SyncResult {
    let start = std::time::Instant::now();
    let mut result = SyncResult {
        pair_id: pair.id.clone(),
        ..Default::default()
    };

    let source = Path::new(&pair.source);
    let target = Path::new(&pair.target);

    if !source.is_dir() {
        result.errors.push(format!("输入目录不存在: {}", pair.source));
        result.duration_ms = start.elapsed().as_millis() as u64;
        return result;
    }
    if source == target || target.starts_with(source) || source.starts_with(target) {
        result
            .errors
            .push("输入目录与输出目录存在包含关系，已跳过以防递归复制".to_string());
        result.duration_ms = start.elapsed().as_millis() as u64;
        return result;
    }
    if let Err(e) = fs::create_dir_all(target) {
        result.errors.push(format!("创建输出目录失败: {e}"));
        result.duration_ms = start.elapsed().as_millis() as u64;
        return result;
    }

    // 收集源文件的相对路径；未开启递归时仅同步该目录下第一层的文件。
    // 遍历出错（如子目录无读取权限）计入 errors，避免漏同步却显示成功
    let mut walker = WalkDir::new(source);
    if !pair.recursive {
        walker = walker.max_depth(1);
    }
    let source_entries: Vec<PathBuf> = walker
        .into_iter()
        .filter_map(|entry| match entry {
            Ok(e) => Some(e),
            Err(e) => {
                let path = e.path().map(|p| p.display().to_string()).unwrap_or_default();
                // walkdir 的 Display 会再带一遍路径，优先取底层 IO 错误（如「拒绝访问」）
                let reason = e.io_error().map_or_else(|| e.to_string(), |io| io.to_string());
                result.errors.push(format!("读取失败 {path}: {reason}"));
                None
            }
        })
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.path().strip_prefix(source).ok().map(|p| p.to_path_buf()))
        .collect();

    let total = source_entries.len();
    // 进度事件节流：首个、最后一个、以及距上次超过间隔时才推送，事件量与文件数脱钩
    let mut last_emit: Option<Instant> = None;

    for (i, rel) in source_entries.iter().enumerate() {
        let src_file = source.join(rel);
        let dst_file = target.join(rel);

        if i + 1 == total || last_emit.map_or(true, |t| t.elapsed() >= PROGRESS_INTERVAL) {
            let _ = app.emit(
                "sync-progress",
                SyncProgress {
                    pair_id: pair.id.clone(),
                    current_file: rel.to_string_lossy().to_string(),
                    done: i + 1,
                    total,
                },
            );
            last_emit = Some(Instant::now());
        }

        if let Some(parent) = dst_file.parent() {
            if let Err(e) = fs::create_dir_all(parent) {
                result
                    .errors
                    .push(format!("创建目录失败 {}: {e}", parent.display()));
                continue;
            }
        }

        match needs_copy(&src_file, &dst_file) {
            Ok(true) => match fs::copy(&src_file, &dst_file) {
                Ok(_) => result.copied += 1,
                Err(e) => result
                    .errors
                    .push(format!("复制失败 {}: {e}", rel.display())),
            },
            Ok(false) => result.skipped += 1,
            Err(e) => result
                .errors
                .push(format!("比较文件失败 {}: {e}", rel.display())),
        }
    }

    result.duration_ms = start.elapsed().as_millis() as u64;
    result
}

fn needs_copy(src: &Path, dst: &Path) -> std::io::Result<bool> {
    if !dst.exists() {
        return Ok(true);
    }
    let src_meta = fs::metadata(src)?;
    let dst_meta = fs::metadata(dst)?;
    if src_meta.len() != dst_meta.len() {
        return Ok(true);
    }
    let src_mtime = src_meta.modified()?;
    let dst_mtime = dst_meta.modified()?;
    Ok(src_mtime > dst_mtime)
}
