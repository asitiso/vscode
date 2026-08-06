import { useState } from 'react';
import './PlaceholderArt.css';
import { resolveAssetUrl } from '../data/assetManifest';
import { resolveRewardAssetUrl } from '../data/rewardAssetManifest';

interface PlaceholderArtProps {
  /** assets/ 아래 실제 PNG 파일명(확장자 제외). 매니페스트에 등록된 이름이면 실제 이미지를 렌더링한다. */
  assetName: string;
  emoji?: string;
  label?: string;
  className?: string;
}

/**
 * PNG 에셋(assets/...)이 준비된 항목은 실제 이미지로, 아직 없는 항목은 임시
 * 플레이스홀더(점선 박스 + 이모지)로 표시한다.
 */
export function PlaceholderArt({ assetName, emoji = '🏋️', label, className = '' }: PlaceholderArtProps) {
  const url = resolveAssetUrl(assetName) ?? resolveRewardAssetUrl(assetName);
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={label ?? assetName}
        className={`placeholder-art__img ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div className={`placeholder-art ${className}`} title={`asset: ${assetName}`}>
      <span className="placeholder-art__emoji">{emoji}</span>
      {label && <span className="placeholder-art__label">{label}</span>}
    </div>
  );
}
