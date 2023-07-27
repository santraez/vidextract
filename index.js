import vidextract from './src/vidextract.js';

(async () => {
  await vidextract({
    url: 'https://www.youtube.com/watc&t=83s',
    title: 'title',
    number: 1
  });
})();
