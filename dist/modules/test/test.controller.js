"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listViews = exports.testDatabaseConnection = void 0;
const test_repository_1 = require("./test.repository");
const testDatabaseConnection = async (req, res) => {
    try {
        const tables = await (0, test_repository_1.getAvailableTables)();
        res.json({
            success: true,
            message: "¡Conexión exitosa a Oracle 11g!",
            count: tables?.length || 0,
            data: tables
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.testDatabaseConnection = testDatabaseConnection;
const listViews = async (req, res) => {
    try {
        const views = await (0, test_repository_1.listAvailableViews)();
        res.json({
            success: true,
            message: "Vistas encontradas en DATA_USR",
            count: views?.length || 0,
            views: views
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
exports.listViews = listViews;
