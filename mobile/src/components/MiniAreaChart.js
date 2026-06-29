import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Line } from 'react-native-svg';
import { COLORS } from '../constants/theme';

// Petite courbe d'aire en SVG (aucune dépendance de charting).
// data: [{ date, count }] — l'axe X est régulier, l'axe Y normalisé sur le max.
export default function MiniAreaChart({
  data = [],
  height = 140,
  color = COLORS.primary,
  fillColor = 'rgba(201,169,97,0.15)',
}) {
  const [width, setWidth] = useState(0);

  const counts = data.map((d) => d.count || 0);
  const n = counts.length;
  const max = Math.max(1, ...counts);

  let line = '';
  let area = '';
  if (width > 0 && n > 0) {
    const pad = 8;
    const usableH = height - pad * 2;
    const stepX = n > 1 ? width / (n - 1) : 0;
    const points = counts.map((c, i) => {
      const x = n > 1 ? i * stepX : width / 2;
      const y = pad + usableH * (1 - c / max);
      return [x, y];
    });
    line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    area = `${line} L${points[n - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;
  }

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && n > 0 ? (
        <Svg width={width} height={height}>
          <Line x1="0" y1={height * 0.33} x2={width} y2={height * 0.33} stroke={COLORS.border} strokeWidth="0.5" />
          <Line x1="0" y1={height * 0.66} x2={width} y2={height * 0.66} stroke={COLORS.border} strokeWidth="0.5" />
          {area ? <Path d={area} fill={fillColor} /> : null}
          {line ? <Path d={line} fill="none" stroke={color} strokeWidth="2" /> : null}
        </Svg>
      ) : null}
    </View>
  );
}
