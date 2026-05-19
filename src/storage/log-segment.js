const fs = require('fs');
const path = require('path');

class LogSegment{
    constructor(topicDir, baseOffset, maxBytes=10*1024*1024, mode = 'write'){
        this.baseOffset = baseOffset;
        this.maxBytes = maxBytes;
        this.mode = mode;
        
        const fileNameBase = baseOffset.toString().padStart(20, '0');
        this.logPath = path.join(topicDir, `${fileNameBase}.log`);
        this.indexPath = path.join(topicDir, `${fileNameBase}.index`);

        if(!fs.existsSync(this.logPath)){
            fs.writeFileSync(this.logPath, '');
        }

        if(!fs.existsSync(this.indexPath)){
            fs.writeFileSync(this.indexPath, '');
        }
        
        this.fileFlag = (mode==='write')?'a+':'r';

        try{
            this.logFd = fs.openSync(this.logPath, this.fileFlag);
            this.indexFd = fs.openSync(this.indexPath, this.fileFlag);
        } catch(error){
            throw error;
        }

        const stats = fs.fstatSync(this.logFd);
        this.currentBytes= stats.size;
    }

    isFull(){
        return (this.currentBytes >= this.maxBytes);
    }

    changeFileStatus(status){
        this.fileFlag = (status==='write')?'a+':'r';
        this.mode = status;
    }
}

module.exports = LogSegment;