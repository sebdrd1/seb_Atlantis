#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod commands;
mod db;
mod fs;
mod vps;

use tauri::Manager;
use std::sync::Mutex;
use std::collections::HashMap;
use crate::vps::VPSClient;

fn main() {
    let vps_clients: Mutex<HashMap<String, VPSClient>> = Mutex::new(HashMap::new());
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .manage(vps_clients)
        .setup(|app| {
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = db::init(handle).await {
                    eprintln!("DB init failed: {}", e);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::chat,
            commands::chat_stream,
            commands::get_models,
            commands::set_api_key,
            commands::vps_execute,
            commands::vps_status,
            commands::read_file,
            commands::write_file,
            commands::list_files,
            commands::upload_file,
            commands::memory_get,
            commands::memory_set,
            commands::memory_delete,
            commands::memory_search,
            commands::get_settings,
            commands::save_settings,
            commands::session_create,
            commands::session_get_all,
            commands::session_delete,
            commands::message_add,
            commands::message_get,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
