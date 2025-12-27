import { Request, Response } from 'express';
import { getAvailableTables, listAvailableViews } from './test.repository';



export const testDatabaseConnection = async (req: Request, res: Response) => {
    try {
        const tables = await getAvailableTables();

        res.json({
            success: true,
            message: "¡Conexión exitosa a Oracle 11g!",
            count: tables?.length || 0,
            data: tables
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};



export const listViews = async (req: Request, res: Response) => {
    try {
        const views = await listAvailableViews();

        res.json({
            success: true,
            message: "Vistas encontradas en DATA_USR",
            count: views?.length || 0,
            views: views
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};