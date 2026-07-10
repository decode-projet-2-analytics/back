const { Model, DataTypes } = require('sequelize');
const connection = require('../lib/db');

class Tag extends Model { }

Tag.init({
    slug: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: true,
        },
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '',
    },
    applicationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    sequelize: connection,
    timestamps: true,
    paranoid: true,
    underscored: false,
    indexes: [
        {
            unique: true,
            fields: ['applicationId', 'slug'],
            where: { deletedAt: null },
            name: 'tags_application_id_slug_unique',
        },
    ],
});

module.exports = Tag;
