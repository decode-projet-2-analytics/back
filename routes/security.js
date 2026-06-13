const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

const router = new Router();

router.post('/login', async (req, res, next) => {
    const { email, password } = req.body;

    const user = await User.findOne({
        where: {
            email
        }
    });

    if (!user) return res.sendStatus(401);

    if (!bcrypt.compareSync(password, user.password)) return res.sendStatus(401);

    const token = jwt.sign({
        sub: user.id,
        lastname: user.lastname,
        firstname: user.firstname
    }, process.env.JWT_SECRET);

    res.json({
        token
    });
});

module.exports = router;