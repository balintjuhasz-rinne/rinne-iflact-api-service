import fs from 'fs';

export const readToken = (path) => {
  return fs.readFileSync(path).toString();
};
