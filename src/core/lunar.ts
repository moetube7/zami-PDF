// lunar-javascript 라이브러리를 사용한 음력↔양력 변환
// require()를 모듈 최상위에 배치해야 Next.js(Turbopack) 빌드 시 CommonJS UMD 모듈이 올바르게 초기화됨
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { Solar, Lunar } = require("lunar-javascript") as any;

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
}

export function lunarToSolar(lunar: LunarDate): SolarDate {
  const lunarObj = Lunar.fromYmd(lunar.year, lunar.month, lunar.day);
  const solar = lunarObj.getSolar();
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
  };
}

export function solarToLunar(solar: SolarDate): LunarDate {
  const solarObj = Solar.fromYmd(solar.year, solar.month, solar.day);
  const lunar = solarObj.getLunar();
  const month = lunar.getMonth() as number;
  return {
    year: lunar.getYear() as number,
    month: Math.abs(month),  // 윤달은 음수(-4 = 윤4월)이므로 절댓값 사용
    day: lunar.getDay() as number,
    isLeap: month < 0,
  };
}
