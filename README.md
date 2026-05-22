#####################################
สำหรับ script ติดตั้ง
1. ติดตั้ง nodejs สำหรับ windows ก่อน download ที่:
https://nodejs.org/dist/v24.16.0/node-v24.16.0-arm64.msi
    => double click ติดตั้งให้เรียบร้อย next อย่างเดียว
    => ทดสอบ version โดยเปิด command line ขึ้นมาพิมพ์ node --version
       ถ้า version แสดง แสดงว่าติดตั้งเรียบร้อย
2. ติดตั้ง git สำหรับ windows dowload ที่:
    => https://github.com/git-for-windows/git/releases/download/v2.54.0.windows.1/Git-2.54.0-64-bit.exe
3. ติดตั้ง PM2 Startup บน Windows
    => พิมพ์ pm2-windows-startup
    => พิมพ์ npm install -g pm2-windows-startup
    => พิมพ์ pm2-startup install
4. double click ไฟล์ install-apps.bat แล้วรอมัน build web สักครู่ (จะต้องมีขั้นตอน 1,2,3 ก่อน)
5. หลังจากข้อ 4 เรียบร้อย จะมี folder import-xlsx-tranout แสดง
    => comnand line เข้าไที่ folder import-xlsx-tranout
    => พิมพ์ pm2 start ecosystem.config.cjs
    => พิมพ์ pm2 save
    => ทดสอบเรียก website ที่ http://localhost:3000 ถ้าเข้าได้แสดงว่าติดตั้งเรียบร้อย
6. pm2 save สำหรับบันทึกค่าไว้ หลังจาก restart windows โปรแกรมจะทำงานอัตโนมัติ
7. ติดตั้ง app ใน browser เป็น application desktop ได้จาก chrome

#####################################
