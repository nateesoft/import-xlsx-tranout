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

-- รันใน MySQL 5.0 server
SET old_passwords = 0;
SET PASSWORD FOR 'your_user'@'%' = PASSWORD('your_password');
FLUSH PRIVILEGES;


รันคำสั่งเหล่านี้ใน MySQL CLI บนเครื่อง Windows (ที่มี MySQL 5.0.21) ครับ:


-- ตรวจค่า config ที่เกี่ยวข้องกับ authentication ทั้งหมด
SHOW VARIABLES LIKE 'old_passwords';
SHOW VARIABLES LIKE 'secure_auth';
SHOW VARIABLES LIKE 'version';
ผลที่ต้องการเห็น สำหรับ old password (length=16):

Variable	ค่าที่ควรเป็น
old_passwords	ON หรือ 1
secure_auth	OFF หรือ 0
ถ้า secure_auth = ON — นี่คือสาเหตุ ER_HANDSHAKE_ERROR ครับ

MySQL server ปฏิเสธ connection ที่ใช้ old password โดยสิ้นเชิง แก้ได้สองทาง:

ทาง 1: แก้ที่ server — เพิ่มใน my.ini (Windows) แล้ว restart MySQL:


[mysqld]
secure_auth=0
old_passwords=1
ทาง 2: reset password ให้เป็น new-style (length=41) แล้วใช้ insecureAuth: false:


SET old_passwords = 0;
SET PASSWORD FOR 'user'@'%' = PASSWORD('your_password');
ตรวจสอบ user ด้วย:


SELECT user, host, password, length(password) FROM mysql.user;
