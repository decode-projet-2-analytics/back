const { Router } = require('express');
const Article = require('../models/article');

const router = new Router();

const articles = [];

// Collection routes
router.get('/', async (req, res, next) => {
    const filteredArticles = await Article.findAll({
        where: req.query
    });

    res.status(200).json(filteredArticles);
});

router.post('/', async (req, res, next) => {
    try {
        const newArticle = await Article.create(req.body);
        res.status(201).json(newArticle);
    } catch (e) {
        next(e);
    }
});

// Item routes
router.get('/:id', async (req, res, next) => {
    const article = await Article.findByPk(req.params.id);
    if (article) {
        res.json(article);
    } else {
        res.sendStatus(404);
    }
});

router.delete('/:id', async (req, res, next) => {
    const nbDeleted = await Article.destroy({
        where: {
            id: req.params.id
        }
    });
    if (nbDeleted) {
        res.sendStatus(204);
    } else {
        res.sendStatus(404);
    }
});

router.put('/:id', (req, res, next) => {
    try {
        const articleIndex = articles.findIndex(u => u.id === req.params.id);
        const articleUpdated = {
            ...req.body,
            id: req.params.id
        };

        if (articleIndex !== -1) {
            articles.splice(articleIndex, 1, articleUpdated);
        } else {
            articles.push(articleUpdated);
        }
        res.status(articleIndex === -1 ? 201 : 200).json(articleUpdated);
    } catch (e) {
        next(e);
    }
});

router.patch('/:id', async (req, res, next) => {
    try {
        const [nbUpdated, [article]] = await Article.update(req.body, {
            where: {
                id: req.params.id
            },
            returning: true
        });
        if (nbUpdated) {
            // For MySQL
            //const article = await Article.findByPk(req.params.id);
            res.json(article);
        } else {
            res.sendStatus(404);
        }
    } catch (e) {
        next(e);
    }
});

// SubCollection route /articles/:id/articles <==> /articles?ownerId=:id
router.get('/:id/articles', (req, res, next) => {
    const article = articles.find(u => u.id === req.params.id);
    if (article) {
        res.json(article.articles ?? []);
    } else {
        res.sendStatus(404);
    }
});

module.exports = router;