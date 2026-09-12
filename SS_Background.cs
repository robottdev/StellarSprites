using UnityEngine;
using System.Collections;

using LibNoise;
using LibNoise.Generator;
using LibNoise.Operator;

namespace Stellar_Sprites
{
    public class SS_Background {

        private SS_SpriteTexture finalTexture;
        private SS_Random random;

        public SS_Background(int seed, int width, int height, double frequency, double lacunarity, double persistence, int octaves, int starCount, Color tint, float brightness)
        {
            random = new SS_Random(seed);

            Perlin perlin = new Perlin(frequency, lacunarity, persistence, octaves, seed, QualityMode.Low);
			//RidgedMultifractal perlin = new RidgedMultifractal(0.1, 3, 8, seed, QualityMode.High);
			ModuleBase myModule = perlin;

			Noise2D noise = new Noise2D (width, height, myModule);
			noise.GeneratePlanar(0, width, 0, height, false);
            
            finalTexture = new SS_SpriteTexture(width, height);
			finalTexture.ColorData.ClearToColor (Color.black);

			float[,] noiseData = noise.GetNormalizedData (false, 0, 0);

            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < width; x++)
				{
					float n = noiseData[y, x];
                    Color pixelColor = tint * n * brightness;
                    pixelColor.a = 1.0f;
					finalTexture.SetPixel(x, y, pixelColor);
                }
            }

			for (int i = 0; i < starCount; i++)
            {
                int x = random.Range(0, width - 1);
                int y = random.Range(0, height - 1);

                finalTexture.SetPixel(x, y, Color.white * random.Range(0.5f, 1.0f));
            }
        }

        #region Public Methods
        public Color[] GetColors()
        {
            return finalTexture.ColorData;
		}
		
		public SS_SpriteTexture GetSpriteTexture
		{
			get
			{
				return finalTexture;
			}
		}
        #endregion
    }
}
