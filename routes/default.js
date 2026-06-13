const { Router } = require('express');
const middlewareCheckBody = require('../middlewares/check-body');

const router = new Router();

router.get('/', (req, res, next) => {
    res.json({
        message: "Hello world",
        query: req.query,
        body: req.body
    })
});

router.delete('/', (req, res, next) => {
    res.json({
        message: "Deleted",
        query: req.query,
        body: req.body
    })
});

router.post('/', middlewareCheckBody(['lastname', 'firstname', 'email']), (req, res, next) => {
    console.log(
        req.method, req.path, req.url, req.originalUrl, req.baseUrl, req.query, req.params, req.body, req.headers, req.cookies, req.signedCookies
    )
    res.json({ message: "Posted", body: req.body });
});
router.put('/', (req, res, next) => {
    res.json({ message: "Put", body: req.body });
});
router.patch('/', middlewareCheckBody((req) => req?.user?.role === "Admin" ? [] : ['lastname', 'firstname', 'email']), (req, res, next) => {
    res.json({ message: "Patched", body: req.body });
});

module.exports = router;