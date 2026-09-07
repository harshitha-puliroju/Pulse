import { LAST_SESSION_CLOSE_ISO } from "./clock";
import type { TapeFrame } from "./types";

export type RawQuote = {
  price: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume20d: number;
  volatility20d: number;
  corporateAction?: "split" | "bonus";
};

const T0: Record<string, RawQuote> = {
  YESBANK: q(21.4, 21.32, 21.35, 21.5, 21.28, 4.2e7, 3.8e7, 0.011),
  HDFCBANK: q(1640, 1638, 1639, 1644, 1635, 4.1e6, 5.2e6, 0.009),
  ICICIBANK: q(1128, 1126, 1127, 1131, 1124, 3.4e6, 4.1e6, 0.01),
  SBIN: q(812, 810, 811, 815, 808, 8.2e6, 9.0e6, 0.01),
  AXISBANK: q(1094, 1092, 1093, 1098, 1090, 3.1e6, 3.6e6, 0.011),
  IRCTC: q(829, 831, 830, 834, 826, 1.1e6, 1.4e6, 0.012),
  RELIANCE: q(1406, 1404, 1405, 1410, 1401, 5.4e6, 6.1e6, 0.015),
  TCS: q(3920, 3918, 3919, 3930, 3912, 1.6e6, 1.9e6, 0.011),
  INFY: q(1478, 1476, 1477, 1482, 1473, 3.2e6, 3.8e6, 0.012),
  ITC: q(428, 427, 427.5, 430, 426, 7.1e6, 8.0e6, 0.009),
  MARUTI: q(12480, 12460, 12470, 12510, 12440, 2.4e5, 3.1e5, 0.013),
  TITAN: q(3380, 3375, 3378, 3390, 3368, 4.8e5, 6.2e5, 0.014),
  KOTAKBANK: q(1760, 1758, 1759, 1764, 1755, 2.2e6, 2.8e6, 0.01),
  ONGC: q(268, 267, 267.4, 269, 266.5, 9.1e6, 1.0e7, 0.016),
  HCLTECH: q(1488, 1485, 1486, 1494, 1482, 1.9e6, 2.3e6, 0.012),
  WIPRO: q(488, 487, 487.5, 490, 486, 4.4e6, 5.1e6, 0.013),
  HINDUNILVR: q(2488, 2484, 2486, 2496, 2480, 1.1e6, 1.4e6, 0.009),
  TATAMOTORS: q(978, 976, 977, 982, 974, 8.8e6, 9.4e6, 0.018),
  ASIANPAINT: q(2294, 2290, 2292, 2302, 2286, 7.2e5, 9.0e5, 0.011),
  SUNPHARMA: q(1688, 1684, 1686, 1694, 1680, 1.5e6, 1.8e6, 0.01),
  BHARTIARTL: q(1542, 1538, 1540, 1548, 1534, 3.6e6, 4.2e6, 0.012),
  LT: q(3488, 3480, 3484, 3500, 3474, 1.2e6, 1.5e6, 0.011),
  ADANIENT: q(2988, 2970, 2976, 3010, 2962, 2.8e6, 3.2e6, 0.022),
  BAJFINANCE: q(7120, 7108, 7112, 7144, 7096, 8.4e5, 1.0e6, 0.016),
};

const T1: Record<string, RawQuote> = {
  YESBANK: q(22.15, 21.32, 21.48, 22.28, 21.4, 1.44e8, 3.8e7, 0.011),
  HDFCBANK: q(1686, 1638, 1642, 1689, 1640, 8.3e6, 5.2e6, 0.009),
  ICICIBANK: q(1149, 1126, 1130, 1152, 1128, 6.2e6, 4.1e6, 0.01),
  SBIN: q(830, 810, 814, 832, 812, 1.4e7, 9.0e6, 0.01),
  AXISBANK: q(1112, 1092, 1096, 1115, 1094, 4.8e6, 3.6e6, 0.011),
  IRCTC: q(800, 831, 826, 828, 798, 3.6e6, 1.4e6, 0.012),
  RELIANCE: q(1412, 1404, 1406, 1416, 1403, 5.8e6, 6.1e6, 0.015),
  TCS: q(3932, 3918, 3922, 3940, 3916, 1.7e6, 1.9e6, 0.011),
  INFY: q(1485, 1476, 1478, 1488, 1475, 3.4e6, 3.8e6, 0.012),
  ITC: q(430, 427, 428, 432, 426.5, 7.4e6, 8.0e6, 0.009),
  MARUTI: q(12510, 12460, 12480, 12540, 12470, 2.6e5, 3.1e5, 0.013),
  TITAN: q(3394, 3375, 3382, 3402, 3378, 5.1e5, 6.2e5, 0.014),
  KOTAKBANK: q(1778, 1758, 1762, 1782, 1760, 3.4e6, 2.8e6, 0.01),
  ONGC: q(270, 267, 268, 271, 267, 9.4e6, 1.0e7, 0.016),
  HCLTECH: q(1496, 1485, 1488, 1500, 1484, 2.0e6, 2.3e6, 0.012),
  WIPRO: q(491, 487, 488, 493, 487, 4.6e6, 5.1e6, 0.013),
  HINDUNILVR: q(2494, 2484, 2488, 2500, 2484, 1.15e6, 1.4e6, 0.009),
  TATAMOTORS: q(984, 976, 978, 988, 975, 9.1e6, 9.4e6, 0.018),
  ASIANPAINT: q(2302, 2290, 2294, 2310, 2288, 7.6e5, 9.0e5, 0.011),
  SUNPHARMA: q(1696, 1684, 1688, 1702, 1684, 1.6e6, 1.8e6, 0.01),
  BHARTIARTL: q(1554, 1538, 1542, 1558, 1538, 3.9e6, 4.2e6, 0.012),
  LT: q(3510, 3480, 3488, 3518, 3482, 1.4e6, 1.5e6, 0.011),
  ADANIENT: q(3012, 2970, 2980, 3030, 2968, 3.1e6, 3.2e6, 0.022),
  BAJFINANCE: q(7188, 7108, 7120, 7204, 7110, 1.2e6, 1.0e6, 0.016),
};

function q(
  price: number,
  prevClose: number,
  open: number,
  high: number,
  low: number,
  volume: number,
  avgVolume20d: number,
  volatility20d: number,
): RawQuote {
  return { price, prevClose, open, high, low, volume, avgVolume20d, volatility20d };
}

const T2: Record<string, RawQuote> = { ...T1 };
T2.ITC = {
  ...T1.ITC,
  price: 215,
  open: 215,
  high: 218,
  low: 213,
  prevClose: 215,
  corporateAction: "bonus",
};

export const TAPE: Record<TapeFrame, Record<string, RawQuote>> = {
  t0: T0,
  t1: T1,
  t2: T2,
};

export const TAPE_AS_OF = LAST_SESSION_CLOSE_ISO;
