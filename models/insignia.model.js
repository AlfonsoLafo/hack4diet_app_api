const { Schema, model } = require('mongoose');

const InsigniaSchema = Schema(
    {
        nombre: {
            type: String,
            required: true
        },
        objetivo: {
            type: String,
            required: true
        },
        class: {
            type: String,
            required: true
        },
    }, { collection: 'insignias' }
);

InsigniaSchema.method('toJSON', function(){
    const { __v, _id, ...object } = this.toObject();
    
    object.uid = _id;
    return object;
});

module.exports = model('Insignia', InsigniaSchema);