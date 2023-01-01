import TypeParticle from './src/TypeParticle.js';

const type = new TypeParticle('type', 5, 'horizontal');
type.start();

setTimeout(() => {
  type.restart();
}, 3000);
