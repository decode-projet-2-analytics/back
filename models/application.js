const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const connection = require('../lib/db');

class Application extends Model { }

Application.init({
    appId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    allowedUrls: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
    },
    appSecret: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    sequelize: connection,
    timestamps: true,
    paranoid: false,
    underscored: false,
});

Application.addHook('beforeCreate', (application) => {
    if (application.appSecret) {
        application.appSecret = bcrypt.hashSync(application.appSecret, bcrypt.genSaltSync(10));
    }
});

Application.addHook('beforeUpdate', (application, options) => {
    if (options.fields.includes('appSecret') && application.appSecret) {
        application.appSecret = bcrypt.hashSync(application.appSecret, bcrypt.genSaltSync(10));
    }
});

Application.prototype.toJSON = function () {
    const values = { ...this.get() };
    values.hasSecret = Boolean(values.appSecret);
    delete values.appSecret;
    return values;
};

module.exports = Application;
