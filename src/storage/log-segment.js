const fs = require('fs');
const path = require('path');

class LogSegment{
    constructor(topicDir, baseOffset, maxBytes=10*1024*1024, mode = 'write'){
        this.baseOffset = baseOffset;
        this.maxBytes = maxBytes;
        
        const fileNameBase = baseOffset.toString().padStart(20, '0');
        this.logPath = path.join(topicDir, `${fileNameBase}.log`);
        this.indexPath = path.join(topicDir, `${fileNameBase}.index`);

        const fileFlag = (mode==='write')?'a+':'r';
        
        const stats = fs.statSync(this.logPath);
        this.currentBytes= stats.size;
    }

    isFull(){
        return (this.currentBytes >= this.maxBytes);
    }
}

module.exports = LogSegment;