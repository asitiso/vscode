import { useState } from 'react';
import './PlaceholderArt.css';
import { resolveAssetUrl } from '../data/assetManifest';

interface PlaceholderArtProps {
  /** assets/ 아래 실제 PNG 파일명(확장자 제외). assetManifest에 등록된 이름이면 실제 이미지를 렌더링한다. */
  assetName: string;
  emoji?: string;
  label?: string;
  className?: string;
}

/**
 * PNG 에셋(assets/...)이 준비된 항목은 실제 이미지로, 아직 없는 항목은 임시
 * 플레이스홀더(점선 박스 + 이모지)로 표시한다. CLAUDE.md 9절 원칙상 CSS로
 * 그림을 직접 그리지 않으므로, 새 PNG가 생기면 assetManifest에 등록하기만
 * 하면 이 컴포넌트가 자동으로 실제 이미지를 사용한다.
 */
export function PlaceholderArt({ assetName, emoji = '🏋️', label, className = '' }: PlaceholderArtProps) {
  const url = resolveAssetUrl(assetName);
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
