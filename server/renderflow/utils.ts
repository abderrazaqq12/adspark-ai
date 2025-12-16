import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const generateId = (prefix: string = 'job'): string => {
    return `${prefix}_${uuidv4()}`;
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const PATHS = {
    ROOT: __dirname,
    DATA: path.join(__dirname, 'data'),
    TEMP: path.join(__dirname, '..', '..', 'uploads', 'temp_renderflow'),
    OUTPUT: path.join(__dirname, '..', '..', 'outputs')
};

// Ensure dirs exist
[PATHS.DATA, PATHS.TEMP, PATHS.OUTPUT].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});
