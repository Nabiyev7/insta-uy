/** Do'kon, ofis va bilbordlardagi reklama yozuvlari. */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader } from 'three';
import { PUBLIC_FILES } from '../app/api.ts';
import { useApp } from '../app/store.ts';
import { toWorld, yawOf } from '../logic/item.ts';

export const Ads = (): null => {
  const { scene } = useThree();
  const plan = useApp((s) => s.plan);
  const ads = useApp((s) => s.boot?.commerce);
  useEffect(() => {
    if (!plan || !ads) return undefined;
    const meshes = ads.flatMap((ad) => {
      const c = plan.commerce.find((q) => q.id === ad.id);
      if (!c) return [];
      const size = c.type === 'bilbord' ? { w: 7.8, h: 3, y: 5.8, z: 0.02 } : c.type === 'dokon' ? { w: 9.6, h: 1.15, y: 4.2, z: 5.27 } : { w: 8, h: 1.6, y: 5.4, z: c.w > 30 ? 8.1 : 12.1 };
      const material = new MeshBasicMaterial({ map: ad.image && c.type === 'bilbord' ? new TextureLoader().load(PUBLIC_FILES + ad.image, (t) => { t.colorSpace = SRGBColorSpace; }) : signTexture(ad.title) });
      const mesh = new Mesh(new PlaneGeometry(size.w, size.h), material);
      const [x, z] = toWorld(c, 0, size.z);
      mesh.position.set(x, size.y, z);
      mesh.rotation.y = yawOf(c.rot);
      return [mesh];
    });
    if (meshes.length === 0) return undefined;
    scene.add(...meshes);
    return () => {
      for (const m of meshes) {
        scene.remove(m);
        m.geometry.dispose();
        m.material.map?.dispose();
        m.material.dispose();
      }
    };
  }, [plan, ads, scene]);
  return null;
};
const signTexture = (text: string): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#14545f';
    g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#fdf3d9';
    g.font = '700 52px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, 50, 480);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};
