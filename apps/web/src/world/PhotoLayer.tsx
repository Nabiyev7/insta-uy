/** Foto rejimi (17-qadam): kadr olish funksiyasi va jonli ko'rinishda effektlar. O'yin rejimida hech narsa qilmaydi (oddiy render). */
import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector2 } from 'three';
import { pitchOf } from '../logic/cityCamera.ts';
import { aspectOf, frameRect, gradeOf, tiltOf, type PhotoSettings } from '../logic/photo.ts';
import { city, director, houseShot, session, snapshotters } from '../app/runtime.ts';
import { getApp, useApp } from '../app/store.ts';
import { myRefLink } from '../app/share.ts';
import { isInFrame, makeComposer, takeShot } from './photoFx.ts';

/** Kamera qiyaligi: shahar rejimida balandlikdan, piyoda/mashinada — deyarli gorizontal. */
const pitchNow = (): number => houseShot.orbit?.pitch ?? (session.mode === 'city' ? pitchOf(city.view.height) : 0.25);
const ownSpot = (): { readonly x: number; readonly z: number; readonly nick: string } | null => {
  const { profile, plotById } = getApp();
  // Uy surati rejimida — o'sha uy, aks holda birinchi uy.
  const mine = profile?.plots.find((p) => p.plot === houseShot.orbit?.plot) ?? profile?.plots[0];
  const p = mine ? plotById.get(mine.plot) : undefined;
  return p && mine?.instagram ? { x: p.x, z: p.z, nick: mine.instagram } : null;
};

/** Jonli effektlar: renderni o'z qo'liga oladi (useFrame ustuvorligi 1). */
function PhotoLive({ settings }: { readonly settings: PhotoSettings }): null {
  const { gl, scene, camera, size } = useThree();
  const fx = useMemo(() => makeComposer(gl, scene, camera), [gl, scene, camera]);
  useEffect(() => () => fx.dispose(), [fx]);
  useEffect(() => { fx.composer.setPixelRatio(gl.getPixelRatio()); fx.composer.setSize(size.width, size.height); }, [fx, gl, size]);
  useFrame(() => {
    const frame = frameRect(size.width, size.height, aspectOf(settings.format));
    fx.update(gradeOf(settings.light, settings.tilt), tiltOf(settings.tilt, pitchNow()), frame.w * gl.getPixelRatio(), gl.getDrawingBufferSize(new Vector2()));
    fx.composer.render();
  }, 1);
  return null;
}

export function PhotoLayer(): React.JSX.Element | null {
  const { gl, scene, camera, size } = useThree();
  const isPhoto = useApp((s) => s.isPhoto);
  const settings = useApp((s) => s.photo);
  const isWeak = useApp((s) => s.quality === 'low');
  useEffect(() => {
    snapshotters.photo = () => {
      const s = getApp().photo;
      const own = ownSpot();
      const frame = frameRect(size.width, size.height, aspectOf(s.format));
      const nick = own && isInFrame(camera, own, frame, size) ? own.nick : null;
      return takeShot({ gl, scene, camera, settings: s, grade: gradeOf(s.light, s.tilt), tilt: tiltOf(s.tilt, pitchNow()), view: size, isWeak: getApp().quality === 'low', sign: s.hasSign === false ? null : { nick, hasLink: s.hasLink, link: myRefLink() } });
    };
    return () => { snapshotters.photo = null; };
  }, [gl, scene, camera, size]);
  // Video yozuvida (director) va oddiy ko'rinishda effekt yo'q; kuchsiz telefonda maket faqat yakuniy kadrda.
  const isFx = isPhoto && director.pose === null && (settings.light !== 'now' || (settings.tilt !== 'off' && !isWeak));
  return isFx ? <PhotoLive settings={isWeak ? { ...settings, tilt: 'off' } : settings} /> : null;
}
