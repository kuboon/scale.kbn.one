export interface ScaleMeta {
  id: string;
  title: string;
  subtitle: string;
  unit: string;
  unitSymbol: string;
  minExponent: number;
  maxExponent: number;
}

export interface ScaleEntry {
  exponent: number;
  value: number;
  name: string;
  nameEn: string;
  description: string;
}

export interface ScaleData {
  meta: ScaleMeta;
  entries: ScaleEntry[];
}
