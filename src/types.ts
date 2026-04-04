export interface ScaleMeta {
  id: string;
  title: string;
  subtitle: string;
  unit: string;
  unitSymbol: string;
  minExponent: number;
  maxExponent: number;
  pixelsPerExponent: number;
}

export interface ScaleEntry {
  exponent: number;
  name: string;
  nameEn: string;
  description: string;
}

export interface ScaleData {
  meta: ScaleMeta;
  entries: ScaleEntry[];
}
