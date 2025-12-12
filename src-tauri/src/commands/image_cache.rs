//! Board image caching module
//!
//! Provides local caching of board images from cache.armbian.com.
//! Images are downloaded on app startup and cached locally with ETag tracking
//! to only re-download when images change.

use crate::config;
use crate::utils::{create_short_timeout_client, get_cache_dir};
use crate::{log_error, log_info, log_warn};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tokio::sync::mpsc;

/// Cache metadata for tracking image versions
#[derive(Debug, Clone, Serialize, Deserialize)]
struct CacheEntry {
    /// ETag from server for change detection
    etag: Option<String>,
    /// Last-Modified header from server
    last_modified: Option<String>,
    /// Local file path
    file_path: String,
    /// Unix timestamp when cached
    cached_at: i64,
}

/// Cache metadata storage
#[derive(Debug, Default, Serialize, Deserialize)]
struct CacheMetadata {
    entries: HashMap<String, CacheEntry>,
}

/// Global cache state
struct ImageCache {
    metadata: CacheMetadata,
    cache_dir: PathBuf,
    metadata_path: PathBuf,
}

impl ImageCache {
    fn new() -> Self {
        let cache_dir = get_cache_dir(config::app::NAME).join("board_images");
        let metadata_path = cache_dir.join("cache_metadata.json");

        // Ensure cache directory exists
        if let Err(e) = fs::create_dir_all(&cache_dir) {
            log_error!("image_cache", "Failed to create cache directory: {}", e);
        }

        // Load existing metadata
        let metadata = Self::load_metadata(&metadata_path);

        Self {
            metadata,
            cache_dir,
            metadata_path,
        }
    }

    fn load_metadata(path: &PathBuf) -> CacheMetadata {
        if path.exists() {
            match fs::read_to_string(path) {
                Ok(content) => match serde_json::from_str(&content) {
                    Ok(meta) => {
                        return meta;
                    }
                    Err(e) => {
                        log_warn!("image_cache", "Failed to parse cache metadata: {}", e);
                    }
                },
                Err(e) => {
                    log_warn!("image_cache", "Failed to read cache metadata: {}", e);
                }
            }
        }
        CacheMetadata::default()
    }

    fn save_metadata(&self) {
        match serde_json::to_string_pretty(&self.metadata) {
            Ok(content) => {
                if let Err(e) = fs::write(&self.metadata_path, content) {
                    log_error!("image_cache", "Failed to save cache metadata: {}", e);
                }
            }
            Err(e) => {
                log_error!("image_cache", "Failed to serialize cache metadata: {}", e);
            }
        }
    }

    fn get_cached_path(&self, board_slug: &str) -> PathBuf {
        self.cache_dir.join(format!("{}.png", board_slug))
    }

    fn get_entry(&self, board_slug: &str) -> Option<&CacheEntry> {
        self.metadata.entries.get(board_slug)
    }

    fn set_entry(&mut self, board_slug: String, entry: CacheEntry) {
        self.metadata.entries.insert(board_slug, entry);
        self.save_metadata();
    }

    fn get_cache_dir(&self) -> &PathBuf {
        &self.cache_dir
    }
}

/// Global cache instance
static IMAGE_CACHE: Lazy<Mutex<ImageCache>> = Lazy::new(|| Mutex::new(ImageCache::new()));

/// Cache expiry time in seconds (7 days)
const CACHE_EXPIRY_SECS: i64 = 7 * 24 * 60 * 60;

/// Get the local path for a cached board image
/// Returns None if image is not cached or cache is expired
pub fn get_cached_image_path(board_slug: &str) -> Option<PathBuf> {
    let cache = IMAGE_CACHE.lock().ok()?;
    let entry = cache.get_entry(board_slug)?;
    let path = cache.get_cached_path(board_slug);

    // Check if file exists
    if !path.exists() {
        return None;
    }

    // Check if cache is expired
    let now = chrono::Utc::now().timestamp();
    if now - entry.cached_at > CACHE_EXPIRY_SECS {
        return None;
    }

    Some(path)
}

/// Download and cache a board image
/// Returns the local path on success
pub async fn cache_board_image(board_slug: &str) -> Result<PathBuf, String> {
    let url = format!(
        "{}{}/{}.png",
        config::urls::BOARD_IMAGES_BASE,
        config::urls::BOARD_IMAGE_SIZE,
        board_slug
    );

    let client = create_short_timeout_client()?;

    // Get existing cache entry for conditional request
    let (existing_etag, existing_last_modified) = {
        let cache = IMAGE_CACHE.lock().map_err(|e| e.to_string())?;
        let entry = cache.get_entry(board_slug);
        (
            entry.and_then(|e| e.etag.clone()),
            entry.and_then(|e| e.last_modified.clone()),
        )
    };

    // Build request with conditional headers
    let mut request = client.get(&url);
    if let Some(etag) = &existing_etag {
        request = request.header("If-None-Match", etag);
    }
    if let Some(last_mod) = &existing_last_modified {
        request = request.header("If-Modified-Since", last_mod);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to fetch image: {}", e))?;

    let cache_path = {
        let cache = IMAGE_CACHE.lock().map_err(|e| e.to_string())?;
        cache.get_cached_path(board_slug)
    };

    // Handle 304 Not Modified - cache is still valid
    if response.status() == reqwest::StatusCode::NOT_MODIFIED {
        // Update cached_at timestamp
        let mut cache = IMAGE_CACHE.lock().map_err(|e| e.to_string())?;
        if let Some(entry) = cache.metadata.entries.get_mut(board_slug) {
            entry.cached_at = chrono::Utc::now().timestamp();
            cache.save_metadata();
        }
        return Ok(cache_path);
    }

    // Handle 404 - image doesn't exist
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(format!("Image not found: {}", board_slug));
    }

    // Handle other errors
    if !response.status().is_success() {
        return Err(format!(
            "Failed to fetch image: HTTP {}",
            response.status()
        ));
    }

    // Extract headers for caching
    let etag = response
        .headers()
        .get("etag")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let last_modified = response
        .headers()
        .get("last-modified")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // Download image content
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read image data: {}", e))?;

    // Save to cache
    fs::write(&cache_path, &bytes).map_err(|e| format!("Failed to save image: {}", e))?;

    // Update cache metadata
    {
        let mut cache = IMAGE_CACHE.lock().map_err(|e| e.to_string())?;
        cache.set_entry(
            board_slug.to_string(),
            CacheEntry {
                etag,
                last_modified,
                file_path: cache_path.to_string_lossy().to_string(),
                cached_at: chrono::Utc::now().timestamp(),
            },
        );
    }

    Ok(cache_path)
}

/// Prefetch images for a list of board slugs
/// Runs in background and returns immediately
pub fn prefetch_board_images(board_slugs: Vec<String>) {
    let (tx, mut rx) = mpsc::channel::<String>(100);

    // Spawn task to process results
    tokio::spawn(async move {
        let mut success_count = 0;
        let mut skip_count = 0;
        let mut error_count = 0;

        while let Some(result) = rx.recv().await {
            if result.starts_with("OK:") {
                success_count += 1;
            } else if result.starts_with("SKIP:") {
                skip_count += 1;
            } else {
                error_count += 1;
            }
        }

        log_info!(
            "image_cache",
            "Prefetch complete: {} downloaded, {} cached, {} errors",
            success_count,
            skip_count,
            error_count
        );
    });

    // Spawn tasks for each image
    for slug in board_slugs {
        let tx = tx.clone();
        tokio::spawn(async move {
            // Check if already cached and not expired
            if get_cached_image_path(&slug).is_some() {
                let _ = tx.send(format!("SKIP:{}", slug)).await;
                return;
            }

            match cache_board_image(&slug).await {
                Ok(_) => {
                    let _ = tx.send(format!("OK:{}", slug)).await;
                }
                Err(_) => {
                    let _ = tx.send(format!("ERR:{}", slug)).await;
                }
            }
        });
    }
}

/// Get cache statistics
pub fn get_cache_stats() -> (usize, u64) {
    let cache = match IMAGE_CACHE.lock() {
        Ok(c) => c,
        Err(_) => return (0, 0),
    };

    let count = cache.metadata.entries.len();
    let size: u64 = fs::read_dir(cache.get_cache_dir())
        .map(|entries| {
            entries
                .filter_map(|e| e.ok())
                .filter_map(|e| e.metadata().ok())
                .filter(|m| m.is_file())
                .map(|m| m.len())
                .sum()
        })
        .unwrap_or(0);

    (count, size)
}

/// Clear the entire image cache
#[allow(dead_code)]
pub fn clear_cache() -> Result<(), String> {
    let mut cache = IMAGE_CACHE.lock().map_err(|e| e.to_string())?;

    // Remove all cached files
    if let Ok(entries) = fs::read_dir(cache.get_cache_dir()) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().map_or(false, |e| e == "png") {
                let _ = fs::remove_file(path);
            }
        }
    }

    // Clear metadata
    cache.metadata.entries.clear();
    cache.save_metadata();

    log_info!("image_cache", "Cache cleared");
    Ok(())
}

/// Initialize cache on app startup
pub fn init_cache() {
    log_info!("image_cache", "Initializing board image cache");

    let (count, size) = get_cache_stats();
    log_info!(
        "image_cache",
        "Cache contains {} images ({} bytes)",
        count,
        size
    );
}
