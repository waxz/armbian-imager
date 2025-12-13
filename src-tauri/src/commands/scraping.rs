//! Board image URL module
//!
//! Provides board image URLs from local cache.
//! Images are downloaded once and served from local filesystem.

use crate::log_info;

use super::image_cache::{cache_board_image, get_cached_image_path};

/// Get board image URL - returns local file path for the cached image
/// Downloads and caches image if not already cached
#[tauri::command]
pub async fn get_board_image_url(board_slug: String) -> Result<Option<String>, String> {
    // Check if we already have a cached version
    if let Some(path) = get_cached_image_path(&board_slug) {
        log_info!("scraping", "Using cached image for {}", board_slug);
        return Ok(Some(path.to_string_lossy().to_string()));
    }

    // Try to download and cache
    match cache_board_image(&board_slug).await {
        Ok(path) => {
            log_info!("scraping", "Downloaded and cached image for {}", board_slug);
            Ok(Some(path.to_string_lossy().to_string()))
        }
        Err(_) => {
            // Return None so frontend uses local fallback image
            Ok(None)
        }
    }
}

/// Start prefetching images for all known boards
/// Called from main.rs on app startup
#[tauri::command]
pub async fn start_image_prefetch(board_slugs: Vec<String>) -> Result<(), String> {
    log_info!(
        "scraping",
        "Starting prefetch for {} board images",
        board_slugs.len()
    );
    super::image_cache::prefetch_board_images(board_slugs);
    Ok(())
}
