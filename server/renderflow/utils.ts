import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Fix for ESM: Use process.cwd()
const BASE_DIR = path.join(process.cwd(), 'server', 'renderflow');

export const PATHS = {
    DATA: path.join(BASE_DIR, 'data'),
    OUTPUT: path.join(BASE_DIR, 'outputs'),
    TEMP: path.join(BASE_DIR, 'temp')
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateId = (prefix: string = 'job'): string => {
    return `${prefix}_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
};
