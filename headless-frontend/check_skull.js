const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const idToFind = 'id="comp-lz8p89zm"';
const idx = html.indexOf(idToFind);
if (idx !== -1) {
    fs.writeFileSync('tmp_skull.txt', html.slice(Math.max(0, idx - 50), idx + 1000));
} else {
    // maybe it is a class or background layer
    const classIdx = html.indexOf('comp-lz8p89zm');
    if (classIdx !== -1) {
        fs.writeFileSync('tmp_skull.txt', html.slice(Math.max(0, classIdx - 50), classIdx + 1000));
    } else {
        fs.writeFileSync('tmp_skull.txt', 'NOT FOUND');
    }
}
