import path from 'path';
import { fileURLToPath } from 'url';

export default function originPath(final_dir) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const parent_dir = path.dirname(__dirname);

  return path.join(parent_dir, final_dir);
};
