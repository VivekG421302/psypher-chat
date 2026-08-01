const HAIR_COLOR_HEX = {
  black: '#2A2320',
  brown: '#6B4226',
  blonde: '#E8C468',
  red: '#B5502D',
  gray: '#9CA3AF',
};

const SKIN_HEX = {
  light: '#F2C9A0',
  medium: '#C88F5E',
  dark: '#8B5A34',
};

/**
 * Renders a simple, stylised face built entirely from a character's traits —
 * no external images, so every card is generated procedurally and stays in
 * sync with whatever the trait data says.
 */
export default function CharacterAvatar({ character, size = 56, faded = false }) {
  if (!character) return null;
  const { hairColor, hairLength, wearingHat, wearingGlasses, hasFacialHair, smiling, earrings, skinTone } = character;
  const skin = SKIN_HEX[skinTone] || SKIN_HEX.medium;
  const hair = HAIR_COLOR_HEX[hairColor] || HAIR_COLOR_HEX.brown;
  const bald = hairLength === 'bald';

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={faded ? 'opacity-100' : ''}
      role="img"
      aria-label={character.name}
    >
      {/* Head */}
      <ellipse cx="32" cy="36" rx="15" ry="17" fill={skin} />
      {/* Ears */}
      <circle cx="17.5" cy="37" r="3" fill={skin} />
      <circle cx="46.5" cy="37" r="3" fill={skin} />
      {earrings && (
        <>
          <circle cx="17.5" cy="41" r="1.4" fill="#E8A33D" />
          <circle cx="46.5" cy="41" r="1.4" fill="#E8A33D" />
        </>
      )}

      {/* Long hair falls behind/around the face before the head so it frames it */}
      {!bald && hairLength === 'long' && (
        <path
          d="M17 34 C15 20, 22 10, 32 10 C42 10, 49 20, 47 34 L47 50 C47 50, 44 40, 44 34 C44 24, 38 17, 32 17 C26 17, 20 24, 20 34 C20 40, 17 50, 17 50 Z"
          fill={hair}
        />
      )}

      {/* Hair cap (short/bald base) */}
      {!bald && (
        <path
          d={
            hairLength === 'short'
              ? 'M17 30 C17 16, 47 16, 47 30 C47 24, 42 19, 32 19 C22 19, 17 24, 17 30 Z'
              : 'M17.5 32 C17 18, 22 11, 32 11 C42 11, 47 18, 46.5 32 C46 22, 40 16, 32 16 C24 16, 18 22, 17.5 32 Z'
          }
          fill={hair}
        />
      )}
      {bald && (
        <path d="M18 30 C18 22, 24 18, 32 18 C40 18, 46 22, 46 30" stroke={hair} strokeWidth="1.5" fill="none" opacity="0.35" />
      )}

      {/* Eyes */}
      <circle cx="26" cy="36" r="1.6" fill="#241a12" />
      <circle cx="38" cy="36" r="1.6" fill="#241a12" />

      {/* Mouth */}
      {smiling ? (
        <path d="M26 44 Q32 49 38 44" stroke="#7A3B2E" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      ) : (
        <line x1="27" y1="45" x2="37" y2="45" stroke="#7A3B2E" strokeWidth="1.8" strokeLinecap="round" />
      )}

      {/* Facial hair */}
      {hasFacialHair && (
        <path
          d="M20 40 C20 50, 25 55, 32 55 C39 55, 44 50, 44 40 C44 46, 40 49, 32 49 C24 49, 20 46, 20 40 Z"
          fill={hair}
          opacity="0.85"
        />
      )}

      {/* Glasses */}
      {wearingGlasses && (
        <g stroke="#1A2129" strokeWidth="1.6" fill="rgba(61,217,196,0.08)">
          <rect x="20.5" y="32.5" width="9" height="7" rx="2" />
          <rect x="34.5" y="32.5" width="9" height="7" rx="2" />
          <line x1="29.5" y1="35.5" x2="34.5" y2="35.5" />
          <line x1="20.5" y1="34" x2="16" y2="33" />
          <line x1="43.5" y1="34" x2="48" y2="33" />
        </g>
      )}

      {/* Hat */}
      {wearingHat && (
        <g>
          <rect x="15" y="15" width="34" height="5" rx="2.5" fill="#1A2129" />
          <path d="M20 16 C20 6, 44 6, 44 16 Z" fill="#242D37" />
        </g>
      )}
    </svg>
  );
}
