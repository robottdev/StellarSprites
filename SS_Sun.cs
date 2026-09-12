using UnityEngine;
using System;
using System.Collections.Generic;

using LibNoise;
using LibNoise.Generator;
using LibNoise.Operator;

namespace Stellar_Sprites
{
    public class SS_Sun
    {
        #region Public Fields
        public int Seed { get; set; }
        public int Size { get; set; }
        #endregion Fields

        #region Private Fields
        //private SS_Random random;

        private SS_SpriteTexture finalTexture;
        private Color[] highlightColors;
        #endregion Private Fields

        #region Constructor
        public SS_Sun(int seed, int size, Color mainColor)
        {
            Seed = seed;
            Size = size;

            Perlin noise = new Perlin(0.05, 2, 0.5, 8, Seed, QualityMode.Low);
            Perlin noiseGlow = new Perlin(0.005, 2, 0.5, 6, Seed, QualityMode.Low);

            float radius = Size * 0.75f;

            Color[] tmp = new Color[3];
            tmp[0] = Color.white;
            tmp[1] = mainColor;
            tmp[2] = new Color(255f / 255f, 102f / 255f, 0f);

            Color[] gradient = SS_Utilities.CreateGradient(tmp, 8, 32);
            Vector2 center = new Vector2(Size / 2, Size / 2);

            float atmosphereThickness = Size * 0.125f;
            Color hotnessColor = Color.white;
            
            finalTexture = new SS_SpriteTexture(Size, Size);
            for (int y = 0; y < finalTexture.Height; y++)
            {
                for (int x = 0; x < finalTexture.Width; x++)
                {
                    float dist = Vector2.Distance(new Vector2(x, y), center);

                    if (dist <= (radius / 2))
                    {
                        float n = (float)noise.GetValue(x, y, 0);
                        n = (n + 1.0f) * 0.5f;
                        n = Mathf.Clamp(n, 0f, 1f);
                        n *= (gradient.Length - 1);

                        Color baseColor = gradient[(int)n];

                        // Edge Hotness
                        hotnessColor.a = dist / (radius / 2);
                        hotnessColor.a += 0.0025f;

                        Color c = baseColor;
                        c.r = Mathf.Clamp(c.r + (hotnessColor.r * hotnessColor.a), 0, 1);
                        c.g = Mathf.Clamp(c.g + (hotnessColor.g * hotnessColor.a), 0, 1);
                        c.b = Mathf.Clamp(c.b + (hotnessColor.b * hotnessColor.a), 0, 1);

                        finalTexture.SetPixel(x, y, c);
                    }

                    // Create glow
                    if (true)
                    {
                        Color currentPixel = finalTexture.GetPixel(x, y);

                        Color atmosphereColor = Color.white;
                        if (currentPixel == Color.clear)
                        {
                            atmosphereColor.a = 1;
                            float distToEdge = Vector2.Distance(new Vector2(x, y), center);
                            if (distToEdge < (radius / 2) + atmosphereThickness &&
                                distToEdge > (radius / 2))
                            {
                                float dist2 = dist - (radius / 2);
                                dist2 = (atmosphereThickness - dist2) / atmosphereThickness;

                                float glowNoise = (float)noiseGlow.GetValue(x, y, 0);
                                glowNoise = (glowNoise + 1.0f) * 0.5f;
                                glowNoise = Mathf.Clamp(glowNoise, 0f, 1f);
                                atmosphereColor.a = Mathf.Pow(dist2, 2) * glowNoise;

                                finalTexture.SetPixel(x, y, atmosphereColor);
                            }
                        }
                    }
                }
            }
        }
        #endregion

        #region Private Methods
        // None
        #endregion

        #region Public Methods
        public Color[] GetColors()
        {
            return finalTexture.ColorData;
        }

        public SS_SpriteTexture GetSpriteTexture
        {
            get { return finalTexture; } 
        }
        #endregion
    }
}
