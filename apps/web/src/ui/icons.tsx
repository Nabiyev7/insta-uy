/** Chiziqli belgilar (24×24). */
export const ICONS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  photo: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  map: 'M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4zM9 4v13M15 6.5v13',
  chat: 'M4 5h16v11H10l-5 4v-4H4z',
  shop: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9M10 20v-5h4v5',
  rank: 'M8 4h8v6a4 4 0 01-8 0zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 14v4M8 20h8',
  home: 'M3 11l9-8 9 8M6 9.5V20h12V9.5M10 20v-6h4v6',
  city: 'M3 20h18M5 20V9h5v11M14 20V4h5v16M7 12h1M7 15h1M16 8h1M16 11h1M16 14h1',
  walk: 'M13 6a1.8 1.8 0 100-3.6A1.8 1.8 0 0013 6zM10 21l2-6-2-3 1-4 4 2 3 1M12 15l3 2 1 4M11 8L8 10l-1 3',
  drive: 'M3 16v-3l2-5h14l2 5v3zM3 13h18M6 16v2M18 16v2M7 13v.01M17 13v.01',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
} as const;

interface IconProps { readonly d: string }
export function Icon({ d }: IconProps): React.JSX.Element {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}
