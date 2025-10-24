import React from 'react';

interface KatipLogoProps {
  className?: string;
  width?: number;
  height?: number;
  isDarkMode?: boolean;
}

export default function KatipLogo({ className = '', width = 140, height = 50, isDarkMode = false }: KatipLogoProps) {
  const textColor = isDarkMode ? '#e2e8f0' : '#1e3a5f';
  
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 140 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Shadow/glow effect */}
      <filter id="dropshadow">
        <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
        <feOffset dx="0" dy="2" result="offsetblur"/>
        <feFlood floodColor="#000000" floodOpacity="0.1"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>

      {/* Text styling similar to the image */}
      <text
        x="70"
        y="35"
        fontFamily="Georgia, serif"
        fontSize="36"
        fontWeight="400"
        textAnchor="middle"
        fill={textColor}
        filter="url(#dropshadow)"
      >
        Kâtip
      </text>

      {/* Circumflex accent on 'a' - removing separate accent as it's included in the text above */}
    </svg>
  );
}

// Alternative modern version with custom font style
export function KatipLogoModern({ className = '', width = 180, height = 60, isDarkMode = false }: KatipLogoProps) {
  const textColor = isDarkMode ? '#e2e8f0' : '#1e3a5f';
  
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          fontFamily: 'Georgia, Times New Roman, serif',
          fontSize: '42px',
          fontStyle: 'italic',
          color: textColor,
          letterSpacing: '0.02em',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        <span style={{ position: 'relative' }}>
          K
          <span style={{ position: 'relative' }}>
            â
          </span>
          tip
        </span>
      </div>
    </div>
  );
}