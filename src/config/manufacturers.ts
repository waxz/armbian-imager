/**
 * Manufacturer definitions for board categorization
 */

export interface ManufacturerConfig {
  name: string;
  color: string;
  keywords: string[];
}

export const MANUFACTURERS: Record<string, ManufacturerConfig> = {
  'radxa': { name: 'Radxa', color: '#8b5cf6', keywords: ['radxa', 'rock-', 'rock5', 'rock3', 'rock4', 'rockpi'] },
  'orangepi': { name: 'Orange Pi', color: '#f97316', keywords: ['orangepi', 'orange-pi'] },
  'bananapi': { name: 'Banana Pi', color: '#f59e0b', keywords: ['bananapi', 'bpi-'] },
  'khadas': { name: 'Khadas', color: '#10b981', keywords: ['khadas', 'vim1', 'vim2', 'vim3', 'vim4', 'edge'] },
  'hardkernel': { name: 'Hardkernel (ODROID)', color: '#3b82f6', keywords: ['odroid'] },
  'pine64': { name: 'Pine64', color: '#06b6d4', keywords: ['pine64', 'pinebook', 'pinephone', 'rock64', 'quartz64', 'sopine', 'pinetab', 'star64', 'ox64'] },
  'friendlyarm': { name: 'FriendlyElec', color: '#ec4899', keywords: ['nanopi', 'nanopc', 'friendlyelec', 'zeropi'] },
  'olimex': { name: 'Olimex', color: '#84cc16', keywords: ['olimex', 'lime', 'olinuxino'] },
  'armsom': { name: 'ArmSoM', color: '#0ea5e9', keywords: ['armsom'] },
  'libre': { name: 'Libre Computer', color: '#22c55e', keywords: ['lepotato', 'lafrite', 'libre', 'tritium', 'renegade', 'solitude', 'sweet-potato', 'libretech', 'potato', 'frite'] },
  'asus': { name: 'ASUS Tinker', color: '#00529b', keywords: ['asus', 'tinker'] },
  'nvidia': { name: 'NVIDIA Jetson', color: '#76b900', keywords: ['jetson', 'nvidia', 'tegra'] },
  'beagle': { name: 'BeagleBoard', color: '#2e8b57', keywords: ['beagle', 'bone', 'pocketbeagle'] },
  'solidrun': { name: 'SolidRun', color: '#dc2626', keywords: ['solidrun', 'hummingboard', 'cubox', 'clearfog', 'honeycomb', 'lx2k'] },
  'firefly': { name: 'Firefly', color: '#ff6600', keywords: ['firefly', 'roc-rk'] },
  'starfive': { name: 'StarFive', color: '#7c3aed', keywords: ['starfive', 'visionfive', 'jh71'] },
  'sipeed': { name: 'Sipeed', color: '#ea580c', keywords: ['sipeed', 'lichee', 'tang', 'maix'] },
  'milkv': { name: 'Milk-V', color: '#be185d', keywords: ['milkv', 'milk-v', 'mars', 'duo', 'pioneer'] },
  'amlogic': { name: 'Amlogic TV Boxes', color: '#a855f7', keywords: ['aml-', 'wetek', 'ugoos', 'beelink', 'tanix', 'tx6', 'phicomm', 'n1', 'x96', 't95', 'h96', 'mecool'] },
  'rockchip': { name: 'Rockchip Generic', color: '#6366f1', keywords: ['rk3', 'station-m', 'station-p', 'miqi'] },
  'allwinner': { name: 'Allwinner Generic', color: '#14b8a6', keywords: ['cubieboard', 'cubietruck', 'lamobo', 'pcduino', 'banana-pro', 'sunxi', 'a10', 'a20', 'h3', 'h5', 'h6', 'a64', 'h616'] },
  'marvell': { name: 'Marvell', color: '#2563eb', keywords: ['espressobin', 'marvell', 'macchiatobin', 'globalscale'] },
  'helios': { name: 'Kobol/Helios', color: '#0891b2', keywords: ['helios', 'kobol'] },
  'mediatek': { name: 'MediaTek', color: '#ffc107', keywords: ['mediatek', 'mt7', 'mt8'] },
  'bigtreetech': { name: 'BigTreeTech', color: '#16a34a', keywords: ['bigtreetech', 'btt', 'cb1', 'cb2'] },
  'hinlink': { name: 'Hinlink', color: '#0891b2', keywords: ['hinlink', 'h28k', 'h66k', 'h68k', 'h88k'] },
  'embedfire': { name: 'EmbedFire', color: '#dc2626', keywords: ['embedfire', 'lubancat', 'wildfire'] },
  'mixtile': { name: 'Mixtile', color: '#0284c7', keywords: ['mixtile', 'blade'] },
  'cool-pi': { name: 'Cool Pi', color: '#0ea5e9', keywords: ['coolpi', 'cool-pi'] },
  'uefi': { name: 'UEFI/Generic', color: '#64748b', keywords: ['uefi', 'generic', 'uefi-arm64', 'uefi-x86'] },
  'other': { name: 'Other Boards', color: '#64748b', keywords: [] },
};

/**
 * Get manufacturer ID from board slug and name
 */
export function getManufacturer(slug: string, name: string): string {
  const searchStr = (slug + ' ' + name).toLowerCase();
  for (const [key, config] of Object.entries(MANUFACTURERS)) {
    if (key === 'other') continue;
    if (config.keywords.some(kw => searchStr.includes(kw))) {
      return key;
    }
  }
  return 'other';
}
