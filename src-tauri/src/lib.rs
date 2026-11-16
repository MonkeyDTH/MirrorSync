mod commands;
mod config;
mod sync;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::list_pairs,
            commands::add_pair,
            commands::update_pair,
            commands::delete_pair,
            commands::sync_pairs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
