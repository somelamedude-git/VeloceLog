const fs = require('fs');
const path = require('path');

class LogSegment {
    constructor(
        topicDir,
        baseOffset,
        maxBytes = 10 * 1024 * 1024,
        mode = 'write'
    ) {
        if (!['write', 'read'].includes(mode)) {
            throw new Error(`Invalid mode: ${mode}`);
        }

        this.baseOffset = baseOffset;
        this.maxBytes = maxBytes;
        this.mode = mode;

        const fileNameBase = String(baseOffset).padStart(20, '0');

        this.logPath = path.join(topicDir, `${fileNameBase}.log`);
        this.indexPath = path.join(topicDir, `${fileNameBase}.index`);

        this._ensureFile(this.logPath);
        this._ensureFile(this.indexPath);

        this.appendLogFd = undefined;
        this.appendIndexFd = undefined;

        this.readLogFd = undefined;
        this.readIndexFd = undefined;

        this._openReadDescriptors();

        if (this.mode === 'write') {
            this._openAppendDescriptors();
        }

        const stats = fs.fstatSync(this.readLogFd);
        this.currentBytes = stats.size;
    }

    _ensureFile(filePath) {
        const fd = fs.openSync(filePath, 'a');
        fs.closeSync(fd);
    }

    _openReadDescriptors() {
        this.readLogFd = fs.openSync(this.logPath, 'r');
        this.readIndexFd = fs.openSync(this.indexPath, 'r');
    }

    _openAppendDescriptors() {
        this.appendLogFd = fs.openSync(this.logPath, 'a+');
        this.appendIndexFd = fs.openSync(this.indexPath, 'a+');
    }

    isFull() {
        return this.currentBytes >= this.maxBytes;
    }

    _getAppendDescriptors(){
        return [this.appendIndexFd, this.appendLogFd];
    }

    _getReadDescriptors(){
        return [this.readIndexFd, this.readLogFd];
    }

    closeAppendDescriptors() {
        if (this.appendLogFd !== undefined) {
            fs.closeSync(this.appendLogFd);
            this.appendLogFd = undefined;
        }

        if (this.appendIndexFd !== undefined) {
            fs.closeSync(this.appendIndexFd);
            this.appendIndexFd = undefined;
        }
    }

    _getBaseOffset(){
        return this.baseOffset;
    }

    closeReadDescriptors() {
        if (this.readLogFd !== undefined) {
            fs.closeSync(this.readLogFd);
            this.readLogFd = undefined;
        }

        if (this.readIndexFd !== undefined) {
            fs.closeSync(this.readIndexFd);
            this.readIndexFd = undefined;
        }
    }

    close() {
        this.closeAppendDescriptors();
        this.closeReadDescriptors();
    }

    switchToReadMode() {
        this.closeAppendDescriptors();
        this.mode = 'read';
    }

    switchToWriteMode() {
        if (this.appendLogFd === undefined) {
            this._openAppendDescriptors();
        }

        this.mode = 'write';
    }
}

module.exports = LogSegment;