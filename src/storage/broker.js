const Topic = require('./topic');
const fs = require('fs');
const {createCRC} = require('../utils/payload.util');

class Broker{
    constructor(id){
        this.id = id;
        this.topics = new Map();
    }
}