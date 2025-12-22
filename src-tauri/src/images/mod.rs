//! Image management module
//!
//! Handles fetching, parsing, and filtering Armbian image data.

mod filters;
mod models;

// Re-export types and functions
pub use filters::{extract_images, filter_images_for_board, get_unique_boards};
pub use models::{BoardInfo, ImageInfo};
// ArmbianImage is used internally by filters module

use crate::config;
use crate::{log_error, log_info};

/// Fetch the all-images.json from Armbian
pub async fn fetch_all_images() -> Result<serde_json::Value, String> {
    log_info!(
        "images",
        "Fetching all images from {}",
        config::urls::ALL_IMAGES
    );

    let response = reqwest::get(config::urls::ALL_IMAGES).await.map_err(|e| {
        log_error!("images", "Failed to fetch images: {}", e);
        format!("Failed to fetch images: {}", e)
    })?;

    let json: serde_json::Value = response.json().await.map_err(|e| {
        log_error!("images", "Failed to parse JSON response: {}", e);
        format!("Failed to parse JSON: {}", e)
    })?;

    log_info!("images", "Successfully fetched images data");
    Ok(json)
}
