const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const idToFind = 'id="comp-lx95a8rh"';
const idx = html.indexOf(idToFind);
if (idx !== -1) {
    fs.writeFileSync('tmp_img.txt', html.slice(Math.max(0, idx - 50), idx + 1000));
} else {
    console.log("NOT FOUND");
}
