# MCP Server — آکادمی نیله

این سرور [Model Context Protocol](https://modelcontextprotocol.io) روی دیتابیس نیله است.
هر کلاینت MCP (Claude Desktop, Cursor, Continue, Cline, ...) می‌تواند به آن وصل شود و سایت را
بدون نیاز به UI دستی و از طریق پروتکل استاندارد اداره کند.

## ۳۵ ابزار در دسترس

**محتوا (نوشته‌ها):** `list_posts`, `get_post`, `create_post`, `update_post`, `publish_post`, `delete_post`
**محتوا (صفحات):** `list_pages`, `get_page`, `create_page`, `update_page`, `delete_page`
**طبقه‌بندی:** `list_categories`, `create_category`, `delete_category`, `list_tags`, `create_tag`, `delete_tag`
**دوره‌ها:** `list_courses` (read-only)
**منوها:** `list_menu_items`, `create_menu_item`, `update_menu_item`, `delete_menu_item`, `reorder_menu_items`, `reset_menus`
**تم:** `get_theme`, `update_theme`
**تنظیمات:** `get_settings`, `get_setting`, `update_setting`
**عملیات:** `list_leads`, `update_lead_status`, `list_registrations`, `update_registration_status`
**راستی‌آزمایی:** `health_check` (شامل وضعیت منوها و تم + هشدارهای هوشمند), `list_draft_content`

## اجرا

```bash
npm run mcp                  # اجرای مستقیم
node scripts/test-mcp.mjs    # تست چرخه عمر کامل (۳۲ چک: نوشته/منو/تم/تنظیمات)
```

## پیکربندی Claude Desktop

فایل `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
یا `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "neeleh": {
      "command": "node",
      "args": ["--experimental-strip-types", "--no-warnings",
               "/path/to/project/src/mcp/server.ts"]
    }
  }
}
```

بعد از ذخیره، Claude را ری‌استارت کنید — ابزارها با پیشوند `mcp__neeleh__` ظاهر می‌شوند.

## امنیت

این سرور مستقیماً به دیتابیس وصل می‌شود و معادل «اپراتور ادمین» است. فقط روی همون
سیستمی اجرا شود که فایل‌های پروژه و `.env` در آن است. هیچ کلاینت خارجی بدون دسترسی
فیزیکی به این فایل‌ها نمی‌تواند به آن وصل شود.

## معماری

- مستقیم به Prisma وصل می‌شود (نه از طریق HTTP API) — چون MCP سرور «اپراتور محلی
  مورد اعتماد» است، مثل کسی که با SSH وارد سرور شده
- اعتبارسنجی (slug یکتا، enum وضعیت‌ها، cascading) در همان ابزار پیاده شده
- تست دود (`npm run smoke`) هر بار که اجرا شود، MCP را هم چک می‌کند: initialize،
  tools/list و یک فراخوانی واقعی health_check
