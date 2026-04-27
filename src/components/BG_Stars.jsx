import { useMemo } from 'react';
import '../Stars.css';

const generateBoxShadows = (n, color) => {
  let shadows = [];
  for (let i = 0; i < n; i++) {
    const x = Math.floor(Math.random() * 2000);
    const y = Math.floor(Math.random() * 2000);
    shadows.push(`${x}px ${y}px ${color}`);
  }
  return shadows.join(", ");
};

const StarBackground = () => {
  // Memoize the box-shadows positions to prevent regeneration on every render
  // Light mode colors (dark gray with lower opacity)
  const shadowsSmallLight = useMemo(() => generateBoxShadows(700, 'rgba(31, 41, 55, 0.6)'), []);
  const shadowsMediumLight = useMemo(() => generateBoxShadows(200, 'rgba(31, 41, 55, 0.5)'), []);
  const shadowsBigLight = useMemo(() => generateBoxShadows(100, 'rgba(31, 41, 55, 0.4)'), []);

  // Dark mode colors (light gray with higher opacity)
  const shadowsSmallDark = useMemo(() => generateBoxShadows(700, 'rgba(243, 244, 246, 0.8)'), []);
  const shadowsMediumDark = useMemo(() => generateBoxShadows(200, 'rgba(243, 244, 246, 0.7)'), []);
  const shadowsBigDark = useMemo(() => generateBoxShadows(100, 'rgba(243, 244, 246, 0.9)'), []);

  return (
    <>
      {/* Light mode stars - shown in light mode, hidden in dark mode */}
      <div id="stars-light" className="star-layer block dark:hidden" style={{ boxShadow: shadowsSmallLight }} />
      <div id="stars2-light" className="star-layer block dark:hidden" style={{ boxShadow: shadowsMediumLight }} />
      <div id="stars3-light" className="star-layer block dark:hidden" style={{ boxShadow: shadowsBigLight }} />

      {/* Dark mode stars - hidden in light mode, shown in dark mode */}
      <div id="stars-dark" className="star-layer hidden dark:block" style={{ boxShadow: shadowsSmallDark }} />
      <div id="stars2-dark" className="star-layer hidden dark:block" style={{ boxShadow: shadowsMediumDark }} />
      <div id="stars3-dark" className="star-layer hidden dark:block" style={{ boxShadow: shadowsBigDark }} />
    </>
  );
};

StarBackground.displayName = 'StarBackground';
export default StarBackground;