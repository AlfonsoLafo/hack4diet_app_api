const { Schema, model } = require('mongoose');

const MisionSchema = new Schema({
    idMision: { 
        type: Schema.Types.ObjectId, 
        ref: 'ListaMisiones', 
        required: true 
    },
    idUsuario: { 
        type: Schema.Types.ObjectId, 
        ref: 'Usuario', 
        required: true
    },
    fecha: { 
        type: Date, 
        required: true 
    },
    estado: { 
        type: String, 
        enum: ['PENDIENTE', 'COMPLETADA', 'FALLIDA'], 
        default: 'PENDIENTE' 
    },
    puntosOtorgados: { 
        type: Number, 
        default: 0 
    }
    }, { collection: 'mision' }
);


MisionSchema.method('toJSON', function(){
    const { __v, _id, ...object } = this.toObject();
    
    object.uid = _id;
    return object;
});

module.exports = model('Mision', MisionSchema);
