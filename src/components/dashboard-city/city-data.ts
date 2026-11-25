export type CityGroup = "main" | "content" | "system";

export type BuildingArchetype =
  | "spire"
  | "gate"
  | "radar"
  | "campus"
  | "atrium"
  | "rotunda"
  | "pavilion"
  | "silos"
  | "commons"
  | "citadel"
  | "interchange"
  | "prism"
  | "dome"
  | "globe"
  | "reactor"
  | "substation";

export type CityNode = {
  id: string;
  href: string;
  label: string;
  labelEn: string;
  districtFa: string;
  districtEn: string;
  iconKey:
    | "dashboard"
    | "registrations"
    | "leads"
    | "courses"
    | "posts"
    | "comments"
    | "pages"
    | "files"
    | "users"
    | "roles"
    | "menus"
    | "theme"
    | "illustration"
    | "globe"
    | "assistant"
    | "settings";
  roles?: string[];
  group: CityGroup;
  /** مختصات ایزومتریک روی بلوک‌های شهر لس‌آنجلس */
  x: number;
  z: number;
  /** مقیاس ارتفاع شاخص */
  height: number;
  archetype: BuildingArchetype;
  statKey?: "registrations" | "leads" | "courses" | "students" | "posts" | "files";
};

export type CityEdge = {
  from: string;
  to: string;
  /** شدت و سرعت پالس نوری */
  intensity?: number;
};

export type RoadPolyline = {
  id: string;
  width: number;
  isArterial: boolean;
  isPalmBoulevard?: boolean;
  closed?: boolean;
  points: Array<[number, number]>;
};

export const CITY_NODES: CityNode[] = [
  // ─── هسته مرکزی داون‌تاون (Pershing / Bunker Hill Core) ───
  {
    id: "dashboard",
    href: "/dashboard",
    label: "داشبورد مرکزی",
    labelEn: "Dashboard HQ",
    districtFa: "برج مرکزی بانکر هیل",
    districtEn: "Bunker Hill Tower",
    iconKey: "dashboard",
    group: "main",
    x: 0,
    z: 0,
    height: 7.8,
    archetype: "spire",
    statKey: "students",
  },
  {
    id: "registrations",
    href: "/dashboard/registrations",
    label: "ثبت‌نام‌ها",
    labelEn: "Registrations",
    districtFa: "دروازه ویلشر",
    districtEn: "Wilshire Gate",
    iconKey: "registrations",
    roles: ["ADMIN", "EDITOR"],
    group: "main",
    x: -7.8,
    z: 8.4,
    height: 4.8,
    archetype: "gate",
    statKey: "registrations",
  },
  {
    id: "leads",
    href: "/dashboard/leads",
    label: "لیدها",
    labelEn: "Leads",
    districtFa: "برج مخابرات گرند",
    districtEn: "Grand Signal Tower",
    iconKey: "leads",
    roles: ["ADMIN", "EDITOR"],
    group: "main",
    x: 8.6,
    z: 8.2,
    height: 5.3,
    archetype: "radar",
    statKey: "leads",
  },

  // ─── منطقه محتوا (غرب داون‌تاون تا میراکل مایل) ───
  {
    id: "courses",
    href: "/dashboard/courses",
    label: "دوره‌ها",
    labelEn: "Courses",
    districtFa: "پردیس ویلشر",
    districtEn: "Wilshire Campus",
    iconKey: "courses",
    group: "content",
    x: -10.8,
    z: -0.6,
    height: 5.5,
    archetype: "campus",
    statKey: "courses",
  },
  {
    id: "posts",
    href: "/dashboard/posts",
    label: "مقالات",
    labelEn: "Posts",
    districtFa: "تالار نشر سان‌ست",
    districtEn: "Sunset Editorial",
    iconKey: "posts",
    roles: ["ADMIN", "EDITOR"],
    group: "content",
    x: -10.4,
    z: -10.8,
    height: 4.6,
    archetype: "atrium",
    statKey: "posts",
  },
  {
    id: "comments",
    href: "/dashboard/comments",
    label: "نظرات",
    labelEn: "Comments",
    districtFa: "آمفی‌تئاتر هالیوود",
    districtEn: "Forum Bowl",
    iconKey: "comments",
    roles: ["ADMIN", "EDITOR"],
    group: "content",
    x: -1.6,
    z: -10.6,
    height: 3.8,
    archetype: "rotunda",
  },
  {
    id: "pages",
    href: "/dashboard/pages",
    label: "صفحات ساکن",
    labelEn: "Pages",
    districtFa: "پاویون لابری",
    districtEn: "La Brea Pavilion",
    iconKey: "pages",
    roles: ["ADMIN", "EDITOR"],
    group: "content",
    x: -17.4,
    z: -4.2,
    height: 3.9,
    archetype: "pavilion",
  },
  {
    id: "files",
    href: "/dashboard/files",
    label: "فایل‌ها",
    labelEn: "Files",
    districtFa: "سیلوهای آرشیو غرب",
    districtEn: "Westside Vault",
    iconKey: "files",
    group: "content",
    x: -17.6,
    z: 9.8,
    height: 4.4,
    archetype: "silos",
    statKey: "files",
  },

  // ─── منطقه سیستم و هنر (آرتز دیستریکت و شرق داون‌تاون) ───
  {
    id: "users",
    href: "/dashboard/users",
    label: "کاربران",
    labelEn: "Users",
    districtFa: "مجتمع سیلور لیک",
    districtEn: "Silver Lake Commons",
    iconKey: "users",
    roles: ["ADMIN"],
    group: "system",
    x: 7.4,
    z: -10.4,
    height: 5.1,
    archetype: "commons",
  },
  {
    id: "roles",
    href: "/dashboard/roles",
    label: "نقش‌ها",
    labelEn: "Roles",
    districtFa: "دژ امنیت آلامدا",
    districtEn: "Alameda Citadel",
    iconKey: "roles",
    roles: ["ADMIN"],
    group: "system",
    x: 20.2,
    z: -12.8,
    height: 4.5,
    archetype: "citadel",
  },
  {
    id: "menus",
    href: "/dashboard/menus",
    label: "منوها",
    labelEn: "Menus",
    districtFa: "تقاطع یونیون",
    districtEn: "Union Hub",
    iconKey: "menus",
    roles: ["ADMIN"],
    group: "system",
    x: 11.2,
    z: -1.4,
    height: 4.1,
    archetype: "interchange",
  },
  {
    id: "theme",
    href: "/dashboard/theme",
    label: "تم",
    labelEn: "Theme",
    districtFa: "منشور آرتز دیستریکت",
    districtEn: "Arts District Prism",
    iconKey: "theme",
    roles: ["ADMIN"],
    group: "system",
    x: 20.6,
    z: 5.6,
    height: 4.6,
    archetype: "prism",
  },
  {
    id: "illustration-style",
    href: "/dashboard/illustration-style",
    label: "استایل تصویر",
    labelEn: "Illustrations",
    districtFa: "آتلیه گنبدی",
    districtEn: "Atelier Dome",
    iconKey: "illustration",
    roles: ["ADMIN"],
    group: "system",
    x: 20.8,
    z: -4.2,
    height: 4.1,
    archetype: "dome",
  },
  {
    id: "globe",
    href: "/dashboard/globe",
    label: "کره ذرات هرو",
    labelEn: "Hero Sphere",
    districtFa: "رصدخانه گریفیت",
    districtEn: "Griffith Observatory",
    iconKey: "globe",
    roles: ["ADMIN"],
    group: "system",
    x: 11.4,
    z: 17.6,
    height: 4.9,
    archetype: "globe",
  },
  {
    id: "assistant",
    href: "/dashboard/assistant",
    label: "دستیار هوشمند",
    labelEn: "Assistant",
    districtFa: "راکتور المپیک",
    districtEn: "Olympic Neural Core",
    iconKey: "assistant",
    roles: ["ADMIN"],
    group: "system",
    x: 0.4,
    z: 17.4,
    height: 5.2,
    archetype: "reactor",
  },
  {
    id: "settings",
    href: "/dashboard/settings",
    label: "تنظیمات",
    labelEn: "Settings",
    districtFa: "ایستگاه ونیز",
    districtEn: "Venice Substation",
    iconKey: "settings",
    roles: ["ADMIN"],
    group: "system",
    x: -10.6,
    z: 17.2,
    height: 4.2,
    archetype: "substation",
  },
];

export const CITY_EDGES: CityEdge[] = [
  { from: "dashboard", to: "registrations", intensity: 1.0 },
  { from: "dashboard", to: "leads", intensity: 1.0 },
  { from: "dashboard", to: "courses", intensity: 1.0 },
  { from: "dashboard", to: "users", intensity: 0.9 },
  { from: "dashboard", to: "menus", intensity: 0.8 },
  { from: "dashboard", to: "assistant", intensity: 1.0 },

  { from: "registrations", to: "courses", intensity: 0.95 },
  { from: "courses", to: "files", intensity: 0.85 },
  { from: "registrations", to: "files", intensity: 0.7 },

  { from: "courses", to: "posts", intensity: 0.85 },
  { from: "posts", to: "comments", intensity: 0.9 },
  { from: "posts", to: "pages", intensity: 0.8 },
  { from: "pages", to: "files", intensity: 0.75 },

  { from: "users", to: "roles", intensity: 0.95 },
  { from: "roles", to: "menus", intensity: 0.85 },
  { from: "comments", to: "users", intensity: 0.7 },

  { from: "menus", to: "theme", intensity: 0.85 },
  { from: "theme", to: "illustration-style", intensity: 0.9 },
  { from: "leads", to: "globe", intensity: 0.85 },
  { from: "leads", to: "assistant", intensity: 0.9 },
  { from: "assistant", to: "settings", intensity: 0.85 },
  { from: "registrations", to: "settings", intensity: 0.75 },
  { from: "globe", to: "theme", intensity: 0.8 },
];

/**
 * بزرگراه معلق (شبیه بزرگراه ۱۱۰ هاربر در داون‌تاون لس‌آنجلس)
 * از حاشیه غرب/جنوب‌غرب می‌گذرد و دو سر آن در افق محو می‌شود.
 */
export const FREEWAY_CURVE_POINTS: Array<[number, number]> = [
  [-48, 34],
  [-30, 21],
  [-22.6, 10],
  [-21.8, -3],
  [-23.8, -16],
  [-31, -30],
  [-45, -46],
];

/**
 * شبکه خیابان‌های الهام‌گرفته از لس‌آنجلس:
 * تلفیقی از محورهای کج داون‌تاون، بلوارهای کشیده (Wilshire, Sunset, Olympic) و خیابان‌های فرعی محلات
 */
export const CITY_ROAD_POLYLINES: RoadPolyline[] = [
  // ۱. بلوار ویلشر (Wilshire Blvd) - شاهراه نخل‌دار غربی-شرقی
  {
    id: "wilshire-blvd",
    width: 2.45,
    isArterial: true,
    isPalmBoulevard: true,
    points: [
      [-56, 7.6],
      [-28, 5.2],
      [-12, 4.3],
      [-4.2, 4.1],
      [4.5, 4.0],
      [15.5, 2.8],
      [30, 0.2],
      [56, -4.5],
    ],
  },
  // ۲. بلوار سان‌ست (Sunset / 4th St) - شمال هسته مرکزی با انحنای طبیعی
  {
    id: "sunset-blvd",
    width: 2.25,
    isArterial: true,
    isPalmBoulevard: true,
    points: [
      [-56, -12.5],
      [-28, -8.2],
      [-14, -6.2],
      [-4.8, -5.2],
      [5.5, -5.4],
      [16.2, -7.2],
      [31, -11.4],
      [56, -19],
    ],
  },
  // ۳. بلوار المپیک (Olympic Blvd) - جنوب داون‌تاون
  {
    id: "olympic-blvd",
    width: 2.2,
    isArterial: true,
    isPalmBoulevard: true,
    points: [
      [-56, 19.5],
      [-28, 14.5],
      [-14.5, 13.4],
      [-2.5, 13.0],
      [8.5, 12.8],
      [20, 13.6],
      [34, 16.2],
      [56, 22],
    ],
  },
  // ۴. بلوار هالیوود / ملروز (Melrose Ave) - حاشیه شمالی داون‌تاون
  {
    id: "melrose-ave",
    width: 1.95,
    isArterial: true,
    points: [
      [-54, -24.5],
      [-25, -17.8],
      [-11, -15.6],
      [3.5, -15.2],
      [16.5, -16.8],
      [32, -20.5],
      [54, -28],
    ],
  },
  // ۵. بلوار ونیز / ورمونت (Venice Blvd) - جنوب بیرونی
  {
    id: "venice-blvd",
    width: 1.85,
    isArterial: false,
    points: [
      [-50, 29],
      [-22, 22.8],
      [-5, 22.0],
      [12, 22.4],
      [28, 25],
      [52, 32],
    ],
  },
  // ۶. خیابان گرند (Grand Ave) - محور شمال‌غرب به جنوب‌شرق در غرب برج مرکزی
  {
    id: "grand-ave",
    width: 2.15,
    isArterial: true,
    isPalmBoulevard: true,
    points: [
      [-26, -50],
      [-16, -24],
      [-6.2, -9.5],
      [-4.8, -1.0],
      [-3.5, 8.8],
      [-4.6, 18.5],
      [-8.5, 32],
      [-14, 54],
    ],
  },
  // ۷. خیابان مین / فیگوروا (Figueroa / Main St) - شرق برج مرکزی
  {
    id: "main-st",
    width: 2.15,
    isArterial: true,
    points: [
      [19, -50],
      [12.5, -24],
      [3.8, -9.5],
      [5.1, -0.5],
      [4.5, 9.2],
      [5.8, 18.5],
      [9.5, 32],
      [16, 54],
    ],
  },
  // ۸. خیابان لا بری (La Brea Ave) - جداکننده محتوا و غرب
  {
    id: "la-brea-ave",
    width: 1.9,
    isArterial: true,
    points: [
      [-22, -48],
      [-17.2, -22],
      [-15.0, -7.0],
      [-14.4, 4.2],
      [-14.2, 13.4],
      [-16.2, 25],
      [-21, 52],
    ],
  },
  // ۹. خیابان آلامدا (Alameda St) - آرتز دیستریکت در شرق
  {
    id: "alameda-st",
    width: 1.9,
    isArterial: true,
    points: [
      [24, -48],
      [18.2, -21],
      [16.0, -7.2],
      [15.8, 3.0],
      [16.2, 13.2],
      [19.5, 26],
      [26, 52],
    ],
  },
  // ۱۰. خیابان‌های فرعی میانی برای تشکیل بلوک‌های شهری متراکم
  {
    id: "mid-cross-west",
    width: 1.35,
    isArterial: false,
    points: [
      [-24, -1.2],
      [-14.8, -1.2],
      [-5.2, -1.0],
    ],
  },
  {
    id: "mid-cross-east",
    width: 1.35,
    isArterial: false,
    points: [
      [5.1, -0.5],
      [15.8, -0.6],
      [28, -1.4],
      [44, -2.5],
    ],
  },
  {
    id: "arts-outer-east",
    width: 1.5,
    isArterial: false,
    points: [
      [34, -36],
      [26.5, -14],
      [25.2, 1.5],
      [26.8, 17],
      [34, 40],
    ],
  },
  {
    id: "westside-outer",
    width: 1.5,
    isArterial: false,
    points: [
      [-36, -24],
      [-30.5, -6],
      [-29.5, 9],
      [-33, 28],
    ],
  },
];

/**
 * مسیرهای پیاده‌روی فیگورهای انسانی روی پیاده‌روهای بلوارها و میدان مرکزی
 */
export const CITY_WALKWAY_PATHS: Array<{
  closed: boolean;
  points: Array<[number, number]>;
}> = [
  // پیاده‌رو اطراف میدان مرکزی بانکر هیل
  {
    closed: true,
    points: [
      [-3.3, -3.5],
      [3.4, -3.6],
      [3.6, 2.7],
      [-3.2, 2.8],
    ],
  },
  // پیاده‌رو شمالی بلوار ویلشر
  {
    closed: false,
    points: [
      [-22, 3.6],
      [-13, 3.1],
      [-4.2, 2.9],
      [4.5, 2.8],
      [15.5, 1.6],
      [25, -0.3],
    ],
  },
  // پیاده‌رو جنوبی بلوار ویلشر
  {
    closed: false,
    points: [
      [-22, 6.2],
      [-12, 5.5],
      [-4.2, 5.3],
      [4.5, 5.2],
      [15.5, 4.0],
      [25, 2.1],
    ],
  },
  // پیاده‌رو بلوار سان‌ست
  {
    closed: false,
    points: [
      [-22, -8.5],
      [-14, -7.4],
      [-4.8, -6.4],
      [5.5, -6.6],
      [16.2, -8.4],
      [24, -10.8],
    ],
  },
  // پیاده‌رو خیابان گرند
  {
    closed: false,
    points: [
      [-10.2, -16],
      [-7.4, -9.5],
      [-6.0, -1.0],
      [-4.7, 8.8],
      [-5.8, 18.5],
    ],
  },
  // پیاده‌رو خیابان مین
  {
    closed: false,
    points: [
      [8.2, -15],
      [5.0, -9.5],
      [6.3, -0.5],
      [5.7, 9.2],
      [7.0, 18.5],
    ],
  },
  // پیاده‌رو بلوار المپیک
  {
    closed: false,
    points: [
      [-19, 12.6],
      [-10, 12.1],
      [0, 11.8],
      [11, 11.7],
      [21, 12.7],
    ],
  },
  // پیاده‌رو آرتز دیستریکت
  {
    closed: false,
    points: [
      [17.4, -15],
      [17.2, -7.2],
      [17.0, 3.0],
      [17.4, 13.2],
    ],
  },
];

/**
 * مسیر حرکت خودروهای سه‌بعدی در خیابان‌های اصلی شهر
 */
export const CITY_CAR_LANES: Array<{
  elevated?: boolean;
  laneOffset: number;
  points: Array<[number, number]>;
}> = [
  { laneOffset: 0.52, points: CITY_ROAD_POLYLINES[0].points }, // Wilshire eastbound
  { laneOffset: -0.52, points: [...CITY_ROAD_POLYLINES[0].points].reverse() }, // Wilshire westbound
  { laneOffset: 0.48, points: CITY_ROAD_POLYLINES[1].points }, // Sunset
  { laneOffset: -0.48, points: [...CITY_ROAD_POLYLINES[1].points].reverse() },
  { laneOffset: 0.45, points: CITY_ROAD_POLYLINES[2].points }, // Olympic
  { laneOffset: 0.45, points: CITY_ROAD_POLYLINES[5].points }, // Grand Ave
  { laneOffset: -0.45, points: [...CITY_ROAD_POLYLINES[6].points].reverse() }, // Main St
  { elevated: true, laneOffset: 0.45, points: FREEWAY_CURVE_POINTS }, // Elevated Freeway Northbound
  { elevated: true, laneOffset: -0.45, points: [...FREEWAY_CURVE_POINTS].reverse() }, // Elevated Freeway Southbound
];

function distPointToSegmentSq(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const vx = bx - ax;
  const vz = bz - az;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 1e-6) {
    const dx = px - ax;
    const dz = pz - az;
    return dx * dx + dz * dz;
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / lenSq));
  const cx = ax + vx * t;
  const cz = az + vz * t;
  const dx = px - cx;
  const dz = pz - cz;
  return dx * dx + dz * dz;
}

export function getNearestRoadInfo(
  x: number,
  z: number
): { distance: number; roadHalfWidth: number; angle: number } {
  let bestDistSq = Infinity;
  let bestHalfW = 1.0;
  let bestAngle = 0;

  for (const road of CITY_ROAD_POLYLINES) {
    const pts = road.points;
    const count = road.closed ? pts.length : pts.length - 1;
    for (let i = 0; i < count; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[(i + 1) % pts.length];
      const dSq = distPointToSegmentSq(x, z, ax, az, bx, bz);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestHalfW = road.width * 0.5;
        bestAngle = Math.atan2(bz - az, bx - ax);
      }
    }
  }

  return {
    distance: Math.sqrt(bestDistSq),
    roadHalfWidth: bestHalfW,
    angle: bestAngle,
  };
}

export function getDistanceToFreeway(x: number, z: number): number {
  let bestDistSq = Infinity;
  const pts = FREEWAY_CURVE_POINTS;
  for (let i = 0; i < pts.length - 1; i++) {
    const dSq = distPointToSegmentSq(x, z, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    if (dSq < bestDistSq) bestDistSq = dSq;
  }
  return Math.sqrt(bestDistSq);
}

export const GROUP_META: Record<CityGroup, { fa: string; en: string; color: string }> = {
  main: { fa: "هسته عملیاتی", en: "Core Ops", color: "#3b82f6" },
  content: { fa: "منطقه محتوا", en: "Content District", color: "#0ea5e9" },
  system: { fa: "منطقه سیستم", en: "System Grid", color: "#6366f1" },
};

export function filterNodesByRoles(roles: string[]): CityNode[] {
  if (roles.includes("ADMIN")) return CITY_NODES;
  return CITY_NODES.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r)));
}

export function findNodeForPath(pathname: string, nodes: CityNode[]): CityNode | undefined {
  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return nodes.find((n) => n.id === "dashboard");
  }
  const sorted = [...nodes]
    .filter((n) => n.href !== "/dashboard")
    .sort((a, b) => b.href.length - a.href.length);
  return sorted.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
}
