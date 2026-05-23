export const KYRGYZSTAN_CENTER: [number, number] = [41.2044, 74.7661];
export const KYRGYZSTAN_BOUNDS: [[number, number], [number, number]] = [
  [39.15, 68.0],
  [43.4, 80.4],
];
export const KYRGYZSTAN_PAN_BOUNDS: [[number, number], [number, number]] = [
  [30.0, 56.0],
  [52.0, 92.0],
];

const [[south, west], [north, east]] = KYRGYZSTAN_BOUNDS;

export const isInsideKyrgyzstanBounds = (latitude: number, longitude: number) =>
  latitude >= south &&
  latitude <= north &&
  longitude >= west &&
  longitude <= east;
