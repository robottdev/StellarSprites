using UnityEngine;
using System;
using System.Collections.Generic;

using LibNoise;
using LibNoise.Generator;
using LibNoise.Operator;

namespace Stellar_Sprites
{
    public class SS_Moon
    {
        #region Public Fields
        public int Seed { get; set; }
        public int Size { get; set; }
        #endregion Fields

        #region Private Fields

        private SS_SpriteTexture finalTexture;
        private Color[] gradientColors;
        #endregion Private Fields

        #region Constructor
        public SS_Moon(int seed, int size, float roughness, Color[] colors, float lightAngle)
        {
            Seed = seed;
            Size = size;

            gradientColors = SS_Utilities.CreateGradient(colors, 16, 32);

            Perlin perlin = new Perlin(0.01, 2, 0.5, 8, seed, QualityMode.High);

            Vector2 center = new Vector2(Size / 2, Size / 2);
            Vector2 lightPosition = new Vector2(
                center.x + (Mathf.Cos(lightAngle * Mathf.Deg2Rad) * (Size / 4)),
                center.y + (Mathf.Sin(lightAngle * Mathf.Deg2Rad) * (Size / 4)));

            finalTexture = new SS_SpriteTexture(Size, Size);
            for (int y = 0; y < finalTexture.Height; y++)
            {
                for (int x = 0; x < finalTexture.Width; x++)
                {
                    float dist = Vector2.Distance(new Vector2(x, y), center);
					float edgeNoise = (float)perlin.GetValue(x, y, 0);
					edgeNoise = (edgeNoise + 1.0f) * 0.5f;
					edgeNoise = Mathf.Clamp(edgeNoise, 0f, 1f);
					edgeNoise *= (8 * roughness);

					if (dist < (Size / 2) - edgeNoise)
                    {
                        float pixelNoise = (float)perlin.GetValue(x, y, 0);
                        pixelNoise = (pixelNoise + 1.0f) * 0.5f;
                        pixelNoise = Mathf.Clamp(pixelNoise, 0f, 1f);

                        float n = pixelNoise * (gradientColors.Length - 1);

                        // Generate color and noise so land doesn't look to smooth
                        Color pixelColor = gradientColors[(int)n];
                        pixelColor.a = 1.0f;

                        finalTexture.SetPixel(x, y, pixelColor);

                        // Add craters


                        // Shadows
                        float lightDistance = Vector2.Distance(new Vector2(x, y), lightPosition);
                        lightDistance = 1 - (lightDistance / (Size / 2));
                        if (lightDistance < 0.025f)
                            lightDistance = 0.025f;

                        pixelColor.r *= lightDistance;
                        pixelColor.g *= lightDistance;
                        pixelColor.b *= lightDistance;
                        finalTexture.SetPixel(x, y, pixelColor);
                    }
                }
            }
        }
        #endregion

        #region Private Methods

        #endregion

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
