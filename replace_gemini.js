const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    if (dir.includes('node_modules') || dir.includes('.git') || dir.includes('.next') || dir.includes('.expo') || dir.includes('android') || dir.includes('ios')) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const replaceInFile = (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.json') && !filePath.endsWith('.md') && !filePath.endsWith('.js')) return;

    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    content = content.replace(/gemini-2\.0-flash-exp/g, 'gemini-2.5-flash');
    content = content.replace(/gemini-2\.0-flash-live-001/g, 'gemini-2.5-flash-live-001');
    content = content.replace(/gemini-2\.0-flash/g, 'gemini-2.5-flash');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Updated:', filePath);
    }
};

walkDir('./backend/src', replaceInFile);
walkDir('./backend/scripts', replaceInFile);
walkDir('./expo/src', replaceInFile);
walkDir('./docs', replaceInFile);
walkDir('./otomasyonlar', replaceInFile);
