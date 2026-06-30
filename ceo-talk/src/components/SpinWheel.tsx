import { motion } from 'framer-motion';
import type { Participant } from '../types';

const COLORS = [
  '#C68B4C',
  '#6F4E37',
  '#D9A566',
  '#8B5E3C',
  '#E0B97D',
  '#5A3E2B',
  '#CFA06A',
  '#7A5230',
];

/** Titik di lingkaran, sudut diukur searah jarum jam dari atas (jam 12). */
function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

function slicePath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p0 = pointOnCircle(cx, cy, r, a0);
  const p1 = pointOnCircle(cx, cy, r, a1);
  const largeArc = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y} Z`;
}

function truncate(name: string, max = 12) {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

interface Props {
  participants: Participant[]; // yang BELUM dapet jadwal
  rotation: number;
  spinning: boolean;
  onSpinComplete: () => void;
  durationSec: number;
}

export default function SpinWheel({
  participants,
  rotation,
  spinning,
  onSpinComplete,
  durationSec,
}: Props) {
  const n = participants.length;
  const cx = 160;
  const cy = 160;
  const r = 150;
  const seg = n > 0 ? 360 / n : 360;

  return (
    <div className="relative mx-auto" style={{ width: 340, height: 340 }}>
      {/* Pointer di atas, nunjuk ke bawah */}
      <div className="absolute left-1/2 -top-1 z-10 -translate-x-1/2">
        <div
          className="h-0 w-0"
          style={{
            borderLeft: '16px solid transparent',
            borderRight: '16px solid transparent',
            borderTop: '26px solid #3B2A20',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.25))',
          }}
        />
      </div>

      <motion.svg
        viewBox="0 0 320 320"
        width="340"
        height="340"
        animate={{ rotate: rotation }}
        transition={
          spinning
            ? { duration: durationSec, ease: [0.17, 0.67, 0.12, 0.99] }
            : { duration: 0 }
        }
        onAnimationComplete={() => {
          if (spinning) onSpinComplete();
        }}
        style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.2))' }}
      >
        {n === 0 ? (
          <circle cx={cx} cy={cy} r={r} fill="#E8D9C5" />
        ) : n === 1 ? (
          <>
            <circle cx={cx} cy={cy} r={r} fill={COLORS[0]} />
            <text
              x={cx}
              y={cy - r * 0.55}
              textAnchor="middle"
              fill="#fff"
              fontSize="20"
              fontWeight="700"
            >
              {truncate(participants[0].name, 16)}
            </text>
          </>
        ) : (
          participants.map((p, i) => {
            const a0 = i * seg;
            const a1 = (i + 1) * seg;
            const mid = a0 + seg / 2;
            const label = pointOnCircle(cx, cy, r * 0.62, mid);
            // Biar kebaca: kalau di sisi kiri (180–360°) teks dibalik.
            const flip = mid > 180;
            const textRotate = flip ? mid + 180 : mid;
            return (
              <g key={p.id}>
                <path
                  d={slicePath(cx, cy, r, a0, a1)}
                  fill={COLORS[i % COLORS.length]}
                  stroke="#FBF6EE"
                  strokeWidth={2}
                />
                <text
                  x={label.x}
                  y={label.y}
                  fill="#fff"
                  fontSize={n > 14 ? 11 : 14}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotate} ${label.x} ${label.y})`}
                >
                  {truncate(p.name, n > 14 ? 10 : 13)}
                </text>
              </g>
            );
          })
        )}
        {/* Hub tengah */}
        <circle cx={cx} cy={cy} r={20} fill="#FBF6EE" stroke="#3B2A20" strokeWidth={3} />
        <text x={cx} y={cy + 6} textAnchor="middle" fontSize="18">
          ☕
        </text>
      </motion.svg>
    </div>
  );
}
