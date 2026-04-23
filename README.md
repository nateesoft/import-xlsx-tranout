วิธีตั้ง PM2 Startup บน Windows
1. ติดตั้ง pm2-windows-startup


npm install -g pm2-windows-startup
pm2-startup install
2. Start app แล้ว save state


# รัน app ก่อน
npm run pm2:start

# บันทึก process list ให้ PM2 จำ
pm2 save
ทุกครั้งที่ Windows บูต PM2 จะ auto-start process ที่ save ไว้อัตโนมัติครับ
