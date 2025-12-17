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
      // html2canvas иногда странно рендерит SVG-подложку и CSS-переменные,
      // из-за чего картинка получается "синей". На время снимка отключаем подложку.
      cardEl.classList.add('is-capturing');
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const canvas = await html2canvas(cardEl, {
        backgroundColor: '#1C1C1C',
        scale: Math.max(2, window.devicePixelRatio || 2),
        useCORS: true,
        logging: false
      });

      const shareText = `Распределяющая Шляпа определила меня в ${track.name}!`;

      const nav = navigator as Navigator & {
        share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
        canShare?: (data: { files?: File[] }) => boolean;
      };

      const file: File | null = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) return resolve(null);
          resolve(new File([blob], `hogwarts-${track.id}.png`, { type: 'image/png' }));
        }, 'image/png');
      });

      if (file && nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({
          text: shareText,
          files: [file]
        });
        return;
      }

      // Fallback: download image
      const link = document.createElement('a');
      link.download = `hogwarts-${track.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      cardEl.classList.remove('is-capturing');
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
              style={{ background: track.gradient }}
            >
              Поделиться результатом
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
        </div>
      )}
    </div>
  );
}
