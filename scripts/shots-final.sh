#!/bin/bash
# Final dashboard verification — login + EN shots + one FA regression shot.
set -u
cd /home/z/my-project

pkill -f "chrome" 2>/dev/null; sleep 1
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
mkdir -p /tmp/shots3 && rm -f /tmp/shots3/*.png

NODE_OPTIONS="--max-old-space-size=1536" nohup setsid bun run dev </dev/null > /tmp/devserver.log 2>&1 &
disown
for i in $(seq 1 50); do
  curl -s -o /dev/null --max-time 4 http://localhost:3000/ 2>/dev/null && { echo "server ready ${i}s"; break; }
  sleep 1
done

agent-browser close >/dev/null 2>&1
agent-browser open http://localhost:3000/login >/dev/null 2>&1
sleep 3
agent-browser eval "localStorage.setItem('site-lang','en'); document.cookie='site-lang=en;path=/;max-age=31536000;samesite=lax'; 'ok'" >/dev/null 2>&1
agent-browser open http://localhost:3000/login >/dev/null 2>&1
sleep 4
agent-browser fill '#phone' '09121234567' >/dev/null 2>&1
agent-browser fill '#password' 'Neeleh@1404' >/dev/null 2>&1
agent-browser click 'button[type=submit]' >/dev/null 2>&1
agent-browser wait --url "**/dashboard**" --timeout 25000 >/dev/null 2>&1
sleep 4
echo "path: $(agent-browser eval 'location.pathname' 2>/dev/null)"

shoot() {
  agent-browser open "$1" >/dev/null 2>&1
  agent-browser wait --load load --timeout 15000 >/dev/null 2>&1
  sleep 5
  agent-browser screenshot "/tmp/shots3/$2.png" >/dev/null 2>&1 && echo "shot $2"
}

shoot http://localhost:3000/dashboard            f1-dash
shoot http://localhost:3000/dashboard/settings   f2-settings
shoot http://localhost:3000/dashboard/theme      f3-theme
shoot http://localhost:3000/dashboard/menus      f4-menus
shoot http://localhost:3000/dashboard/courses/new f5-course-new

# FA regression: switch to fa, shoot public home
agent-browser eval "localStorage.setItem('site-lang','fa'); document.cookie='site-lang=fa;path=/;max-age=31536000;samesite=lax'; 'ok'" >/dev/null 2>&1
shoot http://localhost:3000/                     f6-fa-home

agent-browser close >/dev/null 2>&1
sleep 1
pkill -f "chrome" 2>/dev/null
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null
ls -la /tmp/shots3/
