import React from 'react';
import { getCertification, type CertificationSlug } from '../../constants/certifications';
import { useTheme } from '../../context/ThemeContext';
import logoDark from '../../puurge_img/logo_dark.png';

/** Same dark-theme mark as PuurgaLogo (header) */
const LOGO_DARK_THEME =
  'https://vhvxfnxtyrgiydztsonz.supabase.co/storage/v1/object/public/Logos/5dLight.png';

interface CertificationBadgesProps {
  /** Premium colored check: blue | gold | business | elite */
  certificationSlug?: string | null;
  /** Official Puurga logo next to the name */
  logoCertified?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Classic X/Twitter verified seal — zigzag / scalloped edge + check.
 * viewBox 0 0 24 24
 */
const ZIGZAG_SEAL =
  'M22.25 12c0 1.43-.88 2.67-2.19 3.34.46 1.39.2 2.9-.81 3.91s-2.51 1.27-3.91.81c-.66 1.31-1.91 2.19-3.34 2.19s-2.67-.88-3.33-2.19c-1.4.46-2.91.2-3.92-.81s-1.27-2.52-.8-3.91c-1.31-.67-2.2-1.91-2.2-3.34s.89-2.67 2.2-3.34c-.46-1.39-.21-2.9.8-3.91s2.52-1.26 3.91-.81c.67-1.31 1.91-2.19 3.34-2.19s2.68.88 3.34 2.19c1.39-.45 2.9-.2 3.91.81s1.27 2.52.81 3.91c1.31.67 2.19 1.91 2.19 3.34z';

const CHECK_MARK =
  'M10.75 16.67 17.42 10l-1.41-1.41-5.26 5.26-2.56-2.57-1.41 1.42 3.97 3.97z';

/** Colored zigzag seal with white check */
const VerifiedZigzagBadge: React.FC<{ color: string; size: number; title: string }> = ({
  color,
  size,
  title,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
    aria-label={title}
    role="img"
  >
    <title>{title}</title>
    <path fill={color} d={ZIGZAG_SEAL} />
    <path fill="#fff" d={CHECK_MARK} />
  </svg>
);

/**
 * Puurga Official — rounded square beside the name.
 * Dark theme → white logo; light theme → black logo.
 */
const OfficialLogoBadge: React.FC<{ size: number }> = ({ size }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const radius = Math.max(4, Math.round(size * 0.22));
  const logoPx = Math.max(10, Math.round(size * 0.72));
  const src = isDark ? LOGO_DARK_THEME : logoDark;

  return (
    <span
      className="inline-flex items-center justify-center shrink-0 border"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderColor: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)',
        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      }}
      title="Puurga Official"
      aria-label="Puurga Official"
    >
      <img
        src={src}
        alt="Puurga Official"
        width={logoPx}
        height={logoPx}
        className="object-contain block"
        style={{ width: logoPx, height: logoPx }}
        draggable={false}
      />
    </span>
  );
};

/**
 * Renders stacked badges: optional Puurga logo + optional premium check.
 */
const CertificationBadges: React.FC<CertificationBadgesProps> = ({
  certificationSlug,
  logoCertified = false,
  size = 'sm',
  className = '',
}) => {
  const cert = getCertification(certificationSlug);
  const isCheck =
    cert &&
    cert.kind === 'check' &&
    (['blue', 'gold', 'business', 'elite'] as CertificationSlug[]).includes(
      cert.slug as CertificationSlug
    );

  const showLogo = Boolean(logoCertified) || cert?.kind === 'logo';
  const showCheck = Boolean(isCheck);

  if (!showLogo && !showCheck) return null;

  const px = size === 'md' ? 20 : 16;

  return (
    <span className={`inline-flex items-center gap-1 shrink-0 align-middle ${className}`}>
      {showLogo && <OfficialLogoBadge size={px} />}
      {showCheck && cert && (
        <VerifiedZigzagBadge color={cert.color} size={px} title={cert.title} />
      )}
    </span>
  );
};

export default CertificationBadges;
