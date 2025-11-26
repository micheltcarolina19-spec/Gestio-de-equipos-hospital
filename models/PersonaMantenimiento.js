// models/PersonaMantenimiento.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const PersonaMantenimiento = sequelize.define('PersonaMantenimiento', {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  identificacion: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  nombres: { type: DataTypes.STRING(120), allowNull: false },
  apellidos: { type: DataTypes.STRING(120), allowNull: false },
  
  cargoId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true }, 
  email: { type: DataTypes.STRING(160), allowNull: true, validate: { isEmail: true } },
  telefono: { type: DataTypes.STRING(40), allowNull: true },
}, {
  tableName: 'personas_mantenimiento',
  timestamps: true,
});

module.exports = PersonaMantenimiento;
