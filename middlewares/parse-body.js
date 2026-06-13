module.exports = function middlewareParseBody(req, res, next) {
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
        next();
        return;
    }
    let chunks = [];
    req.on('data', function (chunk) {
        chunks.push(chunk);
    })

    req.on('end', function () {
        const body = Buffer.concat(chunks).toString();
        req.body = JSON.parse(body);
        next();
    });
}