# آکادمی نیله — CMS قابل توسعه معماری

سیستم مدیریت محتوای کامل برای آکادمی معماری نیله — شامل مدیریت دوره‌ها،
ثبت‌نام هنرجویان، پنل مدیریت، وبلاگ، تنظیمات تم و صفحه اصلی پویا.

## 🚀 شروع سریع (توسعه)

### روش ۱: ویزارد نصب (پیشنهادی — مثل وردپرس)

ساده‌ترین راه: فقط سرور را روشن کنید و به `/install` بروید.

```bash
# نصب وابستگی‌ها
bun install

# روشن کردن سرور
bash .zscripts/dev.sh

# مرورگر را باز کنید به:
# http://localhost:3000/install
```

ویزارد شما را در ۵ مرحله راهنمایی می‌کند:
1. **بررسی محیط** — Node, Bun, دایرکتوری‌ها، Prisma
2. **پیکربندی دیتابیس** — SQLite (توسعه) یا PostgreSQL (تولید)
3. **ساخت ادمین** — نام، موبایل، رمز قوی (با نشانگر قدرت)
4. **تنظیمات سایت** — آدرس، عنوان، ایمیل
5. **امنیت** — SESSION_SECRET خودکار (۲۵۶ بیت) + قفل نصب

پس از نصب، ویزارد قفل می‌شود (فایل `.installed`) و به صفحه ورود هدایت می‌شود.

### روش ۲: نصب دستی (برای توسعه سریع)

```bash
# ۱. نصب وابستگی‌ها
bun install

# ۲. کپی متغیرهای محیطی
cp .env.example .env

# ۳. اعمال اسکیمای دیتابیس
bunx prisma db push --accept-data-loss

# ۴. اجرای seed (ادمین + نقش‌ها + تم + تنظیمات)
bunx tsx scripts/seed.ts

# ۵. اجرای seed دوره‌ها (۹ دوره + ترجمه انگلیسی)
bunx tsx scripts/seed-courses.ts
bunx tsx scripts/seed-en-translations.ts

# ۶. راه‌اندازی سرور توسعه (ترمینال جدا)
bash .zscripts/dev.sh
```

سایت روی `http://localhost:3000` در دسترس است.

#### ۷. محتوای نمونه (اختیاری — با سرور روشن اجرا شود)

بلاگ، دسته‌بندی‌ها، برچسب‌ها و صفحات ساکن از طریق API ساخته می‌شوند:

```bash
ADMIN_PHONE=09121234567 ADMIN_PASSWORD=Neeleh@1404 node scripts/seed-content.mjs
bunx tsx scripts/seed-en-cats-tags.ts
bunx tsx scripts/seed-en-posts.ts
bunx tsx scripts/seed-en-excerpts.ts
```

### دیتابیس آماده (میان‌بر)

فایل `db/custom.db` همراه ریپو است — اگر کلون کردید، بعد از `bun install`
و `cp .env.example .env` سایت **بدون هیچ seed** کاملاً آماده است (۹ دوره،
۶ مقاله دوزبانه، ادمین و تنظیمات).

اگر دیتابیس به‌هم ریخت یا خالی شد، با یک دستور از روی seedها بازسازی می‌شود
(نیازمند سرور روشن):

```bash
bash scripts/restore-db.sh
```

### ورود ادمین پیش‌فرض
- شماره موبایل: `09121234567`
- رمز عبور: `Neeleh@1404`
- مسیر پنل: `/dashboard`

---

## 🏗️ معماری

### استک فناوری
- **فریم‌ورک**: Next.js 16 (App Router, Turbopack)
- **زبان**: TypeScript
- **دیتابیس**: Prisma ORM (SQLite در توسعه / PostgreSQL در تولید)
- **احراز هویت**: Cookie httpOnly + HMAC-SHA256 + scrypt (بدون وابستگی خارجی)
- **استایل**: Tailwind CSS 4
- **انیمیشن**: Framer Motion
- **آیکون‌ها**: Lucide React

### ساختار پروژه

```
src/
├── app/
│   ├── (public)              ← صفحات عمومی
│   │   ├── page.tsx          ← صفحه اصلی (Server Component، پویا)
│   │   ├── courses/          ← کاتالوگ دوره‌ها + صفحه تک‌دوره
│   │   ├── register/[slug]/  ← فرم ثبت‌نام دوره
│   │   ├── blog/             ← بلاگ عمومی
│   │   ├── page/[slug]/      ← صفحات ساکن (درباره ما، ...)
│   │   └── login/            ← صفحه ورود
│   ├── dashboard/            ← پنل مدیریت (نیازمند ADMIN/EDITOR)
│   │   ├── layout.tsx       ← Sidebar + auth guard
│   │   ├── page.tsx          ← داشبورد (آمار)
│   │   ├── courses/          ← CRUD دوره‌ها + ویرایشگر
│   │   ├── registrations/    ← مدیریت ثبت‌نام + خروجی اکسل
│   │   ├── leads/            ← مدیریت لیدها
│   │   ├── files/            ← آپلود و مدیریت فایل
│   │   ├── posts/            ← ویرایشگر مقالات + Markdown
│   │   ├── comments/         ← مدیریت نظرات
│   │   ├── pages/            ← صفحات ساکن
│   │   ├── users/            ← مدیریت کاربران + نقش‌ها
│   │   ├── roles/            ← مدیریت نقش‌ها + مجوزها
│   │   ├── theme/            ← تنظیمات تم (رنگ، فونت، حالت)
│   │   └── settings/         ← تنظیمات محتوای صفحه اصلی
│   ├── panel/                ← پنل هنرجو (نیازمند STUDENT)
│   └── api/                  ← API Routes (30+ endpoint)
│       ├── auth/             ← login, logout, me
│       ├── register/         ← ثبت‌نام دوره
│       ├── leads/            ← فرم مشاوره (عمومی)
│       ├── comments/         ← نظر بازدیدکننده (عمومی)
│       ├── courses/          ← کاتالوگ عمومی
│       ├── posts/            ← مقالات عمومی
│       ├── pages/            ← صفحات ساکن عمومی
│       ├── panel/            ← پروفایل + دوره‌های هنرجو
│       └── dashboard/        ← CRUD ادمین (courses, registrations, leads, ...)
├── components/
│   ├── (portfolio)           ← کامپوننت‌های پورتفولیو (دست‌نخورده)
│   ├── dashboard-sidebar.tsx
│   ├── course-editor.tsx
│   ├── registrations-table.tsx
│   ├── leads-table.tsx
│   ├── files-manager.tsx
│   ├── post-editor.tsx
│   ├── page-editor.tsx
│   ├── roles-manager.tsx
│   ├── users-manager.tsx
│   ├── comments-moderator.tsx
│   ├── settings-editor.tsx
│   ├── register-form.tsx
│   ├── lead-form.tsx
│   ├── profile-editor.tsx
│   ├── home-*.tsx           ← بخش‌های پویای صفحه اصلی
│   └── site-footer.tsx
├── lib/
│   ├── db.ts                 ← Prisma client singleton
│   ├── auth.ts               ← scrypt + session + cookie
│   ├── permissions.ts        ← 29 مجوز در ۹ گروه
│   ├── settings.ts           ← تنظیمات key-value با fallback
│   └── format.ts            ← قالب‌بندی فارسی (تاریخ، قیمت، ارقام)
├── hooks/
│   └── use-toast.ts
└── middleware.ts             ← محافظت مسیرها (/dashboard, /panel, /login)
```

### مدل‌های دیتابیس (۱۹ مدل)

| گروه | مدل‌ها |
|---|---|
| کاربران | User, Role, Permission, UserRole, RolePermission, Session |
| دوره‌ها | Course, CourseSection, CourseSession, CourseResource |
| ثبت‌نام | Registration, Attendance |
| لیدها | Lead |
| فایل‌ها | FileAsset |
| تنظیمات | Setting, ThemeSetting |
| وبلاگ | Post, Category, Tag, PostCategory, PostTag, Comment |
| صفحات | StaticPage |
| آینده | Product |

---

## 🔐 امنیت

- **رمز عبور**: با `scrypt` هش می‌شود (salt تصادفی ۱۶ بایت)
- **نشست**: توکن HMAC-SHA256 در کوکی httpOnly، TTL ۳۰ روز
- **ابطال‌پذیری**: نشست‌ها در دیتابیس ذخیره می‌شوند — logout از همه دستگاه‌ها
- **مجوزها**: ۲۹ مجوز در ۹ گروه، نقش ADMIN همیشه دسترسی کامل
- **محافظت مسیر**: middleware برای `/dashboard`, `/panel`, `/login`
- **upload امن**: بررسی MIME type، حداکثر ۵۰ مگابایت

---

## 🌐 استقرار روی سرور واقعی

### گام ۱: آماده‌سازی سرور (Ubuntu/Debian)

```bash
# نصب Node.js 20+ و Bun
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs
curl -fsSL https://bun.sh/install | bash

# نصب PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# ساخت دیتابیس و کاربر
sudo -u postgres psql <<EOF
CREATE USER neeleh WITH PASSWORD 'your-strong-password';
CREATE DATABASE neeleh OWNER neeleh;
GRANT ALL PRIVILEGES ON DATABASE neeleh TO neeleh;
EOF
```

### گام ۲: استقرار کد

```bash
# کلون پروژه
git clone <repo-url> /var/www/neeleh
cd /var/www/neeleh

# نصب وابستگی‌ها
bun install

# تنظیم متغیرهای محیطی
cp .env.example .env
nano .env
# ← DATABASE_URL="postgresql://neeleh:your-password@localhost:5432/neeleh"
# ← SESSION_SECRET="<openssl rand -hex 32>"
# ← NEXT_PUBLIC_SITE_URL="https://neeleh.academy"

# اعمال اسکیمای دیتابیس
bunx prisma db push --accept-data-loss
bunx prisma generate

# اجرای seed
bunx tsx scripts/seed.ts
bunx tsx scripts/seed-courses.ts

# build پروژه
bun run build
```

### گام ۳: اجرا با PM2

```bash
# نصب PM2
sudo npm install -g pm2

# اجرا
pm2 start "bun .next/standalone/server.js" --name neeleh
pm2 save
pm2 startup
```

### گام ۴: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name neeleh.academy www.neeleh.academy;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name neeleh.academy www.neeleh.academy;

    ssl_certificate /etc/letsencrypt/live/neeleh.academy/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/neeleh.academy/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # فایل‌های آپلودشده — حداکثر ۵۰ مگابایت
    client_max_body_size 50M;
}
```

### گام ۵: SSL با Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d neeleh.academy -d www.neeleh.academy
```

---

## 📊 نقشه سایت

### صفحات عمومی
- `/` — صفحه اصلی (پویا: دوره‌های برجسته، مشاوره، بلاگ)
- `/courses` — کاتالوگ دوره‌ها (با فیلتر سطح)
- `/courses/[slug]` — صفحه تک‌دوره (سرفصل‌ها، خروجی‌ها، ثبت‌نام)
- `/register/[slug]` — فرم ثبت‌نام دوره
- `/blog` — فهرست مقالات
- `/blog/[slug]` — مقاله کامل (Markdown)
- `/page/[slug]` — صفحات ساکن (درباره ما، تماس، قوانین)
- `/login` — ورود (موبایل + رمز)

### پنل هنرجو (نیازمند STUDENT)
- `/panel` — پروفایل + دوره‌های من + فایل‌ها + حضور و غیاب

### پنل مدیریت (نیازمند ADMIN/EDITOR)
- `/dashboard` — داشبورد آماری
- `/dashboard/courses` — CRUD دوره‌ها
- `/dashboard/registrations` — مدیریت ثبت‌نام + خروجی اکسل
- `/dashboard/leads` — مدیریت لیدها
- `/dashboard/files` — آپلود و مدیریت فایل
- `/dashboard/posts` — ویرایشگر مقالات
- `/dashboard/comments` — مدیریت نظرات
- `/dashboard/pages` — صفحات ساکن
- `/dashboard/users` — مدیریت کاربران + نقش‌ها
- `/dashboard/roles` — نقش‌ها + مجوزها
- `/dashboard/theme` — تنظیمات تم
- `/dashboard/settings` — تنظیمات محتوا

---

## 🔧 دستورات مفید

```bash
# توسعه
bash .zscripts/dev.sh          # سرور توسعه با پاک کردن کش
bun run dev                     # سرور توسعه معمولی

# دیتابیس
bunx prisma db push             # اعمال schema
bunx prisma generate            # تولید client
bunx tsx scripts/seed.ts        # seed ادمین + نقش‌ها + تم + تنظیمات
bunx tsx scripts/seed-courses.ts  # seed ۹ دوره

# build
bun run build                   # build production
bun run start                    # اجرای production

# پاک‌سازی
rm -rf .next                    # پاک کردن کش Turbopack
pkill -f "next dev"              # kill سرور dev
```

---

## 📝 مجوزها (۲۹ مجوز در ۹ گروه)

| گروه | مجوزها |
|---|---|
| دوره‌ها | view, create, update, delete, publish |
| ثبت‌نام | view, update, delete, export |
| لیدها | view, update, delete |
| فایل‌ها | upload, delete |
| کاربران | view, create, update, delete |
| نقش‌ها | role.manage |
| تنظیمات | setting.manage, theme.manage |
| وبلاگ | post.view, create, update, delete, publish, comment.moderate |
| صفحات | page.manage |
| هنرجو | panel.view |

نقش‌های پیش‌فرض:
- **ADMIN** — همه ۲۹ مجوز (سیستمی، قابل حذف نیست)
- **EDITOR** — ۱۶ مجوز محتوایی (سیستمی)
- **STUDENT** — فقط panel.view (سیستمی)

---

## 🎨 سفارشی‌سازی

### تغییر رنگ‌ها و فونت‌ها
به `/dashboard/theme` بروید — بدون نیاز به کدنویسی:
- ۵ رنگ قابل تنظیم (پس‌زمینه، متن، primary، اکسنت، muted)
- ۳ حالت (روشن، تیره، خودکار)
- ۵ فونت قابل انتخاب
- CSS سفارشی (پیشرفته)

### تغییر محتوای صفحه اصلی
به `/dashboard/settings` بروید:
- عنوان و زیرعنوان هیرو
- شعار و معرفی
- اطلاعات تماس (تلفن، ایمیل، آدرس، ساعات)
- آمار (سال تجربه، تعداد دوره، فارغ‌التحصیلان)
- شبکه‌های اجتماعی

### افزودن دوره جدید
به `/dashboard/courses` → «دوره جدید»:
- اطلاعات پایه (عنوان، سطح، دسته، توضیح)
- تگ‌ها و خروجی‌ها
- سرفصل‌ها (آکاردئون چندتایی)
- جزئیات (مدت، قیمت، ظرفیت)

---

## 📞 پشتیبانی

برای سوالات فنی یا گزارش باگ، با آکادمی نیله در تماس باشید.
