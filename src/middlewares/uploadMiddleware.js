const multer = require('multer');



// Store files in RAM as a Buffer, instead of writing them to the disk

const storage = multer.memoryStorage();



// Accept both 'image' and 'video' uploads

const upload = multer({

    storage,

    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB max limit for hardware hostage videos

});