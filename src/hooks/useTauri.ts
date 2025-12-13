import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { BoardInfo, ImageInfo, BlockDevice, DownloadProgress, FlashProgress, CustomImageInfo } from '../types';

export async function getBoards(): Promise<BoardInfo[]> {
  return invoke('get_boards');
}

export async function getImagesForBoard(
  boardSlug: string,
  preappFilter?: string,
  kernelFilter?: string,
  variantFilter?: string,
  stableOnly: boolean = false
): Promise<ImageInfo[]> {
  return invoke('get_images_for_board', {
    boardSlug,
    preappFilter,
    kernelFilter,
    variantFilter,
    stableOnly,
  });
}

export async function getBoardImageUrl(boardSlug: string): Promise<string | null> {
  const path: string | null = await invoke('get_board_image_url', { boardSlug });
  if (path) {
    // Convert local file path to asset URL that webview can load
    return convertFileSrc(path);
  }
  return null;
}

export async function getBlockDevices(): Promise<BlockDevice[]> {
  return invoke('get_block_devices');
}

export async function requestWriteAuthorization(devicePath: string): Promise<boolean> {
  return invoke('request_write_authorization', { devicePath });
}

export async function downloadImage(fileUrl: string): Promise<string> {
  return invoke('download_image', { fileUrl });
}

export async function getDownloadProgress(): Promise<DownloadProgress> {
  return invoke('get_download_progress');
}

export async function flashImage(
  imagePath: string,
  devicePath: string,
  verify: boolean = true
): Promise<void> {
  return invoke('flash_image', { imagePath, devicePath, verify });
}

export async function getFlashProgress(): Promise<FlashProgress> {
  return invoke('get_flash_progress');
}

export async function cancelOperation(): Promise<void> {
  return invoke('cancel_operation');
}

export async function deleteDownloadedImage(imagePath: string): Promise<void> {
  return invoke('delete_downloaded_image', { imagePath });
}

// Re-export CustomImageInfo for backward compatibility
export type { CustomImageInfo } from '../types';

export async function selectCustomImage(): Promise<CustomImageInfo | null> {
  return invoke('select_custom_image');
}

export async function checkNeedsDecompression(imagePath: string): Promise<boolean> {
  return invoke('check_needs_decompression', { imagePath });
}

export async function decompressCustomImage(imagePath: string): Promise<string> {
  return invoke('decompress_custom_image', { imagePath });
}

export async function startImagePrefetch(boardSlugs: string[]): Promise<void> {
  return invoke('start_image_prefetch', { boardSlugs });
}
