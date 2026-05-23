const lowerBound = (arr, target)=>{
    let low = 0;
    let high = arr.length-1;
    let floorIndex = 0;

    while(low<=high){
        const mid = (low+high)>>1;
        const currentOffset = arr[mid].baseOffset;

        if(currentOffset == target) return currentOffset;
        else if(currentOffset<target){
            floorIndex = mid;
            low = mid+1;
        }
        else{
            high = mid-1;
        }
    }

    return [floorIndex, arr[floorIndex].baseOffset];
}

module.exports = {
    lowerBound
}