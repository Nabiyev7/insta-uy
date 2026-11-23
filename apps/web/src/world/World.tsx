import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, PCFShadowMap } from 'three';
import { QUALITY } from '../logic/quality.ts';
import { useApp } from '../app/store.ts';
import { CityLayer } from './CityLayer.tsx';
import { LifeLayer } from './LifeLayer.tsx';
import { PlayerLayer } from './PlayerLayer.tsx';

export function World(): React.JSX.Element | null {
  const kit = useApp((s) => s.kit);
  const plan = useApp((s) => s.plan);
  const level = useApp((s) => s.quality);
  if (!kit || !plan) return null;
  const q = QUALITY[level];
  return (
    <Canvas
      className="world" shadows={{ type: PCFShadowMap }} dpr={Math.min(globalThis.devicePixelRatio, q.dpr)} camera={{ fov: 60, near: 0.25, far: 1700 }}
      gl={{ antialias: level !== 'low', powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.12 }}
    >
      <PlayerLayer plan={plan} />
      <CityLayer kit={kit} plan={plan} />
      <LifeLayer kit={kit} />
    </Canvas>
  );
}
