const express = require('express');
const middlewareError = require('./middlewares/error-handler');
const defaultRouter = require('./routes/default');
const usersRouter = require('./routes/users');
const sitesRouter = require('./routes/sites');
const tagsRouter = require('./routes/tags');
const tunnelsRouter = require('./routes/tunnels');
const app = express();

const PORT = process.env.PORT || 3000;

// app.use(middlewareParseBody);
app.use(express.json());
app.use(express.urlencoded());

app.use(defaultRouter);
app.use(require('./routes/security'));
app.use('/users', usersRouter);
app.use('/sites', sitesRouter);
app.use('/tags', tagsRouter);
app.use('/tunnels', tunnelsRouter);

app.use(middlewareError);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});