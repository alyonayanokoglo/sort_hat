import { useEffect, useState } from 'react';
import './CuteHat.css';

interface CuteHatProps {
  isThinking?: boolean;
  color?: string;
}

export default function CuteHat({ isThinking = false, color = '#4A9FE8' }: CuteHatProps) {
  const [eyeState, setEyeState] = useState<'open' | 'blink' | 'happy'>('open');

  useEffect(() => {
    if (!isThinking) return;

    // Моргание во время размышления
    const blinkInterval = setInterval(() => {
      setEyeState('blink');
      setTimeout(() => setEyeState('open'), 150);
    }, 2000);

    return () => clearInterval(blinkInterval);
  }, [isThinking]);

  const effectiveEyeState: 'open' | 'blink' | 'happy' = isThinking ? eyeState : 'happy';

  return (
    <div className={`cute-hat ${isThinking ? 'thinking' : 'reveal'}`}>
      <svg viewBox="0 0 200 200" className="hat-svg">
        {/* Тень */}
        <ellipse cx="100" cy="175" rx="70" ry="15" fill="rgba(0,0,0,0.1)" />
        
        {/* Поля шляпы */}
        <ellipse cx="100" cy="150" rx="80" ry="20" fill={color} />
        
        {/* Тулья */}
        <path
          d="M 45 150 Q 45 100 60 70 L 100 15 L 140 70 Q 155 100 155 150 Z"
          fill={color}
        />
        
        {/* Складка/загиб */}
        <path
          d="M 100 15 Q 120 25 130 10 Q 125 30 100 25"
          fill={color}
          opacity="0.8"
        />
        
        {/* Блик */}
        <path
          d="M 65 80 Q 70 60 85 55"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Лицо */}
        <g className="hat-face">
          {/* Глаза */}
          {effectiveEyeState === 'blink' ? (
            <>
              <path d="M 70 115 Q 80 110 90 115" stroke="white" strokeWidth="3" fill="none" />
              <path d="M 110 115 Q 120 110 130 115" stroke="white" strokeWidth="3" fill="none" />
            </>
          ) : effectiveEyeState === 'happy' ? (
            <>
              <path d="M 70 115 Q 80 105 90 115" stroke="white" strokeWidth="3" fill="none" />
              <path d="M 110 115 Q 120 105 130 115" stroke="white" strokeWidth="3" fill="none" />
            </>
          ) : (
            <>
              <ellipse cx="80" cy="110" rx="8" ry="10" fill="white" />
              <ellipse cx="80" cy="112" rx="4" ry="5" fill="#1a365d" />
              <ellipse cx="120" cy="110" rx="8" ry="10" fill="white" />
              <ellipse cx="120" cy="112" rx="4" ry="5" fill="#1a365d" />
            </>
          )}
          
          {/* Рот */}
          <path
            d={isThinking ? "M 85 135 Q 100 140 115 135" : "M 80 130 Q 100 150 120 130"}
            stroke="white"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            className="hat-mouth"
          />
        </g>
      </svg>
    </div>
  );
}

