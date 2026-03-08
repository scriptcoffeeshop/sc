const fs = require("fs");
const path = require("path");

function walkSync(dir, filelist = []) {
    let files = fs.readdirSync(dir);
    files.forEach(function (file) {
        let filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            filelist = walkSync(filepath, filelist);
        }
        else {
            filelist.push(filepath);
        }
    });
    return filelist;
}

const targetDir = "supabase/functions/coffee-api";
const allFiles = walkSync(targetDir).filter(f => f.endsWith(".ts"));

allFiles.forEach(file => {
    let content = fs.readFileSync(file, "utf8");
    let original = content;

    content = content.replace(/from\s+['"]zod['"]/g, "from \"npm:zod@3.22.4\"");
    content = content.replace(/from\s+['"]supabase-js['"]/g, "from \"npm:@supabase/supabase-js@2\"");
    content = content.replace(/from\s+['"]nodemailer['"]/g, "from \"npm:nodemailer@6.9.11\"");

    if (content !== original) {
        fs.writeFileSync(file, content, "utf8");
        console.log("Updated: " + file);
    }
});
