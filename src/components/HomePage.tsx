import { Factory, Cpu, Database, HardDrive, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BoardInfo, ImageInfo, BlockDevice } from '../types';
import type { Manufacturer } from './ManufacturerModal';

interface HomePageProps {
  selectedManufacturer: Manufacturer | null;
  selectedBoard: BoardInfo | null;
  selectedImage: ImageInfo | null;
  selectedDevice: BlockDevice | null;
  onChooseManufacturer: () => void;
  onChooseBoard: () => void;
  onChooseImage: () => void;
  onChooseDevice: () => void;
  onChooseCustomImage: () => void;
}

export function HomePage({
  selectedManufacturer,
  selectedBoard,
  selectedImage,
  selectedDevice,
  onChooseManufacturer,
  onChooseBoard,
  onChooseImage,
  onChooseDevice,
  onChooseCustomImage,
}: HomePageProps) {
  const { t } = useTranslation();
  const isCustomImage = selectedImage?.is_custom;

  return (
    <div className="home-page">
      <div className="home-buttons-inline">
        <div className="home-button-group">
          <span className="home-button-label">{t('home.manufacturer')}</span>
          <button
            className={`home-button ${selectedManufacturer ? 'selected' : ''}`}
            onClick={onChooseManufacturer}
          >
            <Factory size={28} />
            {selectedManufacturer ? (
              <span className="home-button-text-multi">
                <span className="home-button-title">{selectedManufacturer.name}</span>
                <span className="home-button-subtitle">&nbsp;</span>
              </span>
            ) : (
              <span className="home-button-text">{t('home.chooseBrand')}</span>
            )}
          </button>
        </div>

        <div className="home-button-group">
          <span className="home-button-label">{t('home.board')}</span>
          <button
            className={`home-button ${selectedBoard ? 'selected' : ''}`}
            onClick={onChooseBoard}
            disabled={!selectedManufacturer || isCustomImage}
          >
            <Cpu size={28} />
            {selectedBoard ? (
              <span className="home-button-text-multi">
                <span className="home-button-title">{selectedBoard.name}</span>
                <span className="home-button-subtitle">{selectedBoard.image_count} {t('home.images')}</span>
              </span>
            ) : (
              <span className="home-button-text">{t('home.chooseBoard')}</span>
            )}
          </button>
        </div>

        <div className="home-button-group">
          <span className="home-button-label">{t('home.operatingSystem')}</span>
          <button
            className={`home-button ${selectedImage ? 'selected' : ''}`}
            onClick={onChooseImage}
            disabled={!selectedBoard || isCustomImage}
          >
            <Database size={28} />
            {selectedImage ? (
              <span className="home-button-text-multi">
                <span className="home-button-title">
                  {selectedImage.preinstalled_application || selectedImage.image_variant}
                </span>
                <span className="home-button-subtitle">
                  {selectedImage.distro_release} · {selectedImage.kernel_branch}
                </span>
              </span>
            ) : (
              <span className="home-button-text">{t('home.chooseOs')}</span>
            )}
          </button>
        </div>

        <div className="home-button-group">
          <span className="home-button-label">{t('home.storage')}</span>
          <button
            className={`home-button ${selectedDevice ? 'selected' : ''}`}
            onClick={onChooseDevice}
            disabled={!selectedImage}
          >
            <HardDrive size={28} />
            {selectedDevice ? (
              <span className="home-button-text-multi">
                <span className="home-button-title">{selectedDevice.name}</span>
                <span className="home-button-subtitle">{selectedDevice.size_formatted}</span>
              </span>
            ) : (
              <span className="home-button-text">{t('home.chooseStorage')}</span>
            )}
          </button>
        </div>
      </div>

      <div className="home-custom-section">
        <button
          className="home-custom-button"
          onClick={onChooseCustomImage}
        >
          <FolderOpen size={16} />
          {isCustomImage ? t('home.changeCustomImage') : t('home.useCustomImage')}
        </button>
      </div>
    </div>
  );
}
