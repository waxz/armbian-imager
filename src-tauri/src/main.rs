//! Armbian Imager - Flash Armbian OS images to SD cards and USB drives
//!
//! A cross-platform Tauri application for downloading and flashing
//! Armbian images to removable media.

// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod config;
mod decompress;
mod devices;
mod download;
mod flash;
mod images;
mod logging;
mod paste;
mod utils;

use commands::AppState;
#[allow(unused_imports)] // Used by get_webview_window in debug builds
use tauri::Manager;

use crate::utils::get_cache_dir;

/// Clean up cached download images from previous sessions (not board images)
fn cleanup_download_cache() {
    let images_dir = get_cache_dir(config::app::NAME).join("images");

    if images_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&images_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let _ = std::fs::remove_file(&path);
                }
            }
        }
    }
}

/// Clean up board images cache on app exit
fn cleanup_board_images_cache() {
    log_info!("main", "Cleaning up board images cache on exit");
    if let Err(e) = commands::image_cache::clear_cache() {
        log_error!("main", "Failed to clear board images cache: {}", e);
    }
}

fn main() {
    // Initialize logging system
    logging::init();

    // Log startup info
    log_info!("main", "=== Armbian Imager Starting ===");
    log_info!("main", "Version: {}", env!("CARGO_PKG_VERSION"));
    log_info!("main", "OS: {} {}", std::env::consts::OS, std::env::consts::ARCH);
    log_info!("main", "Config URLs:");
    log_info!("main", "  - Images API: {}", config::urls::ALL_IMAGES);
    log_info!("main", "  - Board images: {}", config::urls::BOARD_IMAGES_BASE);

    // Clean up any leftover download images from previous sessions
    cleanup_download_cache();

    // Initialize board image cache
    commands::image_cache::init_cache();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::board_queries::get_boards,
            commands::board_queries::get_images_for_board,
            commands::board_queries::get_block_devices,
            commands::scraping::get_board_image_url,
            commands::scraping::start_image_prefetch,
            commands::operations::request_write_authorization,
            commands::operations::download_image,
            commands::operations::flash_image,
            commands::operations::delete_downloaded_image,
            commands::progress::cancel_operation,
            commands::progress::get_download_progress,
            commands::progress::get_flash_progress,
            commands::custom_image::select_custom_image,
            commands::custom_image::check_needs_decompression,
            commands::custom_image::decompress_custom_image,
            paste::upload::upload_logs,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.open_devtools();
                }
            }
            let _ = app; // Suppress unused warning in release
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                cleanup_board_images_cache();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
