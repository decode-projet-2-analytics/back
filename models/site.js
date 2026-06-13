const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const connection = require('../lib/db');

class Site extends Model { }

// TODO: vérifier ça
Site.init({
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    baseUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isUrl: 'Base URL invalid',
        },
    },
    appId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        defaultValue: DataTypes.UUIDV4,
    },
    appSecret: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    corsOrigins: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
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

Site.addHook('beforeCreate', (site) => {
    if (site.appSecret) {
        site.appSecret = bcrypt.hashSync(site.appSecret, bcrypt.genSaltSync(10));
    }
});

Site.addHook('beforeUpdate', (site, options) => {
    if (options.fields.includes('appSecret') && site.appSecret) {
        site.appSecret = bcrypt.hashSync(site.appSecret, bcrypt.genSaltSync(10));
    }
});

Site.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.appSecret;
    return values;
};

module.exports = Site;
