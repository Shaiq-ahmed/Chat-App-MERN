const mongoose = require('mongoose');

function validateExtraFields(schema) {
    function checkExtraFields(doc, next) {
        const schemaFields = Object.keys(schema.paths);
        const extraFields = Object.keys(doc).filter(field => !schemaFields.includes(field));

        if (extraFields.length > 0) {
            return next(new Error(`These fields are not allowed: ${extraFields.join(', ')}`));
        }

        next();
    }

    // Pre-save middleware
    schema.pre('save', function (next) {
        checkExtraFields(this.toObject({ getters: true }), next);
    });

    // Pre-update middleware
    function preUpdate(next) {
        const update = this.getUpdate();
        if (update.$set) {
            checkExtraFields(update.$set, next);
        } else {
            checkExtraFields(update, next);
        }
    }

    schema.pre('updateOne', preUpdate);
    schema.pre('updateMany', preUpdate);
    schema.pre('findOneAndUpdate', preUpdate);
    schema.pre('update', preUpdate);
}

module.exports = validateExtraFields;
