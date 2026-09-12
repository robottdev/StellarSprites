using UnityEngine;
using System;
using System.Collections.Generic;

using LibNoise;
using LibNoise.Generator;
using LibNoise.Operator;

namespace Stellar_Sprites
{
    public enum SS_PlanetType
    {
        Gas_Giant = 0,      // Like Jupiter/Neptune
        Terrestrial = 1     // Like Earth/Mars
    }

    public class SS_Planet
    {
        #region Public Fields
        public int Seed { get; set; }
        public int Size { get; set; }
        #endregion Fields

        #region Private Fields
        private SS_Random random;

        private SS_SpriteTexture finalTexture;
        private Color[] gradientColors;
        #endregion Private Fields

        #region Constructor
        
        public SS_Planet(int seed, int size, Color[] colors, SS_PlanetType planetType, bool oceans, bool clouds, float cloudDensity, float cloudTransparency, bool atmosphere, bool city, float cityDensity, float lightAngle)
        {
            Seed = seed;
            Size = size;

            random = new SS_Random(seed);
            Perlin noise = new Perlin(0.01, 2, 0.5, 8, seed, QualityMode.High);
            Perlin cloudNoise = new Perlin(0.02, 2, 0.5, 12, seed + 1, QualityMode.Low);

            float radius = Size * 0.9f;
            float settleLevel = random.Range(0.25f, 0.75f);
            int atmosphereThickness = random.Range((int)(Size * 0.01f), (int)(Size * 0.05f));
            atmosphereThickness = Mathf.Clamp(atmosphereThickness, 8, 16);

            gradientColors = SS_Utilities.CreateGradient(colors, 16, 32);

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
                    float distNorthPole = Vector2.Distance(new Vector2(x, finalTexture.Height - 1), center);

                    if (dist <= (radius / 2))
                    {
                        float planetNoise = (float)noise.GetValue(x, y, 0);
                        planetNoise = (planetNoise + 1.0f) * 0.5f;
                        planetNoise = Mathf.Clamp(planetNoise, 0f, 1f);

                        // Gas Giant
                        if (planetType == SS_PlanetType.Gas_Giant)
                        {
                            float n = (float)noise.GetValue(dist / 10 + (planetNoise * 10f), y - (distNorthPole / 5) + (planetNoise * 10f), 0);
                            n = (n + 1.0f) * 0.5f;
                            n = Mathf.Clamp(n, 0f, 1f);
                            n *= (gradientColors.Length - 1);
                            finalTexture.SetPixel(x, y, gradientColors[(int)n]);
                        }
                        // Terrestrial
                        else if (planetType == SS_PlanetType.Terrestrial)
                        {
                            Color pixelColor = new Color();

                            if (oceans)
                            {
                                if (planetNoise > settleLevel)
                                {
                                    float n = planetNoise * (gradientColors.Length - 1);

                                    // Generate color and noise so land doesn't look to smooth
                                    pixelColor = gradientColors[(int)n];
                                    pixelColor *= planetNoise;
                                    pixelColor.a = 1.0f;
                                }
                                else
                                {
                                    float n = planetNoise * ((gradientColors.Length - 1) / colors.Length);

                                    pixelColor = gradientColors[(int)n];
                                }
                            }
                            else
                            {
                                float n = planetNoise * (gradientColors.Length - 1);

                                // Generate color and noise so land doesn't look to smooth
                                pixelColor = gradientColors[(int)n];
                                //pixelColor *= planetNoise;
                            }

							pixelColor.a = 1.0f;
							finalTexture.SetPixel(x, y, pixelColor);

                            if (clouds)
                            {
                                float cloud = (float)cloudNoise.GetValue(x, y, 0);
                                cloud = (cloud + 1.0f) * 0.5f;
                                cloud = Mathf.Clamp(cloud, 0f, 1f);

                                if (cloud >= cloudDensity)
                                {
                                    Color cloudColor = Color.white;
                                    Color planetColor = finalTexture.GetPixel(x, y);

                                    float alpha = cloudTransparency * cloud;
                                    Color newColor = new Color();
                                    newColor.r = alpha * cloudColor.r + (1 - alpha) * planetColor.r;
                                    newColor.g = alpha * cloudColor.g + (1 - alpha) * planetColor.g;
                                    newColor.b = alpha * cloudColor.b + (1 - alpha) * planetColor.b;
                                    newColor.a = 1f;
                                    finalTexture.SetPixel(x, y, newColor);
                                }
                            }
                        }
                    }                  

                    // Create atmosphere
                    if (atmosphere)
                    {
                        Color currentPixel = finalTexture.GetPixel(x, y);
                        Color atmosphereColor = gradientColors[0];;
                        if (currentPixel == Color.clear)
                        {
                            atmosphereColor.a = 1;
                            float distToEdge = Vector2.Distance(new Vector2(x, y), center);
                            if (distToEdge < (radius / 2) + atmosphereThickness &&
                                distToEdge > (radius / 2))
                            {
                                float dist2 = dist - (radius / 2);
                                dist2 = (atmosphereThickness - dist2) / atmosphereThickness;
                                atmosphereColor.a = dist2;

                                finalTexture.SetPixel(x, y, atmosphereColor);
                            }
                        }
                    }

                    // Shade planet
                    if (dist <= (radius / 2) + atmosphereThickness)
                    {
                        float lightDistance = Vector2.Distance(new Vector2(x, y), lightPosition);
                        lightDistance = 1 - (lightDistance / (Size / 2));
                        if (lightDistance < 0.025f)
                            lightDistance = 0.025f;

                        Color lightingColor = finalTexture.GetPixel(x, y);
                        lightingColor.r *= lightDistance;
                        lightingColor.g *= lightDistance;
                        lightingColor.b *= lightDistance;
                        finalTexture.SetPixel(x, y, lightingColor);
                    }

                    // City lights
					if (city)
                    {
                        if (dist <= (radius / 2))
                        {
                            float lightDistance = Vector2.Distance(new Vector2(x, y), lightPosition);
                            if (lightDistance > (radius / 2) + atmosphereThickness)
                            {
                                float pixelNoise = (float)noise.GetValue(x, y, 0);
                                pixelNoise = (pixelNoise + 1.0f) * 0.5f;
                                pixelNoise = Mathf.Clamp(pixelNoise, 0f, 1f);

                                if (pixelNoise > settleLevel && pixelNoise < settleLevel + 0.05f)
                                {
                                    if (random.Range(0f, 1f) > cityDensity)
                                    {
                                        Color newColor = (Color.white * 0.65f + Color.yellow * 0.85f) * random.Range(0.5f, 0.8f);
                                        newColor.a = 1;
                                        finalTexture.SetPixel(x, y, newColor);
                                    }
                                }
                            }
                        }
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
