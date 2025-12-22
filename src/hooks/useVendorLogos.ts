import { useState, useEffect, useMemo, useCallback } from 'react';
import type { BoardInfo } from '../types';
import { preloadImage } from '../utils';

interface VendorLogoState {
  failedLogos: Set<string>;
  isLoaded: boolean;
}

/**
 * Hook to validate vendor logos by preloading them and tracking failures.
 * Vendors with failed logos (404, network errors, etc.) are grouped under "other".
 */
export function useVendorLogos(boards: BoardInfo[] | null, isActive: boolean) {
  const [state, setState] = useState<VendorLogoState>({
    failedLogos: new Set(),
    isLoaded: false,
  });

  // Reset state when inactive
  useEffect(() => {
    if (!isActive) {
      setState({ failedLogos: new Set(), isLoaded: false });
    }
  }, [isActive]);

  // Preload logos and track failures
  useEffect(() => {
    if (!isActive || !boards?.length || state.isLoaded) return;

    const vendorLogos = new Map<string, string>();
    for (const board of boards) {
      if (board.vendor && board.vendor !== 'other' && board.vendor_logo) {
        vendorLogos.set(board.vendor, board.vendor_logo);
      }
    }

    if (vendorLogos.size === 0) {
      setState({ failedLogos: new Set(), isLoaded: true });
      return;
    }

    let loaded = 0;
    const failed = new Set<string>();

    vendorLogos.forEach((logoUrl, vendorId) => {
      preloadImage(logoUrl).then((success) => {
        if (!success) {
          failed.add(vendorId);
        }
        loaded++;
        if (loaded >= vendorLogos.size) {
          setState({ failedLogos: failed, isLoaded: true });
        }
      });
    });
  }, [isActive, boards, state.isLoaded]);

  // Helper to get effective vendor (considering failed logos)
  const getEffectiveVendor = useCallback((board: BoardInfo): string => {
    if (!board.vendor_logo || state.failedLogos.has(board.vendor)) {
      return 'other';
    }
    return board.vendor || 'other';
  }, [state.failedLogos]);

  // Check if a vendor has a valid logo
  const hasValidLogo = useCallback((board: BoardInfo): boolean => {
    return !!(board.vendor_logo && !state.failedLogos.has(board.vendor));
  }, [state.failedLogos]);

  return {
    failedLogos: state.failedLogos,
    isLoaded: state.isLoaded,
    getEffectiveVendor,
    hasValidLogo,
  };
}

export interface ManufacturerData {
  id: string;
  name: string;
  logo: string | null;
  boardCount: number;
  platinumCount: number;
  standardCount: number;
}

/**
 * Hook to build manufacturer list from boards with validated logos.
 * Boards with failed logos are grouped under "other".
 */
export function useManufacturerList(
  boards: BoardInfo[] | null,
  isActive: boolean,
  searchFilter: string = ''
) {
  const { failedLogos, isLoaded, getEffectiveVendor, hasValidLogo } = useVendorLogos(boards, isActive);

  const manufacturers = useMemo(() => {
    if (!boards || !isLoaded) return [];

    const searchLower = searchFilter.toLowerCase();
    const vendorMap: Record<string, {
      name: string;
      logo: string | null;
      count: number;
      platinumCount: number;
      standardCount: number;
    }> = {};

    // Build vendor map with board counts, platinum board counts, and standard board counts
    for (const board of boards) {
      const validLogo = hasValidLogo(board);
      const vendorId = validLogo ? (board.vendor || 'other') : 'other';
      const vendorName = validLogo ? (board.vendor_name || 'Other') : 'Other';
      const vendorLogo = validLogo ? board.vendor_logo : null;

      if (!vendorMap[vendorId]) {
        vendorMap[vendorId] = {
          name: vendorName,
          logo: vendorLogo,
          count: 0,
          platinumCount: 0,
          standardCount: 0,
        };
      }
      vendorMap[vendorId].count++;

      // Increment platinum count if this board has platinum support
      if (board.has_platinum_support) {
        vendorMap[vendorId].platinumCount++;
      }

      // Increment standard count if this board has standard support
      if (board.has_standard_support) {
        vendorMap[vendorId].standardCount++;
      }
    }

    const result: ManufacturerData[] = Object.entries(vendorMap)
      .filter(([, data]) => {
        if (data.count === 0) return false;
        return data.name.toLowerCase().includes(searchLower);
      })
      .map(([id, data]) => ({
        id,
        name: data.name,
        logo: data.logo,
        boardCount: data.count,
        platinumCount: data.platinumCount,
        standardCount: data.standardCount,
      }))
      .sort((a, b) => {
        // "Other" category always goes to the bottom
        if (a.id === 'other') return 1;
        if (b.id === 'other') return -1;

        // Priority Tier 1: Vendors with MORE than 1 platinum board go to the top
        const aPlatinumPriority = a.platinumCount > 1;
        const bPlatinumPriority = b.platinumCount > 1;

        if (aPlatinumPriority && !bPlatinumPriority) return -1;
        if (!aPlatinumPriority && bPlatinumPriority) return 1;

        // Within Tier 1, sort by platinum count (descending)
        if (aPlatinumPriority && bPlatinumPriority) {
          if (a.platinumCount !== b.platinumCount) {
            return b.platinumCount - a.platinumCount;
          }
          // If platinum counts are equal, sort by total board count (descending)
          return b.boardCount - a.boardCount;
        }

        // Priority Tier 2: Vendors with MORE than 1 standard board (but not in Tier 1)
        const aStandardPriority = a.standardCount > 1;
        const bStandardPriority = b.standardCount > 1;

        if (aStandardPriority && !bStandardPriority) return -1;
        if (!aStandardPriority && bStandardPriority) return 1;

        // Within Tier 2, sort by standard count (descending)
        if (aStandardPriority && bStandardPriority) {
          if (a.standardCount !== b.standardCount) {
            return b.standardCount - a.standardCount;
          }
          // If standard counts are equal, sort by total board count (descending)
          return b.boardCount - a.boardCount;
        }

        // Tier 3: Remaining vendors - sort by total board count (descending)
        return b.boardCount - a.boardCount;
      });

    return result;
  }, [boards, isLoaded, searchFilter, hasValidLogo]);

  return {
    manufacturers,
    isLoaded,
    failedLogos,
    getEffectiveVendor,
  };
}
