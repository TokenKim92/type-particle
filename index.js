import TypeParticle from './src/TypeParticle.js';

const type = new TypeParticle('type');
type.start();

setTimeout(() => {
  type.restart();
}, 3000);
