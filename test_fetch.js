async function checkImage() {
  const res = await fetch("https://dhetcnkvgtuatcchropm.supabase.co/storage/v1/object/public/site-assets/sponsors/1776980526705-gqh7t.webp");
  console.log("Status:", res.status);
}
checkImage();
