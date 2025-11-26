const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
        host: config.host,
        dialect: config.dialect,
        port: config.port,
        pool: {
            max: 20,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        },
        timezone: '+00:00'
    }
);

module.exports = sequelize;