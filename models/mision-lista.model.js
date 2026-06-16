const { Schema, model } = require('mongoose');

const ListaMisionesSchema = new Schema({
    descripcion: {
        type: String,
        required: true
    },
    puntosMin: {
        type: Number,
        required: true
    },
    puntosMax: {
        type: Number,
        required: true
    }
});

ListaMisionesSchema.method('toJSON', function(){
    const { __v, _id, ...object } = this.toObject();
    
    object.uid = _id;
    return object;
});


module.exports = model('ListaMisiones', ListaMisionesSchema);