#!/bin/bash
# Post-fix verification batch — EN mode, everything in ONE call.
set -u
cd /home/z/my-project

pkill -f "chrome" 2>/dev/null; sleep 1
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
mkdir -p /tmp/shots2 && rm -f /tmp/shots2/*.png

NODE_OPTIONS="--max-old-space-size=1536" nohup setsid bun run dev </dev/null > /tmp/devserver.log 2>&1 &
disown
for i in $(seq 1 50); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 http://localhost:3000/ 2>/dev/null)
  [ "$code" = "200" ] && { echo "server ready ${i}s"; break; }
  sleep 1
done

slug=$(bun -e 'import {PrismaClient} from "@prisma/client"; const db=new PrismaClient(); db.course.findMany({take:1,select:{slug:true}}).then(r=>{console.log(r[0]?.slug||""); process.exit(0)}).catch(()=>{console.log(""); process.exit(0)})' 2>/dev/null | tail -1)
echo "slug=$slug"

agent-browser close >/dev/null 2>&1
agent-browser open http://localhost:3000/login >/dev/null 2>&1
sleep 3
agent-browser eval "localStorage.setItem('site-lang','en'); document.cookie='site-lang=en;path=/;max-age=31536000;samesite=lax'; 'ok'" >/dev/null 2>&1

shoot() {
  agent-browser open "$1" >/dev/null 2>&1
  agent-browser wait --load load --timeout 15000 >/dev/null 2>&1
  sleep 4
  agent-browser screenshot "/tmp/shots2/$2.png" >/dev/null 2>&1 && echo "shot $2"
}

shoot http://localhost:3000/login           v1-login
shoot http://localhost:3000/dashboard       v2-dash
shoot http://localhost:3000/dashboard/settings v3-settings
shoot http://localhost:3000/dashboard/theme v4-theme
[ -n "$slug" ] && shoot "http://localhost:3000/courses/$slug" v5-course
shoot http://localhost:3000/blog            v6-blog
shoot http://localhost:3000/why-neeleh      v7-why
shoot http://localhost:3000/paths           v8-paths

agent-browser close >/dev/null 2>&1
sleep 1
pkill -f "chrome" 2>/dev/null
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null
ls -la /tmp/shots2/
