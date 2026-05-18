const fs = require('fs');
const path = require('path');

class LogSegment{
    constructor(topicDir, baseOffset, maxBytes=10*1024*1024){
        this.baseOffset = baseOffset;
        this.maxBytes = maxBytes;
        
        const fileNameBase = baseOffset.toString().padStart(20, '0');
        this.logPath = path.join(topicDir, `${fileNameBase}.log`);
        this.indexPath = path.join(topicDir, `${fileNameBase}.index`);
    }
}

module.exports = LogSegment;