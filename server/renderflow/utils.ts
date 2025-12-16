import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export const generateId = (prefix: string = 'job'): string => {
    return `${prefix}_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
};

export const PATHS = {
    DATA: path.join(__dirname, 'data'),
    OUTPUT: path.join(__dirname, 'outputs'),
    TEMP: path.join(__dirname, 'temp')
};

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
