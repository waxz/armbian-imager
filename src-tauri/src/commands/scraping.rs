//! Board image URL module
//!
//! Provides board image URLs from CDN with local cache for performance.
//! The cache is used to avoid re-downloading images and to check if an image exists.

use crate::config;
use crate::log_info;

use super::image_cache::{cache_board_image, get_cached_image_path};

/// Get board image URL - returns CDN URL for the image
/// Uses local cache to verify image exists, returns fallback if not
#[tauri::command]
pub async fn get_board_image_url(board_slug: String) -> Result<Option<String>, String> {
    // Check if we already have a cached version (means image exists)
    if get_cached_image_path(&board_slug).is_some() {
        // Return CDN URL since we know the image exists
        let url = format!(
            "{}{}/{}.png",
            config::urls::BOARD_IMAGES_BASE,
            config::urls::BOARD_IMAGE_SIZE,
            board_slug
        );
        return Ok(Some(url));
    }

    // Try to download and cache to verify image exists
    match cache_board_image(&board_slug).await {
        Ok(_) => {
            // Return CDN URL
            let url = format!(
                "{}{}/{}.png",
                config::urls::BOARD_IMAGES_BASE,
                config::urls::BOARD_IMAGE_SIZE,
                board_slug
            );
            Ok(Some(url))
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
