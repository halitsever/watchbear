interface BearMarkProps {
  size?: number;
  fur?: string;
  furDark?: string;
  belly?: string;
  play?: string;
  showPlay?: boolean;
}

export function BearMark({
  size = 96,
  fur = '#B97C43',
  furDark = '#9A6230',
  belly = '#F6E2C4',
  play = '#5E3C1E',
  showPlay = true,
}: BearMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <ellipse cx="22" cy="68" rx="10" ry="12" fill={furDark} />
      <ellipse cx="78" cy="68" rx="10" ry="12" fill={furDark} />
      <circle cx="27" cy="26" r="13" fill={furDark} />
      <circle cx="73" cy="26" r="13" fill={furDark} />
      <circle cx="27" cy="26" r="6.2" fill={belly} />
      <circle cx="73" cy="26" r="6.2" fill={belly} />
      <ellipse cx="50" cy="74" rx="29" ry="24" fill={fur} />
      <circle cx="50" cy="76" r="16.5" fill={belly} />
      {showPlay && (
        <g>
          <circle cx="50" cy="76" r="11.5" fill="none" stroke={play} strokeOpacity="0.18" strokeWidth="2" />
          <path d="M45.5 68.5 L45.5 83.5 L58.5 76 Z" fill={play} strokeLinejoin="round" />
        </g>
      )}
      <circle cx="50" cy="40" r="25" fill={fur} />
      <ellipse cx="50" cy="47" rx="11" ry="8.5" fill={belly} />
      <circle cx="41.5" cy="37" r="2.9" fill="#3A2412" />
      <circle cx="58.5" cy="37" r="2.9" fill="#3A2412" />
      <circle cx="42.4" cy="36" r="0.9" fill="#fff" />
      <circle cx="59.4" cy="36" r="0.9" fill="#fff" />
      <ellipse cx="50" cy="43.5" rx="3.1" ry="2.4" fill="#3A2412" />
      <path
        d="M50 46 L50 49 M50 49 C47.5 50.6 45.6 49.3 45.2 47.8 M50 49 C52.5 50.6 54.4 49.3 54.8 47.8"
        stroke="#3A2412"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

interface BearFaceProps {
  size?: number;
  fur?: string;
  furDark?: string;
  belly?: string;
  ring?: string;
}

export function BearFace({ size = 36, fur = '#B97C43', furDark = '#9A6230', belly = '#F6E2C4', ring }: BearFaceProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ display: 'block', borderRadius: '50%' }} aria-hidden="true">
      {ring && <circle cx="24" cy="24" r="23" fill="none" stroke={ring} strokeWidth="2.5" />}
      <circle cx="13" cy="13" r="7.5" fill={furDark} />
      <circle cx="35" cy="13" r="7.5" fill={furDark} />
      <circle cx="13" cy="13" r="3.4" fill={belly} />
      <circle cx="35" cy="13" r="3.4" fill={belly} />
      <circle cx="24" cy="25" r="16.5" fill={fur} />
      <ellipse cx="24" cy="30" rx="7" ry="5.4" fill={belly} />
      <circle cx="18.5" cy="23.5" r="1.9" fill="#3A2412" />
      <circle cx="29.5" cy="23.5" r="1.9" fill="#3A2412" />
      <ellipse cx="24" cy="27.6" rx="2" ry="1.6" fill="#3A2412" />
    </svg>
  );
}
