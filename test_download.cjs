const fs = require('fs');

async function check() {
  const url = "https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/site-assets/sponsors/1776981948615-k7g6xs6.png";
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  fs.writeFileSync('test_logo.png', Buffer.from(buffer));
  console.log("Image downloaded to test_logo.png, size:", buffer.byteLength);
}
check();
