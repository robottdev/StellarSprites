using UnityEngine;
using System;
using System.Linq;
using System.Collections.Generic;

namespace Stellar_Sprites
{
    public static class SS_Utilities
    {
        public struct Point
        {
            public short x;
            public short y;
            public Point(short aX, short aY) { x = aX; y = aY; }
            public Point(int aX, int aY) : this((short)aX, (short)aY) { }
        }

		public static void ClearToColor(this Color[] colors, Color color)
		{
			colors = Enumerable.Repeat(color, colors.Length).ToArray();
		}

        public static SS_SpriteTexture ColorWheel()
        {
            int padding = 0;
            int inner_radius = 0;
            int outer_radius = inner_radius + 128;

            int bmp_width = (2 * outer_radius) + (2 * padding);
            int bmp_height = bmp_width;

            SS_SpriteTexture spriteTexture = new SS_SpriteTexture(bmp_width, bmp_height);
            var center = new Vector2(bmp_width / 2, bmp_height / 2);
            var c = Color.red;

            for (int y = 0; y < bmp_width; y++)
            {
                int dy = ((int)center.y - y);

                for (int x = 0; x < bmp_width; x++)
                {
                    int dx = ((int)center.x - x);

                    double dist = Mathf.Sqrt(dx * dx + dy * dy);

                    if (dist >= inner_radius && dist <= outer_radius)
                    {
                        double theta = Mathf.Atan2(dy, dx);
                        // theta can go from -pi to pi

                        double hue = (theta + Mathf.PI) / (2 * Mathf.PI);

                        double dr, dg, db;
                        const double sat = 1.0;
                        const double val = 1.0;
                        HSVToRGB(hue, sat, val, out dr, out dg, out db);

                        dr *= 0.75;
                        dg *= 0.75;
                        db *= 0.75;
                        c = new Color((float)dr, (float)dg, (float)db);

                        // Set
                        spriteTexture.ColorData[x + y * bmp_width] = c;
                    }
                }
            }

            return spriteTexture;
        }

        private static void HSVToRGB(double H, double S, double V, out double R, out double G, out double B)
        {
            if (H == 1.0)
            {
                H = 0.0;
            }

            double step = 1.0 / 6.0;
            double vh = H / step;

            int i = (int)System.Math.Floor(vh);

            double f = vh - i;
            double p = V * (1.0 - S);
            double q = V * (1.0 - (S * f));
            double t = V * (1.0 - (S * (1.0 - f)));

            switch (i)
            {
                case 0:
                    {
                        R = V;
                        G = t;
                        B = p;
                        break;
                    }
                case 1:
                    {
                        R = q;
                        G = V;
                        B = p;
                        break;
                    }
                case 2:
                    {
                        R = p;
                        G = V;
                        B = t;
                        break;
                    }
                case 3:
                    {
                        R = p;
                        G = q;
                        B = V;
                        break;
                    }
                case 4:
                    {
                        R = t;
                        G = p;
                        B = V;
                        break;
                    }
                case 5:
                    {
                        R = V;
                        G = p;
                        B = q;
                        break;
                    }
                default:
                    {
                        // not possible - if we get here it is an internal error
                        throw new System.ArgumentNullException();
                    }
            }
        }

        public static Color[] GenerateColorWheelColors(int seed, int count)
        {
            SS_SpriteTexture colorWheel = SS_Utilities.ColorWheel();

            Color[] colors = new Color[count];

            SS_Random random = new SS_Random(seed);

            float angle = random.Range(0f, 360f);
            for (int i = 0; i < count; i++)
            {
                float xPos = (colorWheel.Width / 2) + Mathf.Cos(angle) * 32;
                float yPos = (colorWheel.Height / 2) + Mathf.Sin(angle) * 32;

                colors[i] = colorWheel.ColorData[(int)xPos + (int)yPos * colorWheel.Width];
                angle += 360 / count;
            }

            return colors;
        }

        public static Color[] CreateGradient(Color[] colors, int minSteps, int maxSteps)
        {
            List<Color> tmp = new List<Color>();

            SS_Random random = new SS_Random(0);

            int steps = random.Range(minSteps, maxSteps);

            for (int j = 0; j < colors.Length - 1; j++)
            {
                Color start = colors[j];
                Color end = colors[j + 1];

                for (int i = 0; i < steps; i++)
                {
                    Color result = new
                        Color(
                            start.r + (i * (end.r - start.r) / steps),
                            start.g + (i * (end.g - start.g) / steps),
                            start.b + (i * (end.b - start.b) / steps)
                            );

                    tmp.Add(result);
                }
            }

            return tmp.ToArray();
        }

        public static void MergeColors(SS_SpriteTexture target, SS_SpriteTexture source, int xOffset, int yOffset)
        {
            int x1 = xOffset;// -(source.Width / 2);
            int y1 = yOffset;// -(source.Height / 2);

            int x2 = 0;
            int y2 = 0;
            for (int y = y1; y < y1 + source.Height; y++)
            {
                x2 = 0;
                for (int x = x1; x < x1 + source.Width; x++)
                {
                    Color c = source.ColorData[x2 + y2 * source.Width];

                    if (c != Color.clear)
                    {
                        target.SetPixel(x, y, c);
                    }
                    x2++;
                }
                y2++;
            }
        }

        public static void Outline(SS_SpriteTexture spriteTexture, Color outlineColor)
        {
            for (int y = 1; y < spriteTexture.Height - 1; y++)
            {
                for (int x = 1; x < spriteTexture.Width - 1; x++)
                {
                    Color c = spriteTexture.GetPixel(x, y);

                    if (c != Color.clear)
                    {
                        Color tL = spriteTexture.GetPixel(x - 1, y - 1);
                        Color tM = spriteTexture.GetPixel(x, y - 1);
                        Color tR = spriteTexture.GetPixel(x + 1, y - 1);

                        Color mL = spriteTexture.GetPixel(x - 1, y);
                        Color mR = spriteTexture.GetPixel(x + 1, y);

                        Color bL = spriteTexture.GetPixel(x - 1, y + 1);
                        Color bM = spriteTexture.GetPixel(x, y + 1);
                        Color bR = spriteTexture.GetPixel(x + 1, y + 1);

                        if (tL == Color.clear || tM == Color.clear || tR == Color.clear ||
                            mL == Color.clear || mR == Color.clear ||
                            bL == Color.clear || bM == Color.clear || bR == Color.clear)
                        {
                            spriteTexture.SetPixel(x, y, outlineColor);
                        }
                    }

                }
            }

            for (int y = 0; y < spriteTexture.Height; y++)
            {
                for (int x = 0; x < spriteTexture.Width; x++)
                {
                    Color c = spriteTexture.GetPixel(x, y);

                    if (c != Color.clear)
                    {
                        if (x == 0 || x == spriteTexture.Width - 1 || y == 0 || y == spriteTexture.Height - 1)
                        {
                            spriteTexture.SetPixel(x, y, outlineColor);
                        }
                    }
                }
            }
        }
    }
}