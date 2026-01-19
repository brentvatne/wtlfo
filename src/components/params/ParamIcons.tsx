import React from 'react';
import { Canvas, Path, Skia, Circle, Line, Group } from '@shopify/react-native-skia';

const SIZE = 18;
const COLOR = '#ff6600';
const STROKE = 1.5;

// SPD - Speedometer arc with needle
export function SpeedIcon() {
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 1;
  const r = SIZE * 0.38;

  const path = Skia.Path.Make();
  // Draw 3/4 arc (from bottom-left to bottom-right, going through top)
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  const steps = 16;

  for (let i = 0; i <= steps; i++) {
    const angle = startAngle + (endAngle - startAngle) * (i / steps);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }

  // Needle pointing to ~2 o'clock position
  const needleAngle = Math.PI * 1.25;
  const needleLen = r * 0.7;

  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Path path={path} color={COLOR} style="stroke" strokeWidth={STROKE} strokeCap="round" />
      <Line
        p1={{ x: cx, y: cy }}
        p2={{ x: cx + Math.cos(needleAngle) * needleLen, y: cy + Math.sin(needleAngle) * needleLen }}
        color={COLOR}
        strokeWidth={STROKE}
        strokeCap="round"
      />
      <Circle cx={cx} cy={cy} r={1.5} color={COLOR} />
    </Canvas>
  );
}

// MULT - Multiplication symbol (×)
export function MultIcon() {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const len = SIZE * 0.25;

  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Line
        p1={{ x: cx - len, y: cy - len }}
        p2={{ x: cx + len, y: cy + len }}
        color={COLOR}
        strokeWidth={STROKE}
        strokeCap="round"
      />
      <Line
        p1={{ x: cx + len, y: cy - len }}
        p2={{ x: cx - len, y: cy + len }}
        color={COLOR}
        strokeWidth={STROKE}
        strokeCap="round"
      />
    </Canvas>
  );
}

// FADE - Tapered line (thick to thin)
export function FadeIcon() {
  const path = Skia.Path.Make();
  const padding = 3;
  const top = padding + 2;
  const bottom = SIZE - padding - 2;

  // Triangle shape that represents fade
  path.moveTo(padding, bottom);
  path.lineTo(SIZE - padding, top);
  path.lineTo(SIZE - padding, bottom);
  path.close();

  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Path path={path} color={COLOR} style="stroke" strokeWidth={STROKE} strokeCap="round" strokeJoin="round" />
    </Canvas>
  );
}

// DEST - Target/bullseye
export function DestIcon() {
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Circle cx={cx} cy={cy} r={SIZE * 0.35} color={COLOR} style="stroke" strokeWidth={STROKE} />
      <Circle cx={cx} cy={cy} r={2} color={COLOR} />
    </Canvas>
  );
}

// WAVE - Single sine wave cycle
export function WaveIcon() {
  const path = Skia.Path.Make();
  const padding = 2;
  const width = SIZE - padding * 2;
  const cy = SIZE / 2;
  const amp = SIZE * 0.3;
  const steps = 16;

  for (let i = 0; i <= steps; i++) {
    const x = padding + (i / steps) * width;
    const y = cy + Math.sin((i / steps) * Math.PI * 2) * amp;
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }

  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Path path={path} color={COLOR} style="stroke" strokeWidth={STROKE} strokeCap="round" strokeJoin="round" />
    </Canvas>
  );
}

// SPH - Circle with starting point marker (clock dial)
export function StartPhaseIcon() {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE * 0.35;

  // Hand pointing to ~10 o'clock (typical start phase position)
  const handAngle = -Math.PI / 2; // 12 o'clock = 0 phase
  const handLen = r * 0.7;

  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Circle cx={cx} cy={cy} r={r} color={COLOR} style="stroke" strokeWidth={STROKE} />
      <Line
        p1={{ x: cx, y: cy }}
        p2={{ x: cx + Math.cos(handAngle) * handLen, y: cy + Math.sin(handAngle) * handLen }}
        color={COLOR}
        strokeWidth={STROKE}
        strokeCap="round"
      />
    </Canvas>
  );
}

// MODE - Play/trigger button (triangle)
export function ModeIcon() {
  const path = Skia.Path.Make();
  const padding = 4;
  const left = padding + 1;
  const right = SIZE - padding - 1;
  const top = padding;
  const bottom = SIZE - padding;
  const cy = SIZE / 2;

  // Play triangle pointing right
  path.moveTo(left, top);
  path.lineTo(right, cy);
  path.lineTo(left, bottom);
  path.close();

  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      <Path path={path} color={COLOR} style="stroke" strokeWidth={STROKE} strokeCap="round" strokeJoin="round" />
    </Canvas>
  );
}

// DEP - Vertical range arrows (up and down)
export function DepthIcon() {
  const cx = SIZE / 2;
  const padding = 3;
  const top = padding;
  const bottom = SIZE - padding;
  const arrowSize = 3;

  return (
    <Canvas style={{ width: SIZE, height: SIZE }}>
      {/* Vertical line */}
      <Line
        p1={{ x: cx, y: top + arrowSize }}
        p2={{ x: cx, y: bottom - arrowSize }}
        color={COLOR}
        strokeWidth={STROKE}
        strokeCap="round"
      />
      {/* Top arrow */}
      <Group>
        <Line
          p1={{ x: cx - arrowSize, y: top + arrowSize }}
          p2={{ x: cx, y: top }}
          color={COLOR}
          strokeWidth={STROKE}
          strokeCap="round"
        />
        <Line
          p1={{ x: cx + arrowSize, y: top + arrowSize }}
          p2={{ x: cx, y: top }}
          color={COLOR}
          strokeWidth={STROKE}
          strokeCap="round"
        />
      </Group>
      {/* Bottom arrow */}
      <Group>
        <Line
          p1={{ x: cx - arrowSize, y: bottom - arrowSize }}
          p2={{ x: cx, y: bottom }}
          color={COLOR}
          strokeWidth={STROKE}
          strokeCap="round"
        />
        <Line
          p1={{ x: cx + arrowSize, y: bottom - arrowSize }}
          p2={{ x: cx, y: bottom }}
          color={COLOR}
          strokeWidth={STROKE}
          strokeCap="round"
        />
      </Group>
    </Canvas>
  );
}

// Map param keys to icons
export const PARAM_ICONS: Record<string, React.FC> = {
  speed: SpeedIcon,
  multiplier: MultIcon,
  fade: FadeIcon,
  destination: DestIcon,
  waveform: WaveIcon,
  startPhase: StartPhaseIcon,
  mode: ModeIcon,
  depth: DepthIcon,
};
