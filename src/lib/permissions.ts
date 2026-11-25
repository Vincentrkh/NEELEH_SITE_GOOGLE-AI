/**
 * لیست ثابت مجوزهای قابل اختصاص به نقش‌ها.
 * هر مجوز یک عملیات مشخص در سیستم را کنترل می‌کند.
 *
 * ادمین (نقش ADMIN) همیشه همه مجوزها را دارد — لازم نیست دستی اختصاص دهیم.
 */

export const PERMISSIONS = {
  // ── دوره‌ها ──
  COURSE_VIEW: "course.view",
  COURSE_CREATE: "course.create",
  COURSE_UPDATE: "course.update",
  COURSE_DELETE: "course.delete",
  COURSE_PUBLISH: "course.publish",

  // ── ثبت‌نام ──
  REGISTRATION_VIEW: "registration.view",
  REGISTRATION_UPDATE: "registration.update",
  REGISTRATION_DELETE: "registration.delete",
  REGISTRATION_EXPORT: "registration.export",

  // ── لیدها ──
  LEAD_VIEW: "lead.view",
  LEAD_UPDATE: "lead.update",
  LEAD_DELETE: "lead.delete",

  // ── فایل‌ها ──
  FILE_UPLOAD: "file.upload",
  FILE_DELETE: "file.delete",

  // ── کاربران و نقش‌ها ──
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_UPDATE: "user.update",
  USER_DELETE: "user.delete",
  ROLE_MANAGE: "role.manage",

  // ── تنظیمات و تم ──
  SETTING_MANAGE: "setting.manage",
  THEME_MANAGE: "theme.manage",

  // ── وبلاگ ──
  POST_VIEW: "post.view",
  POST_CREATE: "post.create",
  POST_UPDATE: "post.update",
  POST_DELETE: "post.delete",
  POST_PUBLISH: "post.publish",
  COMMENT_MODERATE: "comment.moderate",

  // ── صفحات ساکن ──
  PAGE_MANAGE: "page.manage",

  // ── اتوماسیون و ممیزی ──
  AUTOMATION_MANAGE: "automation.manage",
  AUDIT_VIEW: "audit.view",

  // ── پنل هنرجو (برای کاربر STUDENT) ──
  PANEL_VIEW: "panel.view",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey];

/**
 * همه مجوزها به‌صورت یک لیست، برای seed اولیه دیتابیس.
 */
export const ALL_PERMISSIONS: { key: string; label: string; labelEn: string }[] = [
  { key: PERMISSIONS.COURSE_VIEW, label: "مشاهده دوره‌ها", labelEn: "View courses" },
  { key: PERMISSIONS.COURSE_CREATE, label: "ساخت دوره", labelEn: "Create courses" },
  { key: PERMISSIONS.COURSE_UPDATE, label: "ویرایش دوره", labelEn: "Edit courses" },
  { key: PERMISSIONS.COURSE_DELETE, label: "حذف دوره", labelEn: "Delete courses" },
  { key: PERMISSIONS.COURSE_PUBLISH, label: "انتشار/عدم انتشار دوره", labelEn: "Publish/unpublish courses" },
  { key: PERMISSIONS.REGISTRATION_VIEW, label: "مشاهده ثبت‌نام‌ها", labelEn: "View registrations" },
  { key: PERMISSIONS.REGISTRATION_UPDATE, label: "تغییر وضعیت ثبت‌نام", labelEn: "Update registration status" },
  { key: PERMISSIONS.REGISTRATION_DELETE, label: "حذف ثبت‌نام", labelEn: "Delete registrations" },
  { key: PERMISSIONS.REGISTRATION_EXPORT, label: "خروجی اکسل ثبت‌نام‌ها", labelEn: "Export registrations to Excel" },
  { key: PERMISSIONS.LEAD_VIEW, label: "مشاهده لیدها", labelEn: "View leads" },
  { key: PERMISSIONS.LEAD_UPDATE, label: "تغییر وضعیت لید", labelEn: "Update lead status" },
  { key: PERMISSIONS.LEAD_DELETE, label: "حذف لید", labelEn: "Delete leads" },
  { key: PERMISSIONS.FILE_UPLOAD, label: "آپلود فایل", labelEn: "Upload files" },
  { key: PERMISSIONS.FILE_DELETE, label: "حذف فایل", labelEn: "Delete files" },
  { key: PERMISSIONS.USER_VIEW, label: "مشاهده کاربران", labelEn: "View users" },
  { key: PERMISSIONS.USER_CREATE, label: "ساخت کاربر", labelEn: "Create users" },
  { key: PERMISSIONS.USER_UPDATE, label: "ویرایش کاربر", labelEn: "Edit users" },
  { key: PERMISSIONS.USER_DELETE, label: "حذف کاربر", labelEn: "Delete users" },
  { key: PERMISSIONS.ROLE_MANAGE, label: "مدیریت نقش‌ها", labelEn: "Manage roles" },
  { key: PERMISSIONS.SETTING_MANAGE, label: "مدیریت تنظیمات", labelEn: "Manage settings" },
  { key: PERMISSIONS.THEME_MANAGE, label: "مدیریت تم", labelEn: "Manage theme" },
  { key: PERMISSIONS.POST_VIEW, label: "مشاهده مقالات", labelEn: "View posts" },
  { key: PERMISSIONS.POST_CREATE, label: "ساخت مقاله", labelEn: "Create posts" },
  { key: PERMISSIONS.POST_UPDATE, label: "ویرایش مقاله", labelEn: "Edit posts" },
  { key: PERMISSIONS.POST_DELETE, label: "حذف مقاله", labelEn: "Delete posts" },
  { key: PERMISSIONS.POST_PUBLISH, label: "انتشار مقاله", labelEn: "Publish posts" },
  { key: PERMISSIONS.COMMENT_MODERATE, label: "مدیریت نظرات", labelEn: "Moderate comments" },
  { key: PERMISSIONS.PAGE_MANAGE, label: "مدیریت صفحات ساکن", labelEn: "Manage static pages" },
  { key: PERMISSIONS.AUTOMATION_MANAGE, label: "مدیریت اتوماسیون و صف تأیید", labelEn: "Manage automation & approvals" },
  { key: PERMISSIONS.AUDIT_VIEW, label: "مشاهده گزارش ممیزی", labelEn: "View audit log" },
  { key: PERMISSIONS.PANEL_VIEW, label: "دسترسی به پنل هنرجو", labelEn: "Access student panel" },
];

/**
 * دسته‌بندی مجوزها — برای نمایش در پنل ادمین به‌صورت گروهی.
 */
export const PERMISSION_GROUPS: {
  label: string;
  labelEn: string;
  permissions: { key: string; label: string; labelEn: string }[];
}[] = [
  {
    label: "دوره‌ها",
    labelEn: "Courses",
    permissions: ALL_PERMISSIONS.filter((p) => p.key.startsWith("course.")),
  },
  {
    label: "ثبت‌نام",
    labelEn: "Registrations",
    permissions: ALL_PERMISSIONS.filter((p) => p.key.startsWith("registration.")),
  },
  {
    label: "لیدها",
    labelEn: "Leads",
    permissions: ALL_PERMISSIONS.filter((p) => p.key.startsWith("lead.")),
  },
  {
    label: "فایل‌ها",
    labelEn: "Files",
    permissions: ALL_PERMISSIONS.filter((p) => p.key.startsWith("file.")),
  },
  {
    label: "کاربران و نقش‌ها",
    labelEn: "Users & Roles",
    permissions: ALL_PERMISSIONS.filter((p) =>
      ["user.", "role."].some((prefix) => p.key.startsWith(prefix))
    ),
  },
  {
    label: "تنظیمات و تم",
    labelEn: "Settings & Theme",
    permissions: ALL_PERMISSIONS.filter((p) =>
      ["setting.", "theme."].some((prefix) => p.key.startsWith(prefix))
    ),
  },
  {
    label: "وبلاگ",
    labelEn: "Blog",
    permissions: ALL_PERMISSIONS.filter((p) =>
      ["post.", "comment."].some((prefix) => p.key.startsWith(prefix))
    ),
  },
  {
    label: "صفحات ساکن",
    labelEn: "Static Pages",
    permissions: ALL_PERMISSIONS.filter((p) => p.key.startsWith("page.")),
  },
  {
    label: "پنل هنرجو",
    labelEn: "Student Panel",
    permissions: ALL_PERMISSIONS.filter((p) => p.key.startsWith("panel.")),
  },
];

/** بررسی اینکه آیا مجوز داده‌شده در لیست موجود است. */
export function hasPermission(
  userPermissions: string[],
  permission: string
): boolean {
  return userPermissions.includes(permission);
}

/**
 * بررسی دسترسی به یک مسیر پنل ادمین بر اساس pattern.
 * مثلاً /dashboard/courses → COURSE_VIEW
 */
export function permissionForPath(path: string): string | null {
  const segments = path.replace(/^\/dashboard\/?/, "").split("/").filter(Boolean);
  if (segments.length === 0) return null; // داشبورد اصلی — همه کاربران احراز هویت‌شده
  const section = segments[0];
  const map: Record<string, string> = {
    courses: PERMISSIONS.COURSE_VIEW,
    registrations: PERMISSIONS.REGISTRATION_VIEW,
    leads: PERMISSIONS.LEAD_VIEW,
    files: PERMISSIONS.FILE_UPLOAD,
    users: PERMISSIONS.USER_VIEW,
    roles: PERMISSIONS.ROLE_MANAGE,
    settings: PERMISSIONS.SETTING_MANAGE,
    theme: PERMISSIONS.THEME_MANAGE,
    posts: PERMISSIONS.POST_VIEW,
    comments: PERMISSIONS.COMMENT_MODERATE,
    pages: PERMISSIONS.PAGE_MANAGE,
    automation: PERMISSIONS.AUTOMATION_MANAGE,
  };
  return map[section] ?? null;
}
