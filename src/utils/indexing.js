const {lowerBound} = require('./binarySearch');
const mmap = require('mmap-io');
const fs = require('fs');

const ENTRY_SIZE=12; 

const TreeMapLookup = (segmentOffsets, targetOffset)=>{ // assuming segment offset to be a list of BigInts
    return lowerBound(segmentOffsets, targetOffset);
}

const getRelativeOffset = (baseOffset, targetOffset)=>{
    return (targetOffset-baseOffset);
}

const getFileIndex = (indexFd, targetOffset) => {
    let buffer = null;
    try{
    const fileSize = fs.fstatSync(indexFd).size;
    const NUM_ENTRIES = fileSize / ENTRY_SIZE;
    
    buffer = mmap.map(
        NUM_ENTRIES * ENTRY_SIZE,
        mmap.PROT_READ,
        mmap.MAP_SHARED,
        indexFd,
        0
    );

    let low = 0;
    let high = NUM_ENTRIES - 1; 

    let best = -1;

    while (low <= high) {
        const mid = (low + high) >> 1;
        const offsetMid = ENTRY_SIZE * mid;
        const key = buffer.readBigInt64BE(offsetMid);

        if (key == targetOffset) {
            return buffer.readUInt32BE(offsetMid + 8);
        } else if (key < targetOffset) {
            best = mid; 
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    if (best === -1) return -1;

    let fileOffset = best * ENTRY_SIZE + 8;
    return buffer.readUInt32BE(fileOffset);
}
catch(error){
    console.log(error);
    throw error;
}
finally{
   if(buffer) mmap.unmap(buffer);
}
}

module.exports = {
    getFileIndex,
    TreeMapLookup
}