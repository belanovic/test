
function modifyError(error) {
    if(error.name =='MongooseError'
    || error.name =='CastError'
    || error.name =='DivergentArrayError'
    || error.name =='MissingSchemaError'
    || error.name =='DocumentNotFoundError'
    || error.name =='ValidatorError'
    || error.name =='ValidationError'
    || error.name =='MissingSchemaError'
    || error.name =='ObjectExpectedError'
    || error.name =='ObjectParameterError'
    || error.name =='OverwriteModelError'
    || error.name =='ParallelSaveError'
    || error.name =='StrictModeError'
    || error.name =='VersionError') {
        error.message = `Problem with the database. ${error.name}`;
    }
    const stringifiedError = JSON.stringify(error, Object.getOwnPropertyNames(error));
    return JSON.parse(stringifiedError)
}

module.exports = modifyError;