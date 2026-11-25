/**
 * Template داشبورد — در Next.js هر بار ناوبری بین صفحات /dashboard/*،
 * این کامپوننت به‌طور کامل remount می‌شود؛ در نتیجه انیمیشن‌های ورود
 * (ds-page + stagger کارت‌ها + آبشاری جدول‌ها) در «هر» جابه‌جایی صفحه
 * دوباره اجرا می‌شوند، نه فقط در لود اول.
 */
export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="ds-page">{children}</div>;
}
