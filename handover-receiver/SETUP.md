# วิธีตั้งค่า "ตัวรับหนังสือส่งมอบงาน" (Apps Script)

ทำครั้งเดียว ~5 นาที → จากนั้นเวลามีลูกค้าเซ็นรับงานบนหน้าเว็บ
ข้อมูล+ลายเซ็นจะวิ่งเข้า Google Sheet + Drive และส่งอีเมลแจ้งพี่อัตโนมัติ

---

## ขั้นตอน

### 1) สร้างโปรเจกต์ Apps Script ใหม่
- เปิด https://script.google.com → **New project**
- ตั้งชื่อ (เช่น "Handover Receiver — กานต์ชุดา")
- ลบโค้ดเดิมใน `Code.gs` ทิ้ง → **วางโค้ดทั้งหมดจากไฟล์ `Code.gs`** ในโฟลเดอร์นี้

### 2) อนุญาตสิทธิ์ (ครั้งแรกครั้งเดียว)
- เลือกฟังก์ชัน **`setup`** ที่แถบบน → กด **▶ Run**
- จะมีหน้าต่างขออนุญาต → กด **Review permissions** → เลือกบัญชี → **Allow**
  (ระบบขอสิทธิ์ Sheet + Drive + ส่งอีเมล)
- รันเสร็จ ระบบจะสร้างชีต "หนังสือส่งมอบงาน — ข้อมูลที่เซ็นรับ" + โฟลเดอร์ลายเซ็นให้เอง

### 3) Deploy เป็น Web App
- กด **Deploy** (มุมขวาบน) → **New deployment**
- ไอคอนเฟือง ⚙️ → เลือก **Web app**
- ตั้งค่า:
  - **Execute as:** `Me` (บัญชีพี่)
  - **Who has access:** `Anyone`  ← สำคัญ (ลูกค้าไม่ต้อง login)
- กด **Deploy** → copy ลิงก์ **Web app URL** (ลงท้าย `/exec`)

### 4) เอา URL ไปวางในหน้าเว็บ
- ส่งลิงก์ `/exec` นั้นมาให้ผู้พัฒนา (หนู) วางในไฟล์ `handover-letter.html`
  (บรรทัด `var RECEIVER_URL = '...'`) แล้ว push ขึ้น GitHub Pages
- หรือถ้าพี่แก้เอง: เปิด `handover-letter.html` หา `PASTE_APPS_SCRIPT_EXEC_URL_HERE`
  → แทนด้วย URL `/exec` → commit + push

---

## ทดสอบ
1. เปิดหน้า https://phusita-png.github.io/kanchuda-guides/handover-letter.html
2. กรอกชื่อผู้รับมอบ + วาดลายเซ็น 2 ช่อง
3. กดปุ่มเขียว **📤 ส่งให้ผู้พัฒนา** → ขึ้น "ส่งเรียบร้อย"
4. เช็กอีเมล phusita@moodata.me → ต้องได้เมลแจ้ง + ลิงก์ดูลายเซ็น
5. เปิดชีต → มีแถวข้อมูลใหม่

> 💡 ทดสอบเร็ว ๆ ว่า deploy ใช้ได้: เปิด URL `/exec` ตรง ๆ ในเบราว์เซอร์
> ต้องเห็น `{"ok":true,"msg":"handover receiver พร้อมใช้งาน"}`

## แก้ทีหลัง
- **เปลี่ยนอีเมลรับแจ้ง:** แก้ค่า `NOTIFY_EMAIL` ในโค้ด → Deploy ใหม่ (Manage deployments → ✏️ → Version: New)
- **แก้โค้ดแล้วต้อง redeploy:** Manage deployments → เลือก deployment → ✏️ → New version → Deploy
  (URL `/exec` เดิมไม่เปลี่ยน)
