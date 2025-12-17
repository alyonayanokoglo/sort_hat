import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import html2canvas from 'html2canvas';
import type { Track } from '../types';
import { thinkingPhrases } from '../data/tracks';
import './ResultScreen.css';

interface ResultScreenProps {
  track: Track;
  onRestart: () => void;
}

const PHRASE_CHANGE_MS = 1200;
const REVEAL_DELAY_MS = 6500;

function hexToRgba(hex: string, alpha: number) {
  const cleaned = hex.replace('#', '').trim();
  const full =
    cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  if (full.length !== 6) return `rgba(37, 99, 235, ${alpha})`;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ResultScreen({ track, onRestart }: ResultScreenProps) {
  const [phase, setPhase] = useState<'thinking' | 'reveal'>('thinking');
  const [phraseIndex, setPhraseIndex] = useState(() =>
    Math.floor(Math.random() * thinkingPhrases.length)
  );
  const [isSharing, setIsSharing] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== 'thinking') return;

    const phraseInterval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % thinkingPhrases.length);
    }, PHRASE_CHANGE_MS);

    const revealTimeout = setTimeout(() => setPhase('reveal'), REVEAL_DELAY_MS);

    return () => {
      clearInterval(phraseInterval);
      clearTimeout(revealTimeout);
    };
  }, [phase]);

  const handleShareResult = useCallback(async () => {
    if (!cardRef.current) return;
    const cardEl = cardRef.current;

    try {
      setIsSharing(true);
      setShareNotice(null);

      const canvas = await html2canvas(cardEl, {
        // Делаем непрозрачный белый фон, чтобы в мессенджерах/галерее
        // не было "серой маски" из-за прозрачности (особенно на скруглениях).
        backgroundColor: '#FFFFFF',
        scale: Math.max(2, window.devicePixelRatio || 2),
        useCORS: true,
        logging: false,
        // Все правки применяем только к DOM-клону, чтобы не мигало в UI.
        onclone: (doc) => {
          const cloned = doc.querySelector('.result-card');
          cloned?.classList.add('is-capturing');
          // Кнопку "поделиться" не включаем в итоговую картинку
          // (иначе на Android может попасть текст "Готовлю картинку...").
          const clonedBtn = cloned?.querySelector('.download-button') as HTMLElement | null;
          if (clonedBtn) clonedBtn.style.display = 'none';
        }
      });

      const shareText = `Распределяющая Шляпа определила меня в ${track.name}!`;
      const shareTitle = 'Sorting Hat';
      const shareUrl = window.location.href;

      const nav = navigator as Navigator & {
        share?: (data: { title?: string; text?: string; url?: string; files?: File[] }) => Promise<void>;
        canShare?: (data: { files?: File[] }) => boolean;
      };

      const file: File | null = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) return resolve(null);
          resolve(new File([blob], `hogwarts-${track.id}.png`, { type: 'image/png' }));
        }, 'image/png');
      });

      // 1) Prefer native share with file (works in many mobile browsers).
      if (file && nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        try {
          await nav.share({
            title: shareTitle,
            text: shareText,
            files: [file]
          });
          return;
        } catch (e) {
          // Если пользователь отменил — ничего не показываем.
          if (e instanceof DOMException && e.name === 'AbortError') return;
          // На некоторых Android/WebView нельзя шарить файлы — попробуем текст/ссылку ниже.
        }
      }

      // 2) Fallback: share text + link (often works in Android WebView where files don't).
      if (nav.share) {
        try {
          await nav.share({
            title: shareTitle,
            text: shareText,
            url: shareUrl
          });
          return;
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
        }
      }

      // 3) Fallback: download/open image.
      // dataURL на Android часто ломается/не скачивается, поэтому предпочтительнее blob URL.
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.download = `hogwarts-${track.id}.png`;
        link.href = objectUrl;
        link.rel = 'noopener';
        link.target = '_blank';
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
        setShareNotice('Не удалось открыть меню “Поделиться”. Картинка открыта/скачана — прикрепи её в чат.');
        return;
      }

      const link = document.createElement('a');
      link.download = `hogwarts-${track.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setShareNotice('Не удалось открыть меню “Поделиться”. Картинка скачана — прикрепи её в чат.');
    } catch (error) {
      console.error('Failed to generate image:', error);
      setShareNotice('Не получилось подготовить картинку. Попробуй ещё раз.');
    } finally {
      setIsSharing(false);
    }
  }, [track]);

  const trackStyleVars: CSSProperties = {
    ['--track-color' as unknown as keyof CSSProperties]: hexToRgba(track.color, 1),
    ['--track-gradient' as unknown as keyof CSSProperties]: track.gradient,
    ['--track-shadow' as unknown as keyof CSSProperties]: hexToRgba(track.color, 0.4)
  };

  return (
    <div className="result-screen">
      {/* Thinking Phase */}
      {phase === 'thinking' && (
        <div className="thinking-card">
          <h2 className="thinking-phrase">{thinkingPhrases[phraseIndex]}</h2>
          <img src="/hat.png" alt="Шляпа думает" className="thinking-hat" />
          <div className="thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      {/* Reveal Phase */}
      {phase === 'reveal' && (
        <div className="result-card" ref={cardRef} style={trackStyleVars}>
          <div className="card-inner">
            <img
              src="/logo2.svg"
              alt="Sorting Hat"
              className="result-card-logo"
            />
            <img src={track.image} alt={track.name} className="result-hat" />
            
            <div className="result-info">
              <h2 className="result-title" style={{ color: track.color }}>
                {track.name}
              </h2>
              
              <div className="result-skills">
                <div className="skill-item">
                  <span
                    className="skill-dot"
                    aria-hidden="true"
                    style={{ ['--skill-dot-color' as unknown as keyof CSSProperties]: track.color }}
                  />
                  {track.description.split('.')[0]}.
                </div>
                <div className="skill-item">
                  <span
                    className="skill-dot"
                    aria-hidden="true"
                    style={{ ['--skill-dot-color' as unknown as keyof CSSProperties]: track.color }}
                  />
                  {track.description.split('.')[1]?.trim() || 'Творить настоящую магию'}.
                </div>
              </div>
            </div>

            <button
              className="download-button"
              onClick={handleShareResult}
              disabled={isSharing}
              style={{ background: track.gradient }}
            >
              {isSharing ? 'Готовлю картинку…' : 'Поделиться результатом'}
            </button>
          </div>
        </div>
      )}

      {/* Actions (visible only in reveal) */}
      {phase === 'reveal' && (
        <div className="result-actions">
          <button className="action-btn" onClick={onRestart}>
            Ещё раз
          </button>
          {shareNotice && (
            <div className="share-notice" role="status">
              {shareNotice}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
