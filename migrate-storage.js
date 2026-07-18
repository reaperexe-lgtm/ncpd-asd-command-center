const { createClient } = require('@supabase/supabase-js');

// Neues Projekt (Ziel)
const NEW_URL = 'https://zoidbkodbnmtdiauruqm.supabase.co';
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvaWRia29kYm5tdGRpYXVydXFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDMzMDE2NSwiZXhwIjoyMDk5OTA2MTY1fQ.BCyEbalk6dlHzeVvlmvmNOChSceZQNykC7asEWX-A-8';

// Altes Projekt (Quelle) - öffentliche Buckets, kein Key nötig für Download
const OLD_URL = 'https://ostuzusncwkmfwzuhhmc.supabase.co';

const BUCKETS = ['avatars', 'pursuit-photos', 'assets'];

const newClient = createClient(NEW_URL, NEW_SERVICE_KEY);

// Rekursiv alle Dateien in einem Bucket auflisten (auch in Unterordnern)
async function listAllFiles(bucket, path = '') {
  const { data, error } = await newClient.storage.from(bucket).list(path, { limit: 1000 });
  if (error) {
    console.error(`Fehler beim Listen von ${bucket}/${path}:`, error.message);
    return [];
  }
  let files = [];
  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    if (item.id === null) {
      // ist ein Ordner -> rekursiv weiter
      const sub = await listAllFiles(bucket, fullPath);
      files = files.concat(sub);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function migrateBucket(bucket) {
  console.log(`\n=== Bucket: ${bucket} ===`);
  const files = await listAllFiles(bucket);
  console.log(`${files.length} Dateien gefunden.`);

  let ok = 0, failed = 0;

  for (const filePath of files) {
    const downloadUrl = `${OLD_URL}/storage/v1/object/public/${bucket}/${filePath}`;
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        console.error(`  ❌ Download fehlgeschlagen (${res.status}): ${filePath}`);
        failed++;
        continue;
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await newClient.storage
        .from(bucket)
        .upload(filePath, buffer, { upsert: true });

      if (uploadError) {
        console.error(`  ❌ Upload fehlgeschlagen: ${filePath} -> ${uploadError.message}`);
        failed++;
      } else {
        console.log(`  ✅ ${filePath}`);
        ok++;
      }
    } catch (e) {
      console.error(`  ❌ Fehler bei ${filePath}:`, e.message);
      failed++;
    }
  }

  console.log(`Bucket ${bucket}: ${ok} erfolgreich, ${failed} fehlgeschlagen.`);
}

async function main() {
  for (const bucket of BUCKETS) {
    await migrateBucket(bucket);
  }
  console.log('\nFertig!');
}

main();