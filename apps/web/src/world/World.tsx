import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, PCFShadowMap } from 'three';
import { QUALITY } from '../logic/quality.ts';
import { useApp } from '../app/store.ts';
import { Crash } from '../ui/Cover.tsx';
import { CityLayer } from './CityLayer.tsx';
import { LifeLayer } from './LifeLayer.tsx';
import { PlayerLayer } from './PlayerLayer.tsx';

export function World(): React.JSX.Element | null {
  const kit = useApp((s) => s.kit);
  const plan = useApp((s) => s.plan);
  const level = useApp((s) => s.quality);
  const [isLost, setLost] = useState(false);
  if (!kit || !plan) return null;
  if (isLost) return <Crash />;
  const q = QUALITY[level];
  return (
    <Canvas
      onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', () => setLost(true), { once: true })}
      className="world" shadows={{ type: PCFShadowMap }} dpr={Math.min(globalThis.devicePixelRatio, q.dpr)} camera={{ fov: 60, near: 0.25, far: 1700 }}
      gl={{ antialias: level !== 'low', powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.12 }}
    >
      <PlayerLayer plan={plan} kit={kit} />
      <CityLayer kit={kit} plan={plan} />
      <LifeLayer kit={kit} />
    </Canvas>
  );
}
