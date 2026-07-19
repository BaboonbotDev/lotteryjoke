# Test Report (อัปเดต v1.5.1: เพิ่ม regression test สำหรับ fortuneTwoDigit โหมด blend กับประวัติว่าง — ผ่าน)

# Test Report เดิม — v1.5.0

วันที่ทดสอบ: 19 กรกฎาคม 2569

## ผ่าน

- `node --check` สำหรับ `app.js`, `sw.js`, `server.mjs`, API functions และ test files
- ข้อมูล 716 งวด: จำนวนแถว, วันที่ไม่ซ้ำ และเรียงตามเวลา
- จับคู่ ID ที่ JavaScript อ้างถึงกับ `index.html`
- GLO latest fixture ตามโครงสร้าง `response.data.<prize>.number[].value`
- ยืนยันว่า parser ไม่อ่าน `price: "6000000"` เป็นรางวัลที่ 1
- วันที่ไทยแบบชื่อเต็ม, ชื่อย่อ, เลขไทย, พ.ศ. และ ISO
- Check API fixtures: ถูกรางวัล, ไม่ถูกรางวัล และ response คลุมเครือที่ต้องไม่เกิด false positive
- เปรียบเทียบผลเต็มงวด: รางวัลที่ 1, ข้างเคียง, 2–5, หน้า/ท้าย 3 ตัว และท้าย 2 ตัว
- การตัดข้อมูลหลังวันที่เลือกเพื่อป้องกัน look-ahead
- Server smoke test: MIME, cache policy, path traversal และ payload validation
- Service Worker cache เฉพาะ response สถานะ 200 ที่สำเร็จ

## ข้อจำกัดของการทดสอบ

สภาพแวดล้อมสร้างไฟล์ไม่สามารถ resolve DNS ไปยัง `www.glo.or.th` จึงไม่ได้ยิง endpoint จริงในรอบนี้ การทดสอบ API ใช้ response fixture ตามโครงสร้างจริงที่รายงาน และเพิ่ม fallback ผ่าน API ผลเต็มงวดตามเอกสาร GLO หาก response ของ Check API ไม่อยู่ในรูปแบบที่ parser ยืนยันได้ ระบบจะไม่เดาผล แต่จะ fallback หรือใช้ฐานข้อมูลออฟไลน์พร้อมคำเตือนแทน

- เพิ่มระบบขูดต้นมะขามจำลอง: Canvas scratch, secure random, history, copy และ compare
