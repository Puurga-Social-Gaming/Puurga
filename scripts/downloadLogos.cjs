const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function downloadLogos() {
  try {
    console.log('🔍 Accessing Logos bucket...');
    
    // List all files in the Logos bucket
    const { data: files, error } = await supabase.storage
      .from('Logos')
      .list();
    
    if (error) {
      console.error('❌ Error listing files:', error);
      return;
    }
    
    console.log('📁 Files found in Logos bucket:', files);
    
    // Download each file
    for (const file of files) {
      console.log(`⬇️  Downloading ${file.name}...`);
      
      const { data, error: downloadError } = await supabase.storage
        .from('Logos')
        .download(file.name);
      
      if (downloadError) {
        console.error(`❌ Error downloading ${file.name}:`, downloadError);
        continue;
      }
      
      // Save to logos directory
      const filePath = path.join(__dirname, '../public/images/logos', file.name);
      fs.writeFileSync(filePath, data);
      console.log(`✅ Saved ${file.name} to ${filePath}`);
    }
    
    console.log('🎉 All logos downloaded successfully!');
    
  } catch (error) {
    console.error('❌ Error accessing Logos bucket:', error);
  }
}

downloadLogos();
