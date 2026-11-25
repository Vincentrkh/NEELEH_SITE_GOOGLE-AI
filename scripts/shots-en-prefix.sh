#!/bin/bash
# Batch screenshot in EN mode — everything in ONE call because the dev server
# is killed between Bash tool calls in this sandbox.
set -u
cd /home/z/my-project

pkill -f "chrome" 2>/dev/null; sleep 1
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
mkdir -p /tmp/shots && rm -f /tmp/shots/*.png

# 1) start server (capped heap to avoid OOM kills)
NODE_OPTIONS="--max-old-space-size=1536" nohup setsid bun run dev </dev/null > /tmp/devserver.log 2>&1 &
disown
for i in $(seq 1 50); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "server ready ${i}s"; break; }
  sleep 1
done
curl -s -o /dev/null http://localhost:3000/login   # warm compile

# 2) fresh browser session, set EN before anything
agent-browser close >/dev/null 2>&1
agent-browser open http://localhost:3000/login >/dev/null 2>&1
sleep 3
agent-browser eval "localStorage.setItem('site-lang','en'); document.cookie='site-lang=en;path=/;max-age=31536000;samesite=lax'; 'ok'"
agent-browser open http://localhost:3000/login >/dev/null 2>&1
sleep 4

# 3) login
agent-browser fill '#phone' '09121234567' >/dev/null 2>&1
agent-browser fill '#password' 'Neeleh@1404' >/dev/null 2>&1
agent-browser click 'button[type=submit]' >/dev/null 2>&1
agent-browser wait --url "**/dashboard**" --timeout 20000 >/dev/null 2>&1
sleep 3
echo "after login url: $(agent-browser eval 'location.pathname' 2>/dev/null)"

# 4) dashboard pages (EN)
shoot() { # $1 url $2 name
  agent-browser open "$1" >/dev/null 2>&1
  agent-browser wait --load load --timeout 15000 >/dev/null 2>&1
  sleep 4
  agent-browser screenshot "/tmp/shots/$2.png" >/dev/null 2>&1 && echo "shot $2"
}
shoot http://localhost:3000/dashboard            d1-home
shoot http://localhost:3000/dashboard/posts      d2-posts
shoot http://localhost:3000/dashboard/registrations d3-regs
shoot http://localhost:3000/dashboard/menus      d4-menus

# 5) public pages (EN) — course slug from DB via public page HTML
slug=$(curl -s http://localhost:3000/courses | rg -o '/courses/[a-z0-9-]+' -N | head -1)
echo "slug=$slug"
shoot http://localhost:3000/                     p1-home
if [ -n "$slug" ]; then shoot "http://localhost:3000$slug" p2-course; fi
shoot http://localhost:3000/paths                p3-paths

# 6) cleanup
agent-browser close >/dev/null 2>&1
sleep 1
pkill -f "chrome" 2>/dev/null
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null
ls -la /tmp/shots/
