const { Model, DataTypes, Op } = require('sequelize');
const connection = require('../lib/db');
const bcrypt = require('bcryptjs');

class User extends Model { }

User.init({
    lastname: DataTypes.STRING,
    firstname: DataTypes.STRING,
    birthDate: DataTypes.DATE,
    role: {
        type: DataTypes.ENUM('Admin', 'Webmaster'),
        allowNull: false,
        defaultValue: 'Webmaster',
    },
    companyName: DataTypes.STRING,
    kbisDocument: DataTypes.STRING,
    contactPhone: DataTypes.STRING,
    websiteUrl: {
        type: DataTypes.STRING,
        validate: {
            isUrl: 'Website URL invalid',
        },
    },
    status: {
        type: DataTypes.ENUM('pending', 'validated', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: "Email invalid"
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            //    is: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,32}$/
        }
    }
}, {
    sequelize: connection,
    timestamps: true,
    paranoid: false,
    underscored: false,
});

User.addHook('beforeCreate', (user, options) => {
    user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(10));
});

User.addHook('beforeUpdate', (user, options) => {
    if (options.fields.includes('password'))
        user.password = bcrypt.hashSync(user.password, bcrypt.genSaltSync(10));
})

User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
};

module.exports = User;