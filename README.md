สำหรับ script ติดตั้ง
0. ติดตั้ง nodejs สำหรับ windows ก่อน download ที่:
https://nodejs.org/dist/v24.16.0/node-v24.16.0-arm64.msi
    => double click ติดตั้งให้เรียบร้อย next อย่างเดียว
    => ทดสอบ version โดยเปิด command line ขึ้นมาพิมพ์ node --version
       ถ้า version แสดง แสดงว่าติดตั้งเรียบร้อย
1. ติดตั้ง PM2 Startup บน Windows
    => พิมพ์ pm2-windows-startup
    => พิมพ์ npm install -g pm2-windows-startup
    => พิมพ์ pm2-startup install
2. double click ไฟล์ install-apps.bat แล้วรอมัน build web สักครู่
3. หลังจากข้อ 2 เรียบร้อย จะมี folder import-xlsx-tranout แสดง
    => comnand line เข้าไที่ folder import-xlsx-tranout
    => พิมพ์ pm2 start ecosystem.config.cjs
    => ทดสอบเรียก website ที่ http://localhost:3000 ถ้าเข้าได้แสดงว่าติดตั้งเรียบร้อย
4. pm2 save สำหรับบันทึกค่าไว้ หลังจาก restart windows โปรแกรมจะทำงานอัตโนมัติ
5. ติดตั้ง app ใน browser เป็น application desktop ได้จาก chrome

#####################################

0. ติดตั้ง nodejs สำหรับ windows ก่อน
https://nodejs.org/dist/v24.16.0/node-v24.16.0-arm64.msi

1. ติดตั้ง PM2 Startup บน Windows
ติดตั้ง pm2-windows-startup

npm install -g pm2-windows-startup
pm2-startup install

2. Start app แล้ว save state

# รัน app ก่อน
npm run pm2:start

# บันทึก process list ให้ PM2 จำ
pm2 save
ทุกครั้งที่ Windows บูต PM2 จะ auto-start process ที่ save ไว้อัตโนมัติครับ
