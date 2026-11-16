use tauri::AppHandle;
use uuid::Uuid;

use crate::config::{load_config, save_config, SyncPair};
use crate::sync::{sync_pair, SyncResult};

#[tauri::command]
pub fn list_pairs(app: AppHandle) -> Result<Vec<SyncPair>, String> {
    Ok(load_config(&app)?.pairs)
}

#[tauri::command]
pub fn add_pair(
    app: AppHandle,
    name: String,
    source: String,
    target: String,
    recursive: bool,
) -> Result<SyncPair, String> {
    let mut config = load_config(&app)?;
    let pair = SyncPair {
        id: Uuid::new_v4().to_string(),
        name,
        source,
        target,
        selected: true,
        recursive,
    };
    config.pairs.push(pair.clone());
    save_config(&app, &config)?;
    Ok(pair)
}

#[tauri::command]
pub fn update_pair(app: AppHandle, pair: SyncPair) -> Result<(), String> {
    let mut config = load_config(&app)?;
    if let Some(existing) = config.pairs.iter_mut().find(|p| p.id == pair.id) {
        *existing = pair;
    } else {
        return Err("目录对不存在".to_string());
    }
    save_config(&app, &config)
}

#[tauri::command]
pub fn delete_pair(app: AppHandle, id: String) -> Result<(), String> {
    let mut config = load_config(&app)?;
    config.pairs.retain(|p| p.id != id);
    save_config(&app, &config)
}

// async + spawn_blocking：同步是长时间阻塞的文件 IO，非 async 命令会在主线程执行导致窗口无响应；
// 放进阻塞线程池，既不占主线程也不占异步运行时的工作线程
#[tauri::command]
pub async fn sync_pairs(app: AppHandle, pair_ids: Vec<String>) -> Result<Vec<SyncResult>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        // 开始时读一次配置快照，同步期间用户编辑/删除目录对不影响本次同步
        let config = load_config(&app)?;
        Ok(pair_ids
            .iter()
            .filter_map(|id| config.pairs.iter().find(|p| &p.id == id))
            .map(|pair| sync_pair(&app, pair))
            .collect())
    })
    .await
    .map_err(|e| format!("同步任务异常退出: {e}"))?
}
