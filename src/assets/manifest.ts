/** Texture aliases; `Sprite.texture` stores an index into this list. */
export const TEXTURES = ['hero'] as const;

export const TextureId = { Hero: TEXTURES.indexOf('hero') } as const;

export const manifest = {
  bundles: [
    {
      name: 'game',
      assets: [{ alias: 'hero', src: 'assets/atlases/hero.png' }],
    },
  ],
};
