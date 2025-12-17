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
const CAPTURE_SCALE = 2;
const CANVAS_TO_BLOB_TIMEOUT_MS = 15_000;

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

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(',');
  const mime = meta?.match(/data:(.*?);base64/)?.[1] || 'application/octet-stream';
  const bin = atob(data);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function canvasToPngFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  // Android/старые WebView иногда "вечно" ждут toBlob — ставим таймаут и fallback.
  const toBlob = () =>
    new Promise<Blob | null>((resolve) => {
      if (!canvas.toBlob) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });

  const blob = await Promise.race<Blob | null>([
    toBlob(),
    new Promise<Blob | null>((resolve) =>
      window.setTimeout(() => resolve(null), CANVAS_TO_BLOB_TIMEOUT_MS)
    )
  ]);

  const finalBlob = blob ?? dataUrlToBlob(canvas.toDataURL('image/png'));
  return new File([finalBlob], filename, { type: 'image/png' });
}

export default function ResultScreen({ track, onRestart }: ResultScreenProps) {
  const [phase, setPhase] = useState<'thinking' | 'reveal'>('thinking');
  const [phraseIndex, setPhraseIndex] = useState(() =>
    Math.floor(Math.random() * thinkingPhrases.length)
  );
  const [isSharing, setIsSharing] = useState(false);
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const [preparedUrl, setPreparedUrl] = useState<string | null>(null);
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

  useEffect(() => {
    // Освобождаем blob URL при смене/размонтаже.
    return () => {
      if (preparedUrl) URL.revokeObjectURL(preparedUrl);
    };
  }, [preparedUrl]);

  const prepareShareImage = useCallback(async () => {
    if (!cardRef.current) return;
    const cardEl = cardRef.current;

    setIsPreparingImage(true);
    try {
      const canvas = await html2canvas(cardEl, {
        backgroundColor: '#FFFFFF',
        scale: CAPTURE_SCALE,
        useCORS: true,
        logging: false,
        onclone: (doc) => {
          const cloned = doc.querySelector('.result-card');
          cloned?.classList.add('is-capturing');
          const clonedBtn = cloned?.querySelector('.download-button') as HTMLElement | null;
          if (clonedBtn) clonedBtn.style.display = 'none';
        }
      });

      const file = await canvasToPngFile(canvas, `hogwarts-${track.id}.png`);
      setPreparedFile(file);

      const objectUrl = URL.createObjectURL(file);
      setPreparedUrl(objectUrl);
    } catch (e) {
      console.error('Failed to pre-generate image:', e);
      setPreparedFile(null);
      setPreparedUrl(null);
    } finally {
      setIsPreparingImage(false);
    }
  }, [track.id]);

  useEffect(() => {
    // Важно для Android: готовим картинку заранее, иначе "user gesture"
    // успевает протухнуть и share/download блокируется.
    if (phase !== 'reveal') return;
    setPreparedFile(null);
    setPreparedUrl(null);
    void prepareShareImage();
  }, [phase, prepareShareImage, track.id]);

  const handleShareResult = useCallback(async () => {
    try {
      setIsSharing(true);
      setShareNotice(null);

      const shareText = `Распределяющая Шляпа определила меня в ${track.name}!`;
      const shareTitle = 'Sorting Hat';
      const shareUrl = window.location.href;

      const nav = navigator as Navigator & {
        share?: (data: { title?: string; text?: string; url?: string; files?: File[] }) => Promise<void>;
        canShare?: (data: { files?: File[] }) => boolean;
      };

      // На Android важно не делать долгий await до вызова share/download.
      // Поэтому здесь используем заранее подготовленный файл.
      const file = preparedFile;
      if (!file) {
        setShareNotice(isPreparingImage ? 'Готовлю картинку… попробуй ещё раз через пару секунд.' : 'Готовлю картинку…');
        return;
      }

      // 1) Prefer native share with file (works in many mobile browsers).
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
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
      if (preparedUrl) {
        setShareNotice('В этом браузере не открывается меню “Поделиться”. Нажми “Скачать PNG” ниже и прикрепи файл вручную.');
        return;
      }

      setShareNotice('В этом браузере не открывается меню “Поделиться”.');
    } catch (error) {
      console.error('Failed to generate image:', error);
      setShareNotice('Не получилось подготовить картинку. Попробуй ещё раз.');
    } finally {
      setIsSharing(false);
    }
  }, [isPreparingImage, preparedFile, preparedUrl, track]);

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
              {isSharing ? 'Открываю…' : isPreparingImage ? 'Готовлю картинку…' : 'Поделиться результатом'}
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
          {preparedUrl && (
            <a
              className="action-btn download-link"
              href={preparedUrl}
              download={`hogwarts-${track.id}.png`}
              target="_blank"
              rel="noopener"
            >
              Скачать PNG
            </a>
          )}
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
