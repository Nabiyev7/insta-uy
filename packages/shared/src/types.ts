/** Bosh reja turlari. Bu tuzilma qulflangan: PLAN.md §2. */
export type PlotType = 'hovli' | 'kvartira' | 'villa' | 'qasr';
export type CommerceType = 'dokon' | 'ofis' | 'bilbord';
export type Zone = 'mahalla' | 'kopqavatli' | 'kol' | 'tepalik';
export type StreetKind = 'prospekt' | 'kocha';
/** 0: fasad +z, 1: +x, 2: -z, 3: -x (y o'qi atrofida 90° qadamlar). */
export type Rot = 0 | 1 | 2 | 3;

export interface District {
  readonly id: number;
  readonly zone: Zone;
  readonly nameUz: string;
  readonly nameRu: string;
  /** Tuman hududi: [minX, minZ, maxX, maxZ] bo'laklari. */
  readonly rects: readonly (readonly [number, number, number, number])[];
  /** Xaritada nomi yoziladigan nuqta. */
  readonly label: readonly [number, number];
}
export interface Street {
  readonly id: number;
  /** 0 = tumanlararo prospekt. */
  readonly districtId: number;
  readonly kind: StreetKind;
  readonly central: boolean;
}
export interface Plot {
  readonly id: string;
  readonly districtId: number;
  readonly streetId: number;
  readonly number: number;
  /** Kvartira raqami; hovlilarda 0. */
  readonly unit: number;
  readonly type: PlotType;
  readonly x: number;
  readonly z: number;
  /** Uchastkaning fasad bo'ylab eni va chuqurligi (rot'dan oldin). */
  readonly w: number;
  readonly d: number;
  readonly rot: Rot;
  /** Kvartira uchun bino raqami, aks holda 0. */
  readonly building: number;
  readonly value: number;
}
export interface Building {
  readonly id: number;
  readonly districtId: number;
  readonly x: number;
  readonly z: number;
  readonly rot: Rot;
  readonly floors: 5 | 9;
}
export interface Expansion {
  readonly id: string;
  readonly plotId: string;
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly rot: Rot;
}
export interface Commerce {
  readonly id: string;
  readonly type: CommerceType;
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly rot: Rot;
}
/** halqa — halqa yo'l bo'lagi, diagonal — burchaklarga ketgan prospekt. */
export type RoadKind = StreetKind | 'halqa' | 'diagonal';
export interface Road {
  readonly x: number;
  readonly z: number;
  /** x va z bo'ylab o'lchamlar (burilgan bo'lsa — o'z o'qlari bo'ylab). */
  readonly w: number;
  readonly d: number;
  readonly kind: RoadKind;
  /** w o'qining burilishi (radian); yo'q bo'lsa 0. */
  readonly angle?: number;
}
export interface MasterPlan {
  readonly version: number;
  readonly districts: readonly District[];
  readonly streets: readonly Street[];
  readonly plots: readonly Plot[];
  readonly buildings: readonly Building[];
  readonly expansions: readonly Expansion[];
  readonly commerce: readonly Commerce[];
  readonly roads: readonly Road[];
  /** Bo'sh qolgan joylar — mahalla bog'chalari va daraxtlar: [x, z, w, d]. */
  readonly greens: readonly (readonly [number, number, number, number])[];
}
