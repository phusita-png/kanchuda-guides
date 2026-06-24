/**
 * ตัวรับ "หนังสือส่งมอบงาน" ที่ลูกค้าเซ็น (จากหน้า handover-letter.html)
 * ─────────────────────────────────────────────────────────────────
 * หน้าที่: รับข้อมูลที่พิมพ์ + รูปลายเซ็น 2 ช่อง → เก็บลง Google Sheet
 *          + เซฟรูปลายเซ็นลง Google Drive + ส่งอีเมลแจ้งผู้พัฒนา
 *
 * วิธี deploy: Deploy → New deployment → Web app
 *   • Execute as:    Me (เจ้าของบัญชี)
 *   • Who has access: Anyone
 *   → copy ลิงก์ /exec ไปวางใน handover-letter.html (ค่า RECEIVER_URL)
 *
 * ครั้งแรกต้องกด Run ฟังก์ชัน setup() 1 ครั้งเพื่ออนุญาตสิทธิ์
 * (Sheet + Drive + ส่งอีเมล) แล้วระบบจะสร้างชีต+โฟลเดอร์ให้อัตโนมัติ
 */

var NOTIFY_EMAIL = 'phusita@moodata.me';                 // อีเมลรับแจ้งเตือน
var SHEET_TAB    = 'หนังสือส่งมอบ';                       // ชื่อแท็บในชีต
var FOLDER_NAME  = 'หนังสือส่งมอบงาน (ลายเซ็น)';          // โฟลเดอร์เก็บลายเซ็นใน Drive

/** กดปุ่ม Run อันนี้ 1 ครั้งหลังวางโค้ด เพื่ออนุญาตสิทธิ์ + สร้างชีต/โฟลเดอร์ */
function setup(){
  var ss = getSS_();
  getSheet_(ss);
  getFolder_();
  Logger.log('พร้อมใช้งาน · ชีต: ' + ss.getUrl());
}

/** รับข้อมูลจากหน้าเว็บ (POST) */
function doPost(e){
  try{
    var data = JSON.parse(e.postData.contents);
    var ss     = getSS_();
    var sheet  = getSheet_(ss);
    var folder = getFolder_();
    var now    = new Date();
    var stamp  = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyyMMdd-HHmmss');

    // เซฟลายเซ็น 2 รูป (ถ้ามี)
    var sig1Url = saveSig_(folder, data.sig1, 'ผู้ส่งมอบ_' + stamp);
    var sig2Url = saveSig_(folder, data.sig2, 'ผู้รับมอบ_' + stamp);

    // เก็บลงชีต 1 แถว = 1 ฉบับ
    sheet.appendRow([
      now,
      data.docNo || '', data.docDate || '',
      data.recipient || '', data.recipientPos || '',
      data.senderName || '', data.senderDate || '', sig1Url || '(ไม่มี)',
      data.receiverName || '', data.receiverDate || '', sig2Url || '(ไม่มี)'
    ]);

    sendMail_(data, sig1Url, sig2Url, ss.getUrl());
    return json_({ ok: true });
  }catch(err){
    // แจ้งผู้พัฒนาแม้เกิด error จะได้ไม่หายเงียบ
    try{ MailApp.sendEmail(NOTIFY_EMAIL, '⚠️ หนังสือส่งมอบ — รับข้อมูลพลาด', String(err)); }catch(_){}
    return json_({ ok: false, error: String(err) });
  }
}

/** เปิด URL ตรง ๆ (ทดสอบว่า deploy แล้วทำงาน) */
function doGet(){
  return json_({ ok: true, msg: 'handover receiver พร้อมใช้งาน' });
}

// ───────── helpers ─────────

function json_(o){
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSS_(){
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SS_ID');
  if(id){
    try{ return SpreadsheetApp.openById(id); }catch(_){}
  }
  var ss = SpreadsheetApp.create('หนังสือส่งมอบงาน — ข้อมูลที่เซ็นรับ');
  props.setProperty('SS_ID', ss.getId());
  return ss;
}

function getSheet_(ss){
  var sh = ss.getSheetByName(SHEET_TAB);
  if(!sh){
    sh = ss.insertSheet(SHEET_TAB);
    // ลบแท็บ default "ชีต1"/"Sheet1" ถ้ามีและว่าง
    var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('ชีต1');
    sh.appendRow([
      'เวลาส่ง', 'เลขที่หนังสือ', 'วันที่หนังสือ', 'ผู้รับมอบ', 'ตำแหน่ง',
      'ผู้ส่งมอบ (ชื่อ)', 'วันที่ผู้ส่ง', 'ลายเซ็นผู้ส่ง',
      'ผู้รับมอบ (ชื่อ)', 'วันที่ผู้รับ', 'ลายเซ็นผู้รับ'
    ]);
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
    if(def && def.getLastRow() === 0){ ss.deleteSheet(def); }
  }
  return sh;
}

function getFolder_(){
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if(id){
    try{ return DriveApp.getFolderById(id); }catch(_){}
  }
  var folder = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', folder.getId());
  return folder;
}

/** แปลง dataURL (base64 PNG) → ไฟล์รูปใน Drive · คืนลิงก์เปิดดู */
function saveSig_(folder, dataUrl, name){
  if(!dataUrl || String(dataUrl).indexOf('data:image') !== 0) return '';
  var parts = String(dataUrl).split(',');
  var bytes = Utilities.base64Decode(parts[1]);
  var blob  = Utilities.newBlob(bytes, 'image/png', name + '.png');
  var file  = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function sendMail_(data, sig1Url, sig2Url, ssUrl){
  var subject = '📩 มีคนเซ็นรับหนังสือส่งมอบงาน — ' + (data.recipient || '(ไม่ระบุชื่อ)');
  var html =
    '<div style="font-family:Sarabun,sans-serif;color:#2b2b2b;max-width:560px">' +
      '<h2 style="color:#5A3A23;margin:0 0 12px">✅ หนังสือส่งมอบงานถูกเซ็นรับแล้ว</h2>' +
      '<table style="border-collapse:collapse;width:100%;font-size:14px">' +
        row_('เลขที่หนังสือ', (data.docNo || '-') + ' /2569') +
        row_('วันที่หนังสือ', data.docDate || '-') +
        row_('ผู้รับมอบ', (data.recipient || '-') + ' (' + (data.recipientPos || '-') + ')') +
        row_('บริษัท', 'กานต์ชุดา (ไทยแลนด์) จำกัด') +
      '</table>' +
      '<hr style="border:none;border-top:1px solid #d9cbbb;margin:16px 0">' +
      '<p style="margin:6px 0"><b>ลายเซ็นผู้ส่งมอบ:</b> ' + (data.senderName || '-') +
        ' &nbsp; ' + (sig1Url ? '<a href="' + sig1Url + '">🖊️ ดูลายเซ็น</a>' : '(ไม่มีลายเซ็น)') + '</p>' +
      '<p style="margin:6px 0"><b>ลายเซ็นผู้รับมอบ:</b> ' + (data.receiverName || '-') +
        ' &nbsp; ' + (sig2Url ? '<a href="' + sig2Url + '">🖊️ ดูลายเซ็น</a>' : '(ไม่มีลายเซ็น)') + '</p>' +
      '<hr style="border:none;border-top:1px solid #d9cbbb;margin:16px 0">' +
      '<p style="font-size:13px"><a href="' + ssUrl + '">📄 เปิดตารางข้อมูลทั้งหมด (Google Sheet)</a></p>' +
    '</div>';
  MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: subject, htmlBody: html });
}

function row_(k, v){
  return '<tr>' +
    '<td style="padding:5px 10px;border:1px solid #d9cbbb;background:#F3E5D3;font-weight:600;color:#5A3A23;white-space:nowrap">' + k + '</td>' +
    '<td style="padding:5px 10px;border:1px solid #d9cbbb">' + v + '</td>' +
  '</tr>';
}
