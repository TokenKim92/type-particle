import TypeParticle from '../src/typeParticle.js';

const type = new TypeParticle('type');
type.start();

setTimeout(() => {
  type.restart();
}, 3000);
